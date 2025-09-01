import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { LogType } from "@prisma/client";
import { collapseCrmValues } from "..";
import { serializeError } from "#serializeError";
import { personSchema } from "./[personId]";
import express from "express";
import { sendEmail } from "#postmark";
import ImportFinishedEmail from "#emails/import-finished.jsx";
import { render } from "@react-email/render";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const eventId = req.params.eventId;

    try {
      const crmPersons = await prisma.crmPerson.findMany({
        where: {
          eventId,
          deleted: req.query.includeDeleted || false,
        },
        include: {
          emails: true,
          phones: true,
          fieldValues: true,
        },
      });

      if (!crmPersons) {
        return res.status(404).json({ message: "Person not found" });
      }

      res.json({
        crmPersons: crmPersons.map((person) => ({
          ...person,
          fields: collapseCrmValues(person.fieldValues),
        })),
      });
    } catch (error) {
      console.error("Error in GET /event/:eventId/crm:", error);
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

      // validate & strip extra fields via zod
      const persons = rawPersons.map((entry) => {
        const result = personSchema.safeParse(entry);
        if (!result.success)
          throw { status: 400, message: serializeError(result) };
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

      // first pass: try creating each person
      for (const p of persons) {
        try {
          const created = await prisma.crmPerson.create({
            data: {
              ...p,
              eventId,
              ...(isImport && { source: "IMPORT" }),
              emails: { create: p.emails },
              phones: { create: p.phones },
              fieldValues: {
                create: p.fields.map((f) => ({
                  crmFieldId: f.id,
                  value: f.value,
                })),
              },
              fields: undefined,
              importId: isImport ? importEffort.id : undefined,
              logs: {
                create: {
                  type: LogType.CRM_PERSON_CREATED,
                  userId: req.user.id,
                  ip: req.ip || req.headers["x-forwarded-for"],
                  data: p,
                  eventId,
                },
              },
            },
          });
          successes.push(created);
        } catch (error) {
          console.log(
            "Initial insert failed for person:",
            p,
            "\nError:",
            error
          );
          failures.push(p);
        }
      }

      // retry any failures once
      if (failures.length) {
        console.log(`Retrying ${failures.length} failed insert(s)...`);
        const retryFailures = [];
        for (const p of failures) {
          try {
            const created = await prisma.crmPerson.create({
              data: {
                ...p,
                eventId,
                ...(isImport && { source: "IMPORT" }),
                emails: { create: p.emails },
                phones: { create: p.phones },
                fieldValues: {
                  create: p.fields.map((f) => ({
                    crmFieldId: f.id,
                    value: f.value,
                  })),
                },
                importId: isImport ? importEffort.id : undefined,
                fields: undefined,
                logs: {
                  create: {
                    type: LogType.CRM_PERSON_CREATED,
                    userId: req.user.id,
                    ip: req.ip || req.headers["x-forwarded-for"],
                    data: p,
                    eventId,
                  },
                },
              },
            });
            console.log("Retry succeeded for person:", created);
            successes.push(created);
          } catch (error) {
            console.log("Retry failed for person:", p, "\nError:", error);
            retryFailures.push(p);
          }
        }
        if (retryFailures.length) {
          console.log("Final failures after retry:", retryFailures);
        }
      }

      if (isImport) {
        await prisma.crmPersonsImport.update({
          where: {
            id: importEffort.id,
          },
          data: {
            finished: true,
          },
        });

        await sendEmail({
          From: "EventPilot Support <EventPilotgeteventpilot.com>",
          To: req.user.email,
          Subject: "Import finished",
          HtmlBody: await render(
            ImportFinishedEmail.ImportFinishedEmail({ name: req.user.name })
          ),
          userId: req.user.id,
        });
      }

      return res.json(
        isImport ? { crmPersons: successes } : { crmPerson: successes[0] }
      );
    } catch (err) {
      if (err.status === 400) {
        return res.status(400).json({ message: err.message });
      }
      console.error("Error in POST /event/:eventId/crm:", err);
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

      return res.json({ imports });
    } catch (e) {
      console.log(e);
      return res.status(500).json({ error: e.message });
    }
  },
];
