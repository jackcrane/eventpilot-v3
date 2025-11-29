import express from "express";
import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { LogType } from "@prisma/client";
import { sendEmail } from "#postmark";
import ImportFinishedEmail from "#emails/import-finished.jsx";
import { render } from "@react-email/render";
import { reportApiError } from "#util/reportApiError.js";
import { personSchema } from "#util/crm/personSchema.js";
import { parseCrmListQuery } from "#util/crm/parseCrmListQuery.js";
import { createTimingTracker } from "#util/crm/createTimingTracker.js";
import { fetchCrmRows } from "#util/crm/fetchCrmRows.js";
import { fetchParticipantRegistrations } from "#util/crm/fetchParticipantRegistrations.js";
import { fetchVolunteerRegistrations } from "#util/crm/fetchVolunteerRegistrations.js";
import { fetchLatestEmailEntries } from "#util/crm/fetchLatestEmailEntries.js";
import { createParticipantStatsMap } from "#util/crm/createParticipantStatsMap.js";
import { createVolunteerStatsMap } from "#util/crm/createVolunteerStatsMap.js";
import { buildCrmPersonResponse } from "#util/crm/buildCrmPersonResponse.js";

const normalizeBigInts = (value) => {
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (Array.isArray(value)) {
    return value.map(normalizeBigInts);
  }
  if (value instanceof Date || value === null || typeof value !== "object") {
    return value;
  }
  const normalized = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    normalized[key] = normalizeBigInts(nestedValue);
  }
  return normalized;
};

const createPersonPayload = ({ person, eventId, isImport, req, importId }) => ({
  ...person,
  eventId,
  ...(isImport && { source: "IMPORT" }),
  emails: { create: person.emails },
  phones: { create: person.phones },
  fieldValues: {
    create: person.fields.map((field) => ({
      crmFieldId: field.id,
      value: field.value,
    })),
  },
  fields: undefined,
  importId: isImport ? importId : undefined,
  logs: {
    create: {
      type: LogType.CRM_PERSON_CREATED,
      userId: req.user.id,
      ip: req.ip || req.headers["x-forwarded-for"],
      data: person,
      eventId,
    },
  },
});

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const eventId = req.params.eventId;
    const tmark = createTimingTracker("CRM GET");

    try {
      const options = parseCrmListQuery(req);
      tmark("Parsed request", options);

      const { crmPersons, total, lifetimeMap } = await fetchCrmRows({
        eventId,
        ...options,
      });
      tmark("Fetched CRM rows", { count: crmPersons.length, total });

      const personIds = crmPersons.map((person) => person.id);
      tmark("Person IDs extracted", { personIds: personIds.length });

      const [participantRegistrations, volunteerRegistrations, emailEntries] =
        await Promise.all([
          fetchParticipantRegistrations({ eventId, personIds }),
          fetchVolunteerRegistrations({ eventId, personIds }),
          fetchLatestEmailEntries({ personIds }),
        ]);
      tmark("Fetched related data", {
        participantRegistrations: participantRegistrations.length,
        volunteerRegistrations: volunteerRegistrations.length,
        emailEntries: emailEntries.length,
      });

      const participantStats = createParticipantStatsMap(
        participantRegistrations
      );
      const volunteerStats = createVolunteerStatsMap(volunteerRegistrations);
      const emailMap = new Map(
        emailEntries.map((entry) => [entry.crmPersonId, entry.createdAt])
      );
      tmark("Computed aggregates", {
        participantStats: participantStats.size,
        volunteerStats: volunteerStats.size,
        emailMap: emailMap.size,
      });

      const crmPersonsResponse = buildCrmPersonResponse({
        persons: crmPersons,
        participantStats,
        volunteerStats,
        lifetimeMap,
        emailMap,
      });
      tmark("Composed response", { enriched: crmPersonsResponse.length });

      res.json(normalizeBigInts({ crmPersons: crmPersonsResponse, total }));
      tmark("Response sent");
    } catch (error) {
      console.error("Error in GET /event/:eventId/crm:", error);
      reportApiError(error, req);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];

export const post = [
  verifyAuth(["manager"]),
  express.json({ limit: "10mb" }),
  async (req, res) => {
    const eventId = req.params.eventId;

    try {
      const payload = req.body;
      const isImport = Array.isArray(payload);
      const rawPersons = isImport ? payload : [payload];

      const persons = rawPersons.map((entry) => {
        const result = personSchema.safeParse(entry);
        if (!result.success) {
          throw { status: 400, message: serializeError(result) };
        }
        return result.data;
      });

      const successes = [];
      const failures = [];
      let importEffort;

      if (isImport) {
        importEffort = await prisma.crmPersonsImport.create({
          data: {
            eventId,
            total: persons.length,
            logs: {
              create: {
                type: LogType.CRM_PERSONS_IMPORT_STARTED,
                userId: req.user.id,
                ip: req.ip || req.headers["x-forwarded-for"],
                data: null,
                eventId,
              },
            },
          },
        });
      }

      for (const person of persons) {
        try {
          const created = await prisma.crmPerson.create({
            data: createPersonPayload({
              person,
              eventId,
              isImport,
              req,
              importId: importEffort?.id,
            }),
          });
          successes.push(created);
        } catch (error) {
          console.log(
            "Initial insert failed for person:",
            person,
            "\nError:",
            error
          );
          failures.push(person);
        }
      }

      if (failures.length) {
        console.log(`Retrying ${failures.length} failed insert(s)...`);
        const retryFailures = [];
        for (const person of failures) {
          try {
            const created = await prisma.crmPerson.create({
              data: createPersonPayload({
                person,
                eventId,
                isImport,
                req,
                importId: importEffort?.id,
              }),
            });
            console.log("Retry succeeded for person:", created);
            successes.push(created);
          } catch (error) {
            console.log("Retry failed for person:", person, "\nError:", error);
            retryFailures.push(person);
          }
        }
        if (retryFailures.length) {
          console.log("Final failures after retry:", retryFailures);
        }
      }

      if (isImport && importEffort) {
        await prisma.crmPersonsImport.update({
          where: { id: importEffort.id },
          data: { finished: true },
        });

        await sendEmail({
          From: "EventPilot Support <EventPilot@geteventpilot.com>",
          To: req.user.email,
          Subject: "Import finished",
          HtmlBody: await render(
            ImportFinishedEmail.ImportFinishedEmail({ name: req.user.name })
          ),
          userId: req.user.id,
        });
      }

      const responsePayload = isImport
        ? { crmPersons: successes }
        : { crmPerson: successes[0] };
      res.json(normalizeBigInts(responsePayload));
    } catch (error) {
      if (error.status === 400) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Error in POST /event/:eventId/crm:", error);
      reportApiError(error, req);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];

export const patch = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const imports = await prisma.crmPersonsImport.findMany({
        where: {
          eventId,
          finished: false,
        },
        include: {
          _count: {
            select: {
              crmPersons: true,
            },
          },
        },
      });

      res.json(normalizeBigInts({ imports }));
    } catch (error) {
      console.log(error);
      reportApiError(error, req);
      res.status(500).json({ error: error.message });
    }
  },
];
