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
      // Optional pagination: page (1-based) and size
      const rawPage = req.query.page ? parseInt(req.query.page, 10) : null;
      const rawSize = req.query.size ? parseInt(req.query.size, 10) : null;
      const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : null;
      const size = Number.isFinite(rawSize) && rawSize > 0 ? Math.min(rawSize, 200) : null;

      // Optional sorting: orderBy (accessor) and order (asc/desc)
      const order = (req.query.order || "desc").toLowerCase() === "asc" ? "asc" : "desc";
      const orderBy = typeof req.query.orderBy === "string" ? req.query.orderBy : null;

      const whereBase = {
        eventId,
        deleted: req.query.includeDeleted ? undefined : false,
      };

      // Text search across common fields
      const q = (req.query.q || "").toString().trim();

      const andClauses = [];
      if (q) {
        andClauses.push({
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { source: { contains: q, mode: "insensitive" } },
            { stripe_customerId: { contains: q, mode: "insensitive" } },
            {
              emails: {
                some: {
                  email: { contains: q, mode: "insensitive" },
                  deleted: req.query.includeDeleted ? undefined : false,
                },
              },
            },
            {
              phones: {
                some: { phone: { contains: q, mode: "insensitive" } },
              },
            },
            {
              fieldValues: {
                some: { value: { contains: q, mode: "insensitive" } },
              },
            },
          ],
        });
      }

      // Filter parsing: expect JSON stringified array of { path, operation, value }
      let filters = [];
      if (req.query.filters) {
        try {
          const parsed = JSON.parse(req.query.filters);
          if (Array.isArray(parsed)) filters = parsed;
        } catch (_) {
          // ignore
        }
      }

      // Build Prisma where clauses for common fields and simple custom field ops
      for (const f of filters) {
        if (!f || !f.path || !f.operation) continue;
        const op = String(f.operation);
        const path = String(f.path);
        const val = f.value == null ? null : String(f.value);

        const makeString = (key) => {
          if (op === "exists") return { [key]: { not: null } };
          if (op === "not-exists") return { NOT: { [key]: { not: null } } };
          if (val == null || val === "") return {};
          if (op === "eq") return { [key]: { equals: val, mode: "insensitive" } };
          if (op === "neq") return { NOT: { [key]: { equals: val, mode: "insensitive" } } };
          if (op === "contains")
            return { [key]: { contains: val, mode: "insensitive" } };
          if (op === "not-contains")
            return { NOT: { [key]: { contains: val, mode: "insensitive" } } };
          if (op === "starts-with")
            return { [key]: { startsWith: val, mode: "insensitive" } };
          if (op === "ends-with")
            return { [key]: { endsWith: val, mode: "insensitive" } };
          return {};
        };

        if (path === "name" || path === "source" || path === "stripe_customerId") {
          const clause = makeString(path);
          if (Object.keys(clause).length) andClauses.push(clause);
          continue;
        }
        if (path === "createdAt" || path === "updatedAt") {
          if (op === "exists") {
            andClauses.push({ [path]: { not: null } });
          } else if (op === "not-exists") {
            andClauses.push({ NOT: { [path]: { not: null } } });
          } else if (val) {
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
              if (op === "date-after" || op === "greater-than")
                andClauses.push({ [path]: { gt: d } });
              else if (op === "date-before" || op === "less-than")
                andClauses.push({ [path]: { lt: d } });
              else if (op === "greater-than-or-equal")
                andClauses.push({ [path]: { gte: d } });
              else if (op === "less-than-or-equal")
                andClauses.push({ [path]: { lte: d } });
              else if (op === "eq") andClauses.push({ [path]: d });
              else if (op === "neq") andClauses.push({ NOT: { [path]: d } });
            }
          }
          continue;
        }
        if (path === "emails") {
          if (op === "exists") {
            andClauses.push({
              emails: { some: { deleted: req.query.includeDeleted ? undefined : false } },
            });
          } else if (op === "not-exists") {
            andClauses.push({
              NOT: {
                emails: {
                  some: { deleted: req.query.includeDeleted ? undefined : false },
                },
              },
            });
          } else if (val) {
            const emailClause = makeString("email");
            andClauses.push({ emails: { some: { ...emailClause, deleted: req.query.includeDeleted ? undefined : false } } });
          }
          continue;
        }
        if (path === "phones") {
          if (op === "exists") andClauses.push({ phones: { some: {} } });
          else if (op === "not-exists") andClauses.push({ NOT: { phones: { some: {} } } });
          else if (val) {
            const phoneClause = makeString("phone");
            andClauses.push({ phones: { some: phoneClause } });
          }
          continue;
        }
        if (path.startsWith("fields.")) {
          const fieldId = path.split(".")[1];
          if (op === "exists") {
            andClauses.push({ fieldValues: { some: { crmFieldId: fieldId } } });
          } else if (op === "not-exists") {
            andClauses.push({ NOT: { fieldValues: { some: { crmFieldId: fieldId } } } });
          } else if (val) {
            // Textual comparisons via Prisma; numeric/date handled later via raw
            if ([
              "eq",
              "neq",
              "contains",
              "not-contains",
              "starts-with",
              "ends-with",
            ].includes(op)) {
              const strClause = makeString("value");
              andClauses.push({ fieldValues: { some: { crmFieldId: fieldId, ...strClause } } });
            }
          }
        }
      }

      // Fields we can sort via Prisma directly
      const prismaSortable = new Set(["name", "createdAt", "updatedAt", "source"]);

      // Handle special numeric/date comparisons on custom fields via raw SQL and intersect IDs
      const specialFilters = (filters || []).filter(
        (f) =>
          f &&
          typeof f.path === "string" &&
          f.path.startsWith("fields.") &&
          [
            "greater-than",
            "greater-than-or-equal",
            "less-than",
            "less-than-or-equal",
            "date-after",
            "date-before",
          ].includes(f.operation)
      );

      let idsConstraint = null; // null = no constraint; Set<string> otherwise
      for (const sf of specialFilters) {
        const fieldId = sf.path.split(".")[1];
        const cmp = sf.operation;
        const rawVal = String(sf.value || "");
        // Build SQL comparator
        let comparator = null;
        let expr = null;
        if (cmp === "greater-than") comparator = ">";
        if (cmp === "greater-than-or-equal") comparator = ">=";
        if (cmp === "less-than") comparator = "<";
        if (cmp === "less-than-or-equal") comparator = "<=";
        if (cmp === "date-after") comparator = ">";
        if (cmp === "date-before") comparator = "<";

        if (["greater-than", "greater-than-or-equal", "less-than", "less-than-or-equal"].includes(cmp)) {
          expr = `CASE WHEN f.value ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (f.value)::double precision ELSE NULL END`;
        } else if (["date-after", "date-before"].includes(cmp)) {
          expr = `NULLIF(f.value, '')::timestamptz`;
        }

        if (expr && comparator) {
          const rows = await prisma.$queryRawUnsafe(
            `
            SELECT p.id
            FROM "CrmPerson" p
            LEFT JOIN "CrmPersonField" f
              ON f."crmPersonId" = p.id AND f."crmFieldId" = $1
            WHERE p."eventId" = $2 ${req.query.includeDeleted ? "" : "AND p.\"deleted\" = false"}
              AND ${expr} ${comparator} $3
          `,
            fieldId,
            eventId,
            rawVal
          );
          const set = new Set(rows.map((r) => r.id));
          idsConstraint = idsConstraint ? new Set([...idsConstraint].filter((id) => set.has(id))) : set;
        }
      }

      // Apply Prisma where assembled so far, augmented by idsConstraint if present
      let where = andClauses.length ? { AND: [whereBase, ...andClauses] } : whereBase;
      if (idsConstraint && idsConstraint.size > 0) {
        where = { AND: [where, { id: { in: Array.from(idsConstraint) } }] };
      } else if (idsConstraint && idsConstraint.size === 0) {
        // No matches
        where = { AND: [whereBase, { id: { in: [] } }] };
      }

      const total = await prisma.crmPerson.count({ where });

      let crmPersons = [];

      if (orderBy && orderBy.startsWith("fields.")) {
        // Sorting by custom field requires a join on CrmPersonField.
        const fieldId = orderBy.split(".")[1];
        const offset = page && size ? (page - 1) * size : 0;
        const limit = page && size ? size : total || 1;

        // Pre-filter IDs using the assembled Prisma where
        const baseIdsRows = await prisma.crmPerson.findMany({ where, select: { id: true } });
        const baseIds = baseIdsRows.map((r) => r.id);
        if (baseIds.length === 0) {
          crmPersons = [];
        } else {
          // Order by the custom field's value, nulls last. We coalesce to lower() for stable text sort.
          const rows = await prisma.$queryRawUnsafe(
            `
            SELECT p.id
            FROM "CrmPerson" p
            LEFT JOIN "CrmPersonField" f
              ON f."crmPersonId" = p.id AND f."crmFieldId" = $1
            WHERE p.id = ANY($2)
            ORDER BY lower(COALESCE(f.value, '')) ${order.toUpperCase()} NULLS LAST, p."createdAt" DESC
            LIMIT $3 OFFSET $4
          `,
            fieldId,
            baseIds,
            limit,
            offset
          );

          const ids = rows.map((r) => r.id);
          const list = await prisma.crmPerson.findMany({
            where: { id: { in: ids } },
            include: {
              emails: { where: { deleted: req.query.includeDeleted ? undefined : false } },
              phones: true,
              fieldValues: true,
            },
          });
          const idx = new Map(ids.map((id, i) => [id, i]));
          crmPersons = list.sort((a, b) => idx.get(a.id) - idx.get(b.id));
        }
      } else {
        // Default Prisma-based ordering
        const orderByClause = orderBy && prismaSortable.has(orderBy)
          ? { [orderBy]: order }
          : { createdAt: "desc" };

        crmPersons = await prisma.crmPerson.findMany({
          where,
          include: {
            emails: { where: { deleted: req.query.includeDeleted ? undefined : false } },
            phones: true,
            fieldValues: true,
          },
          ...(page && size ? { skip: (page - 1) * size, take: size } : {}),
          orderBy: orderByClause,
        });
      }

      res.json({
        crmPersons: crmPersons.map((person) => ({
          ...person,
          fields: collapseCrmValues(person.fieldValues),
        })),
        total,
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
          From: "EventPilot Support <EventPilot@geteventpilot.com>",
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
