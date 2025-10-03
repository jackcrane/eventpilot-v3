import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { z } from "zod";
import { serializeError } from "#serializeError";
import { LogType } from "@prisma/client";
import { sendEmail } from "#postmark";
import { findSubmission } from "./index.js";
import { render } from "@react-email/render";
import VolunteerShiftCheckInEmail from "#emails/volunteer-shift-check-in.jsx";
import { createRequire } from "module";
import { createLogBuffer } from "../../../../../util/logging.js";

const sanitizeDisplayName = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[<>]/g, "");

const buildEventFromAddress = (event) => {
  const label = sanitizeDisplayName(event?.name || "EventPilot");
  return `${label} <no-reply@event.geteventpilot.com>`;
};

const require = createRequire(import.meta.url);
const timezones = require("#util/tzs.json");

const resolveTimeZone = (value) => {
  if (!value) return "UTC";
  const trimmed = `${value}`.trim();
  if (!trimmed) return "UTC";

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: trimmed });
    return trimmed;
  } catch (error) {
    void error;
    const lower = trimmed.toLowerCase();
    const matchByValue = timezones.find(
      (tz) => tz?.value?.toLowerCase() === lower
    );
    if (matchByValue?.utc?.length) {
      return matchByValue.utc[0];
    }

    const matchByAbbr = timezones.find(
      (tz) => tz?.abbr?.toLowerCase() === lower
    );
    if (matchByAbbr?.utc?.length) {
      return matchByAbbr.utc[0];
    }

    const matchByText = timezones.find((tz) =>
      tz?.text?.toLowerCase().includes(lower)
    );
    if (matchByText?.utc?.length) {
      return matchByText.utc[0];
    }

    return "UTC";
  }
};

const bodySchema = z.object({
  checkIns: z
    .array(
      z.object({
        shiftId: z.string(),
        checkedIn: z.boolean(),
      })
    )
    .nonempty(),
});

export const patch = [
  verifyAuth(["manager", "dod:volunteer"]),
  async (req, res) => {
    const parseResult = bodySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: serializeError(parseResult) });
    }

    const { checkIns } = parseResult.data;
    const { submissionId, eventId } = req.params;

    try {
      const submission = await prisma.volunteerRegistration.findUnique({
        where: { id: submissionId },
        select: {
          eventId: true,
          instanceId: true,
          event: {
            select: {
              name: true,
            },
          },
          shifts: {
            select: {
              id: true,
              shiftId: true,
            },
          },
        },
      });

      if (!submission || submission.eventId !== eventId) {
        return res.status(404).json({ message: "Submission not found" });
      }

      const requestedShiftIds = [
        ...new Set(checkIns.map((item) => item.shiftId)),
      ];

      const signups = await prisma.volunteerShiftSignup.findMany({
        where: {
          formResponseId: submissionId,
          shiftId: { in: requestedShiftIds },
        },
        select: {
          id: true,
          shiftId: true,
          checkedInAt: true,
          shift: {
            select: {
              id: true,
              eventId: true,
              instanceId: true,
              jobId: true,
              locationId: true,
              startTime: true,
              endTime: true,
              startTimeTz: true,
              endTimeTz: true,
              job: {
                select: {
                  name: true,
                },
              },
              location: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (signups.length !== requestedShiftIds.length) {
        return res.status(400).json({
          message: "One or more shifts are not registered for this volunteer",
        });
      }

      const signupsByShiftId = new Map(
        signups.map((signup) => [signup.shiftId, signup])
      );

      const now = new Date();
      const updates = [];
      const logEntries = [];
      const logBuffer = createLogBuffer();
      const newlyCheckedIn = [];
      let updatedCount = 0;
      let skippedCount = 0;

      const actorAccountId = req.dayOfDashboardAccount?.id ?? null;
      const actorUserId = req.user?.id ?? null;

      for (const change of checkIns) {
        const signup = signupsByShiftId.get(change.shiftId);
        if (!signup) {
          skippedCount += 1;
          continue;
        }

        if (signup.shift.eventId !== eventId) {
          return res
            .status(400)
            .json({ message: "Shift does not belong to this event" });
        }

        const wasCheckedIn = Boolean(signup.checkedInAt);
        if (wasCheckedIn === change.checkedIn) {
          skippedCount += 1;
          continue;
        }

        const timestamp = change.checkedIn ? now : null;
        const checkedInById = change.checkedIn ? actorAccountId : null;

        updates.push(
          prisma.volunteerShiftSignup.update({
            where: { id: signup.id },
            data: {
              checkedInAt: timestamp,
              checkedInById,
            },
          })
        );
        updatedCount += 1;

        const logType = change.checkedIn
          ? LogType.VOLUNTEER_SHIFT_CHECKED_IN
          : LogType.VOLUNTEER_SHIFT_CHECKED_OUT;

        if (change.checkedIn) {
          newlyCheckedIn.push({
            startTime: signup.shift.startTime,
            endTime: signup.shift.endTime,
            startTimeTz: signup.shift.startTimeTz,
            endTimeTz: signup.shift.endTimeTz,
            jobName: signup.shift.job?.name ?? null,
            locationName: signup.shift.location?.name ?? null,
          });
        }

        const logRecord = {
          type: logType,
          ip: req.ip,
          eventId,
          instanceId: signup.shift.instanceId,
          formResponseId: submissionId,
          shiftId: signup.shift.id,
          jobId: signup.shift.jobId,
          locationId: signup.shift.locationId,
          data: {
            shiftId: signup.shift.id,
            checkedInAt: timestamp ? timestamp.toISOString() : null,
          },
        };

        if (actorUserId) {
          logRecord.userId = actorUserId;
        }

        if (actorAccountId) {
          logRecord.dayOfDashboardAccountId = actorAccountId;
        }

        logEntries.push(logRecord);
      }

      if (!updates.length) {
        return res.json({ updated: 0, skipped: skippedCount });
      }

      const transactionOps = [...updates];

      await prisma.$transaction(transactionOps);

      if (logEntries.length) {
        logBuffer.pushMany(logEntries);
        await logBuffer.flush();
      }

      if (newlyCheckedIn.length) {
        try {
          const submissionDetail = await findSubmission(eventId, submissionId);
          const recipientEmail = submissionDetail?.response?.flat?.email;
          if (recipientEmail) {
            const volunteerName = submissionDetail?.response?.flat?.name;
            const eventName = submission.event?.name ?? "";

            const formatRange = (start, end, tz, label) => {
              const resolvedTz = tz || "UTC";
              let formatter;
              try {
                formatter = new Intl.DateTimeFormat("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: resolvedTz,
                });
              } catch (formatError) {
                void formatError;
                formatter = new Intl.DateTimeFormat("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "UTC",
                });
              }

              const startLabel = formatter.format(new Date(start));
              const endLabel = formatter.format(new Date(end));
              const tzLabel = label || tz;
              return `${startLabel} - ${endLabel}${tzLabel ? ` (${tzLabel})` : ""}`;
            };

            const emailShifts = newlyCheckedIn.map((shift) => {
              const sourceLabel = shift.startTimeTz || shift.endTimeTz || "UTC";
              const timezone = resolveTimeZone(sourceLabel);
              return {
                range: formatRange(
                  shift.startTime,
                  shift.endTime,
                  timezone,
                  sourceLabel
                ),
                jobName: shift.jobName,
                locationName: shift.locationName,
              };
            });

            const shiftLines = emailShifts.map((shift) => {
              const role = shift.jobName ? ` as ${shift.jobName}` : "";
              const location = shift.locationName
                ? ` at ${shift.locationName}`
                : "";
              return `- ${shift.range}${role}${location}`;
            });

            const greeting = volunteerName?.length
              ? `Hi ${volunteerName},`
              : "Hi there,";
            const subject = eventName?.length
              ? `Thank you for volunteering at ${eventName}`
              : "Thank you for volunteering today";
            const organizer = eventName?.length ? eventName : "our team";
            const shiftText = shiftLines.join("\n");

            const textBody = `${greeting}

Thank you for checking in for your volunteer shift${
              newlyCheckedIn.length > 1 ? "s" : ""
            } today. We appreciate your time and hope you have an enjoyable experience.

Your upcoming shift details:
${shiftText}

If you need anything during your shift, please let the ${organizer} staff know.

With gratitude,
${organizer}`;

            const htmlBody = await render(
              VolunteerShiftCheckInEmail.VolunteerShiftCheckInEmail({
                event: submission.event,
                volunteerName,
                shifts: emailShifts,
              })
            );

            await sendEmail({
              From: buildEventFromAddress(submission.event),
              To: recipientEmail,
              Subject: subject,
              TextBody: textBody,
              HtmlBody: htmlBody,
            });
          }
        } catch (emailError) {
          console.error("Failed to send volunteer check-in email", emailError);
        }
      }

      return res.json({ updated: updatedCount, skipped: skippedCount });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: error.message });
    }
  },
];
