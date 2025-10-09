import { prisma } from "#prisma";
import { z } from "zod";
import { serializeError } from "#serializeError";
import { verifyAuth } from "#verifyAuth";
import { formatFormResponse } from "./[submissionId]";
import { LogType } from "@prisma/client";
import { sendEmail } from "#postmark";
import { findSubmission } from "./[submissionId]";
import { render } from "@react-email/render";
import VolunteerFormResponseThankYouEmail from "#emails/volunteer-form-response-thank-you.jsx";
import { reportApiError } from "#util/reportApiError.js";

const bodySchema = z.object({
  values: z.record(z.string(), z.string()),
  pii: z.record(z.string(), z.any()).optional(),
  shifts: z.array(z.object({ id: z.string() })).optional(),
  // Optional rrweb session to link conversion against
  sessionId: z.string().optional().nullable(),
});

export const post = async (req, res) => {
  const parseResult = bodySchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ message: serializeError(parseResult) });
  }
  const { values, pii, shifts, sessionId } = parseResult.data;
  const { eventId } = req.params;
  const instanceId = req.instanceId;

  try {
    const formResponse = await prisma.volunteerRegistration.create({
      data: {
        event: { connect: { slug: eventId } },
        instance: { connect: { id: instanceId } },
        fieldResponses: {
          create: Object.entries(values).map(([fieldId, value]) => ({
            field: { connect: { id: fieldId } },
            value,
          })),
        },
        pii: {
          create: {
            ...pii,
            userAgent: req.headers["user-agent"],
            ipAddress:
              req.headers["x-forwarded-for"] || req.connection.remoteAddress,
          },
        },
      },
    });

    if (Array.isArray(shifts) && shifts.length > 0) {
      await prisma.volunteerShiftSignup.createMany({
        data: shifts.map((s) => ({
          formResponseId: formResponse.id,
          shiftId: s.id,
        })),
        skipDuplicates: true,
      });
    }

    const fullSubmission = await findSubmission(
      formResponse.eventId,
      formResponse.id
    );

    const submitterEmail = fullSubmission?.response?.flat?.email || null;
    const submitterName = fullSubmission?.response?.flat?.name || null;

    let crmPersonId;
    if (submitterEmail) {
      let existingCrmPersonByEmailAndName = await prisma.crmPerson.findFirst({
        where: {
          name: submitterName || undefined,
          emails: {
            some: {
              email: submitterEmail,
            },
          },
        },
      });

      if (!existingCrmPersonByEmailAndName) {
        existingCrmPersonByEmailAndName = await prisma.crmPerson.create({
          data: {
            name: submitterName || "Volunteer",
            emails: {
              create: {
                email: submitterEmail,
              },
            },
            source: "VOLUNTEER",
            eventId: formResponse.eventId,
            links: {
              create: {
                formResponseId: formResponse.id,
              },
            },
          },
        });
        crmPersonId = existingCrmPersonByEmailAndName.id;
      } else {
        let crmPersonEmail = await prisma.crmPersonEmail.findFirst({
          where: {
            email: submitterEmail,
            crmPersonId: existingCrmPersonByEmailAndName.id,
          },
        });
        if (!crmPersonEmail) {
          crmPersonEmail = await prisma.crmPersonEmail.create({
            data: {
              email: submitterEmail,
              crmPersonId: existingCrmPersonByEmailAndName.id,
            },
          });
        }

        await prisma.crmPerson.update({
          where: {
            id: existingCrmPersonByEmailAndName.id,
          },
          data: {
            links: {
              create: {
                formResponseId: formResponse.id,
              },
            },
          },
        });

        crmPersonId = existingCrmPersonByEmailAndName.id;
      }
    }

    await prisma.logs.create({
      data: {
        type: LogType.FORM_RESPONSE_CREATED,
        userId: req.user?.id,
        ip: req.ip,
        eventId: formResponse.eventId,
        formResponseId: formResponse.id,
        data: formResponse,
        crmPersonId,
      },
    });

    // If a sessionId was provided, link it to this volunteer registration and mark converted
    if (sessionId) {
      try {
        await prisma.session.updateMany({
          where: { id: sessionId, eventId: formResponse.eventId },
          data: {
            volunteerRegistrationId: formResponse.id,
            converted: true,
          },
        });
      } catch (e) {
        // best-effort; do not fail submission if session linkage fails
        console.warn("Failed to link session to volunteer registration", e);
      }
    }

    const event = await prisma.event.findUnique({
      where: { id: formResponse.eventId },
    });

    if (submitterEmail) {
      await sendEmail({
        From: "EventPilot Support <EventPilot@geteventpilot.com>",
        To: submitterEmail,
        Subject: "Form Response Submitted",
        TextBody: `Form Response Submitted`,
        HtmlBody: await render(
          VolunteerFormResponseThankYouEmail.VolunteerFormResponseThankYouEmail(
            {
              data: fullSubmission,
              event: event,
            }
          )
        ),
        crmPersonId,
      });
    }

    res.json({ id: formResponse.id });
  } catch (error) {
    console.log(error);
    reportApiError(error, req);
    res.status(500).json({ message: error.message });
  }
};

export const get = [
  verifyAuth(["manager", "dod:volunteer"], true),
  async (req, res) => {
    const { eventId } = req.params;
    const instanceId = req.instanceId;

    try {
      const fields = await prisma.volunteerRegistrationField.findMany({
        where: { eventId, instanceId },
        orderBy: { order: "asc" },
        select: {
          id: true,
          label: true,
          type: true,
          eventpilotFieldType: true,
          options: { select: { id: true, label: true, deleted: true } },
          deleted: true,
        },
      });

      const rawResponses = await prisma.volunteerRegistration.findMany({
        where: { eventId, deleted: false, instanceId },
        include: {
          fieldResponses: {
            select: {
              fieldId: true,
              value: true,
              field: {
                select: {
                  id: true,
                  type: true,
                  options: { select: { id: true, label: true, deleted: true } },
                },
              },
            },
          },
        },
      });

      const responses = rawResponses.map((resp) =>
        formatFormResponse(resp, fields)
      );

      const fieldsMeta = fields.map((f) => {
        const isPageBreak =
          f.type === "pagebreak" || f.eventpilotFieldType === "pagebreak";
        const isShiftPicker =
          f.type === "shiftpicker" || f.eventpilotFieldType === "shiftpicker";
        const hiddenInAdmin = isPageBreak || isShiftPicker;

        return {
          ...f,
          showInAdmin: !hiddenInAdmin,
          // Hide pagebreak and shiftpicker markers from roster columns
          currentlyInForm: !f.deleted && !hiddenInAdmin,
        };
      });

      return res.json({
        fields: fieldsMeta,
        responses,
      });
    } catch (error) {
      console.log(error);
      reportApiError(error, req);
      return res.status(500).json({ message: error.message });
    }
  },
];
