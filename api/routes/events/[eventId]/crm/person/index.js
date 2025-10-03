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

const parseFieldValue = (raw) => {
  if (raw == null) return "";
  const value = String(raw).trim();
  if (!value) return "";
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === "[" && last === "]") || (first === "{" && last === "}")) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => (entry == null ? "" : String(entry)))
          .filter(Boolean)
          .join(", ");
      }
      if (parsed && typeof parsed === "object") {
        return Object.values(parsed)
          .map((entry) => (entry == null ? "" : String(entry)))
          .filter(Boolean)
          .join(", ");
      }
    } catch (error) {
      void error;
    }
  }
  return value;
};

const formatFieldResponses = (responses = []) =>
  responses
    .map((response) => {
      const label = response?.field?.label?.trim();
      const fieldId = response?.field?.id ?? response?.fieldId ?? null;
      const rawValue =
        response?.option?.label ??
        (response?.value != null ? String(response.value) : null);
      const parsedValue = parseFieldValue(rawValue);
      if (!fieldId || !label || !parsedValue) return null;
      return { fieldId, label, value: parsedValue };
    })
    .filter(Boolean);

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const eventId = req.params.eventId;

    // --- lightweight timing instrumentation ---
    const NS_PER_MS = 1_000_000n;
    const startNs = process.hrtime.bigint();
    let lastNs = startNs;
    const tmark = (label, extra = {}) => {
      const now = process.hrtime.bigint();
      const sinceLastMs = Number(now - lastNs) / Number(NS_PER_MS);
      const totalMs = Number(now - startNs) / Number(NS_PER_MS);
      lastNs = now;
      console.log(
        `[CRM GET] ${label} +${sinceLastMs.toFixed(3)}ms (total ${totalMs.toFixed(
          3
        )}ms) ${Object.keys(extra).length ? JSON.stringify(extra) : ""}`
      );
    };

    try {
      const page = Math.max(parseInt(req.query.page ?? "1", 10), 1);
      const size = Math.min(
        Math.max(parseInt(req.query.size ?? "50", 10), 1),
        200
      );

      // Optional sorting: orderBy (accessor) and order (asc/desc)
      const order =
        (req.query.order || "desc").toLowerCase() === "asc" ? "asc" : "desc";
      const orderBy =
        typeof req.query.orderBy === "string" ? req.query.orderBy : null;

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
      tmark("Parsed query params & text search", {
        q,
        page,
        size,
        orderBy,
        order,
      });

      // Filter parsing: expect JSON stringified array of { path, operation, value }
      let filters = [];
      if (req.query.filters) {
        try {
          const parsed = JSON.parse(req.query.filters);
          if (Array.isArray(parsed)) filters = parsed;
        } catch (_) {
          void _;
        }
      }
      tmark("Parsed filters", { filtersCount: filters.length });

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
          if (op === "eq")
            return { [key]: { equals: val, mode: "insensitive" } };
          if (op === "neq")
            return { NOT: { [key]: { equals: val, mode: "insensitive" } } };
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

        if (
          path === "name" ||
          path === "source" ||
          path === "stripe_customerId"
        ) {
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
              emails: {
                some: { deleted: req.query.includeDeleted ? undefined : false },
              },
            });
          } else if (op === "not-exists") {
            andClauses.push({
              NOT: {
                emails: {
                  some: {
                    deleted: req.query.includeDeleted ? undefined : false,
                  },
                },
              },
            });
          } else if (val) {
            const emailClause = makeString("email");
            andClauses.push({
              emails: {
                some: {
                  ...emailClause,
                  deleted: req.query.includeDeleted ? undefined : false,
                },
              },
            });
          }
          continue;
        }
        if (path === "phones") {
          if (op === "exists") andClauses.push({ phones: { some: {} } });
          else if (op === "not-exists")
            andClauses.push({ NOT: { phones: { some: {} } } });
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
            andClauses.push({
              NOT: { fieldValues: { some: { crmFieldId: fieldId } } },
            });
          } else if (val) {
            if (
              [
                "eq",
                "neq",
                "contains",
                "not-contains",
                "starts-with",
                "ends-with",
              ].includes(op)
            ) {
              const strClause = makeString("value");
              andClauses.push({
                fieldValues: { some: { crmFieldId: fieldId, ...strClause } },
              });
            }
          }
        }
      }
      tmark("Built where (base + simple filters)", {
        andClauses: andClauses.length,
      });

      // Fields we can sort via Prisma directly
      const prismaSortable = new Set([
        "name",
        "createdAt",
        "updatedAt",
        "source",
      ]);

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
        let comparator = null;
        let expr = null;
        if (cmp === "greater-than") comparator = ">";
        if (cmp === "greater-than-or-equal") comparator = ">=";
        if (cmp === "less-than") comparator = "<";
        if (cmp === "less-than-or-equal") comparator = "<=";
        if (cmp === "date-after") comparator = ">";
        if (cmp === "date-before") comparator = "<";

        if (
          [
            "greater-than",
            "greater-than-or-equal",
            "less-than",
            "less-than-or-equal",
          ].includes(cmp)
        ) {
          expr = `CASE WHEN f.value ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (f.value)::double precision ELSE NULL END`;
        } else if (["date-after", "date-before"].includes(cmp)) {
          expr = `NULLIF(f.value, '')::timestamptz`;
        }

        if (expr && comparator) {
          tmark("Special filter query start", { fieldId, cmp, rawVal });
          const rows = await prisma.$queryRawUnsafe(
            `
            SELECT p.id
            FROM "CrmPerson" p
            LEFT JOIN "CrmPersonField" f
              ON f."crmPersonId" = p.id AND f."crmFieldId" = $1
            WHERE p."eventId" = $2 ${req.query.includeDeleted ? "" : 'AND p."deleted" = false'}
              AND ${expr} ${comparator} $3
          `,
            fieldId,
            eventId,
            rawVal
          );
          tmark("Special filter query end", { matchedIds: rows.length });
          const set = new Set(rows.map((r) => r.id));
          idsConstraint = idsConstraint
            ? new Set([...idsConstraint].filter((id) => set.has(id)))
            : set;
        }
      }
      tmark("Applied special filters (intersection)", {
        idsConstraintSize: idsConstraint ? idsConstraint.size : null,
      });

      // Apply Prisma where assembled so far, augmented by idsConstraint if present
      let where = andClauses.length
        ? { AND: [whereBase, ...andClauses] }
        : whereBase;
      if (idsConstraint && idsConstraint.size > 0) {
        where = { AND: [where, { id: { in: Array.from(idsConstraint) } }] };
      } else if (idsConstraint && idsConstraint.size === 0) {
        where = { AND: [whereBase, { id: { in: [] } }] };
      }

      const total = await prisma.crmPerson.count({ where });
      tmark("Counted crmPerson total", { total });

      let crmPersons = [];
      let precomputedLifetime = null;

      const baseInclude = {
        emails: {
          where: { deleted: req.query.includeDeleted ? undefined : false },
        },
        phones: true,
        fieldValues: true,
      };

      if (orderBy === "lifetimeValue") {
        tmark("Begin lifetimeValue ordering - collect IDs");
        const idRows = await prisma.crmPerson.findMany({
          where,
          select: { id: true },
          take: size,
          skip: (page - 1) * size,
        });
        const allIds = idRows.map((row) => row.id);
        tmark("Collected IDs for lifetimeValue", { ids: allIds.length });

        if (allIds.length) {
          tmark("GroupBy ledgerItem start", { ids: allIds.length });
          const lifetimeGroups = await prisma.ledgerItem.groupBy({
            by: ["crmPersonId"],
            where: {
              eventId,
              crmPersonId: { in: allIds },
            },
            _sum: { amount: true },
          });
          tmark("GroupBy ledgerItem end", { rows: lifetimeGroups.length });

          precomputedLifetime = new Map(allIds.map((id) => [id, 0]));
          for (const entry of lifetimeGroups) {
            precomputedLifetime.set(
              entry.crmPersonId,
              Number(entry._sum?.amount || 0)
            );
          }

          const sortedIds = [...allIds].sort((a, b) => {
            const left = precomputedLifetime.get(a) ?? 0;
            const right = precomputedLifetime.get(b) ?? 0;
            return order === "asc" ? left - right : right - left;
          });

          const offset = page && size ? (page - 1) * size : 0;
          const limit = page && size ? size : sortedIds.length;
          const pageIds = sortedIds.slice(offset, offset + limit);
          tmark("Sorted & sliced lifetimeValue IDs", {
            pageIds: pageIds.length,
            offset,
            limit,
          });

          if (pageIds.length) {
            crmPersons = await prisma.crmPerson.findMany({
              where: { id: { in: pageIds } },
              include: baseInclude,
              take: size,
              skip: (page - 1) * size,
            });
            const index = new Map(pageIds.map((id, idx) => [id, idx]));
            crmPersons.sort((a, b) => index.get(a.id) - index.get(b.id));
          }
        }
        tmark("Fetched crmPersons (lifetimeValue)", {
          count: crmPersons.length,
        });
      } else if (orderBy && orderBy.startsWith("fields.")) {
        const fieldId = orderBy.split(".")[1];
        const offset = page && size ? (page - 1) * size : 0;
        const limit = page && size ? size : total || 1;

        tmark("Custom-field sort: prefilter IDs start");
        const baseIdsRows = await prisma.crmPerson.findMany({
          where,
          select: { id: true },
          take: size,
          skip: (page - 1) * size,
        });
        const baseIds = baseIdsRows.map((r) => r.id);
        tmark("Custom-field sort: prefilter IDs end", {
          baseIds: baseIds.length,
        });

        if (baseIds.length === 0) {
          crmPersons = [];
        } else {
          tmark("Custom-field ORDER BY query start", {
            fieldId,
            limit,
            offset,
          });
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
          tmark("Custom-field ORDER BY query end", { returned: rows.length });

          const ids = rows.map((r) => r.id);
          const list = await prisma.crmPerson.findMany({
            where: { id: { in: ids } },
            include: baseInclude,
          });
          const idx = new Map(ids.map((id, i) => [id, i]));
          crmPersons = list.sort((a, b) => idx.get(a.id) - idx.get(b.id));
        }
        tmark("Fetched crmPersons (custom-field sort)", {
          count: crmPersons.length,
        });
      } else {
        const orderByClause =
          orderBy && prismaSortable.has(orderBy)
            ? { [orderBy]: order }
            : { createdAt: "desc" };

        tmark("Default Prisma findMany start", {
          orderByClause,
          paged: Boolean(page && size),
        });
        crmPersons = await prisma.crmPerson.findMany({
          where,
          include: baseInclude,
          take: size,
          skip: (page - 1) * size,
          orderBy: orderByClause,
        });
        tmark("Default Prisma findMany end", { count: crmPersons.length });
      }

      const personIds = crmPersons.map((person) => person.id);
      tmark("Person IDs extracted", { personIds: personIds.length });

      let emailEntries = [];
      let participantRegistrations = [];
      let volunteerRegistrations = [];

      if (personIds.length) {
        tmark("Parallel fetch (emails, participants, volunteers) start");
        [emailEntries, participantRegistrations, volunteerRegistrations] =
          await Promise.all([
            prisma.email.findMany({
              where: {
                OR: [
                  { crmPersonId: { in: personIds } },
                  { crmPersonEmail: { crmPersonId: { in: personIds } } },
                ],
              },
              select: {
                createdAt: true,
                crmPersonId: true,
                crmPersonEmail: { select: { crmPersonId: true } },
                opened: true,
                status: true,
              },
              orderBy: { createdAt: "desc" },
            }),
            prisma.registration.findMany({
              where: {
                eventId,
                crmPersonId: { in: personIds },
                deleted: false,
              },
              select: {
                id: true,
                crmPersonId: true,
                finalized: true,
                createdAt: true,
                instance: { select: { id: true, name: true } },
                registrationTier: { select: { id: true, name: true } },
                registrationPeriod: { select: { id: true, name: true } },
                team: { select: { id: true, name: true } },
                coupon: { select: { id: true, code: true, title: true } },
                upsells: {
                  select: {
                    quantity: true,
                    upsellItem: { select: { id: true, name: true } },
                  },
                },
                fieldResponses: {
                  select: {
                    fieldId: true,
                    value: true,
                    option: { select: { label: true } },
                    field: { select: { id: true, label: true } },
                  },
                },
              },
              orderBy: { createdAt: "desc" },
            }),
            prisma.volunteerRegistration.findMany({
              where: {
                eventId,
                deleted: false,
                crmPersonLink: { crmPersonId: { in: personIds } },
              },
              select: {
                id: true,
                createdAt: true,
                instance: { select: { id: true, name: true } },
                crmPersonLink: { select: { crmPersonId: true } },
                fieldResponses: {
                  select: {
                    fieldId: true,
                    value: true,
                    field: { select: { id: true, label: true } },
                  },
                },
                shifts: {
                  select: {
                    shift: {
                      select: {
                        id: true,
                        job: {
                          select: {
                            id: true,
                            name: true,
                            location: { select: { id: true, name: true } },
                          },
                        },
                        location: { select: { id: true, name: true } },
                      },
                    },
                  },
                },
              },
              orderBy: { createdAt: "desc" },
            }),
          ]);
        tmark("Parallel fetch end", {
          emails: emailEntries.length,
          participantRegistrations: participantRegistrations.length,
          volunteerRegistrations: volunteerRegistrations.length,
        });
      }

      let ledgerMap;
      if (precomputedLifetime) {
        ledgerMap = new Map(
          personIds.map((id) => [id, precomputedLifetime.get(id) ?? 0])
        );
        tmark("Used precomputed lifetime map");
      } else if (personIds.length) {
        tmark("GroupBy ledgerItem (page-only) start");
        const ledgerGroups = await prisma.ledgerItem.groupBy({
          by: ["crmPersonId"],
          where: {
            eventId,
            crmPersonId: { in: personIds },
          },
          _sum: { amount: true },
        });
        ledgerMap = new Map(
          ledgerGroups.map((entry) => [
            entry.crmPersonId,
            Number(entry._sum?.amount || 0),
          ])
        );
        tmark("GroupBy ledgerItem (page-only) end", {
          ledgerGroups: ledgerGroups.length,
        });
      } else {
        ledgerMap = new Map();
        tmark("Empty ledger map (no persons)");
      }

      const emailMap = new Map();
      const emailStatsMap = new Map();
      for (const email of emailEntries) {
        const personId = email.crmPersonId ?? email.crmPersonEmail?.crmPersonId;
        if (!personId) continue;

        const opened =
          Boolean(email.opened) ||
          String(email.status || "").toUpperCase() === "OPENED";

        const stats = emailStatsMap.get(personId) || { sent: 0, opened: 0 };
        stats.sent += 1;
        if (opened) stats.opened += 1;
        emailStatsMap.set(personId, stats);

        if (!emailMap.has(personId)) {
          emailMap.set(personId, email.createdAt);
        }
      }
      tmark("Computed email stats", {
        personsWithEmails: emailStatsMap.size,
      });

      const participantAccumulator = new Map();
      for (const reg of participantRegistrations) {
        if (!reg.crmPersonId) continue;
        let summary = participantAccumulator.get(reg.crmPersonId);
        if (!summary) {
          summary = {
            total: 0,
            finalized: 0,
            latest: null,
            registrations: [],
            tiers: new Set(),
            periods: new Set(),
            teams: new Set(),
            coupons: new Set(),
            upsellTotals: new Map(),
            fieldValues: new Map(),
          };
          participantAccumulator.set(reg.crmPersonId, summary);
        }

        const detail = {
          id: reg.id,
          createdAt: reg.createdAt,
          instanceId: reg.instance?.id ?? null,
          instanceName: reg.instance?.name ?? null,
          finalized: reg.finalized,
          tierId: reg.registrationTier?.id ?? null,
          tierName: reg.registrationTier?.name ?? null,
          periodId: reg.registrationPeriod?.id ?? null,
          periodName: reg.registrationPeriod?.name ?? null,
          teamId: reg.team?.id ?? null,
          teamName: reg.team?.name ?? null,
          couponCode: reg.coupon?.code || reg.coupon?.title || null,
          upsells: [],
          fieldValues: formatFieldResponses(reg.fieldResponses),
        };

        if (Array.isArray(reg.upsells)) {
          for (const upsell of reg.upsells) {
            const name = upsell?.upsellItem?.name?.trim();
            if (!name) continue;
            const quantity = Number(upsell.quantity || 0) || 0;
            const label = quantity > 1 ? `${name} ×${quantity}` : name;
            detail.upsells.push(label);
            const current = summary.upsellTotals.get(name) || 0;
            summary.upsellTotals.set(name, current + (quantity || 1));
          }
        }

        summary.total += 1;
        if (reg.finalized) summary.finalized += 1;
        summary.registrations.push(detail);
        if (detail.tierName) summary.tiers.add(detail.tierName);
        if (detail.periodName) summary.periods.add(detail.periodName);
        if (detail.teamName) summary.teams.add(detail.teamName);
        if (detail.couponCode) summary.coupons.add(detail.couponCode);

        if (detail.fieldValues?.length) {
          for (const field of detail.fieldValues) {
            const label = field.label;
            const value = field.value;
            if (!label || !value) continue;
            const existing = summary.fieldValues.get(label) || new Set();
            existing.add(value);
            summary.fieldValues.set(label, existing);
          }
        }
        if (!summary.latest) summary.latest = detail;
      }
      tmark("Aggregated participant registrations", {
        personsWithParticipantRegs: participantAccumulator.size,
      });

      const normalizedParticipantMap = new Map(
        [...participantAccumulator.entries()].map(([personId, summary]) => [
          personId,
          {
            total: summary.total,
            finalized: summary.finalized,
            latest: summary.latest,
            registrations: summary.registrations,
            tiers: Array.from(summary.tiers).sort((a, b) => a.localeCompare(b)),
            periods: Array.from(summary.periods).sort((a, b) =>
              a.localeCompare(b)
            ),
            teams: Array.from(summary.teams).sort((a, b) => a.localeCompare(b)),
            coupons: Array.from(summary.coupons).sort((a, b) =>
              a.localeCompare(b)
            ),
            upsells: Array.from(summary.upsellTotals.entries())
              .map(([name, quantity]) =>
                quantity > 1 ? `${name} ×${quantity}` : name
              )
              .sort((a, b) => a.localeCompare(b)),
            fields: (() => {
              const output = {};
              for (const [label, values] of summary.fieldValues.entries()) {
                output[label] = Array.from(values).join(", ");
              }
              return output;
            })(),
          },
        ])
      );
      tmark("Normalized participant map", {
        normalizedCount: normalizedParticipantMap.size,
      });

      const volunteerAccumulator = new Map();
      for (const reg of volunteerRegistrations) {
        const personId = reg.crmPersonLink?.crmPersonId;
        if (!personId) continue;
        let summary = volunteerAccumulator.get(personId);
        if (!summary) {
          summary = {
            total: 0,
            totalShifts: 0,
            latest: null,
            registrations: [],
            jobNames: new Set(),
            locationNames: new Set(),
            fieldValues: new Map(),
          };
          volunteerAccumulator.set(personId, summary);
        }

        const jobNames = new Set();
        const locationNames = new Set();
        for (const signup of reg.shifts || []) {
          const shiftJob = signup.shift?.job;
          if (shiftJob?.name) jobNames.add(shiftJob.name);
          if (shiftJob?.location?.name)
            locationNames.add(shiftJob.location.name);
          if (signup.shift?.location?.name)
            locationNames.add(signup.shift.location.name);
        }

        const detail = {
          id: reg.id,
          createdAt: reg.createdAt,
          instanceId: reg.instance?.id ?? null,
          instanceName: reg.instance?.name ?? null,
          shiftCount: (reg.shifts || []).length,
          jobNames: Array.from(jobNames),
          locationNames: Array.from(locationNames),
          fieldValues: formatFieldResponses(reg.fieldResponses),
        };

        summary.total += 1;
        summary.totalShifts += detail.shiftCount;
        summary.registrations.push(detail);
        detail.jobNames.forEach((name) => summary.jobNames.add(name));
        detail.locationNames.forEach((name) => summary.locationNames.add(name));
        if (detail.fieldValues?.length) {
          for (const field of detail.fieldValues) {
            const label = field.label;
            const value = field.value;
            if (!label || !value) continue;
            const existing = summary.fieldValues.get(label) || new Set();
            existing.add(value);
            summary.fieldValues.set(label, existing);
          }
        }
        if (!summary.latest) summary.latest = detail;
      }
      tmark("Aggregated volunteer registrations", {
        personsWithVolunteerRegs: volunteerAccumulator.size,
      });

      const volunteerMap = new Map(
        [...volunteerAccumulator.entries()].map(([personId, summary]) => [
          personId,
          {
            total: summary.total,
            totalShifts: summary.totalShifts,
            latest: summary.latest,
            registrations: summary.registrations,
            jobs: Array.from(summary.jobNames).sort((a, b) =>
              a.localeCompare(b)
            ),
            locations: Array.from(summary.locationNames).sort((a, b) =>
              a.localeCompare(b)
            ),
            fields: (() => {
              const output = {};
              for (const [label, values] of summary.fieldValues.entries()) {
                output[label] = Array.from(values).join(", ");
              }
              return output;
            })(),
          },
        ])
      );
      tmark("Built volunteer map", { normalizedCount: volunteerMap.size });

      const enrichedCrmPersons = crmPersons.map((person) => {
        const participantStats = normalizedParticipantMap.get(person.id);
        const volunteerStats = volunteerMap.get(person.id);
        const emailStats = emailStatsMap.get(person.id) || {
          sent: 0,
          opened: 0,
        };
        const emailOpenRate =
          emailStats.sent > 0 ? emailStats.opened / emailStats.sent : 0;
        return {
          ...person,
          fields: collapseCrmValues(person.fieldValues),
          lifetimeValue: ledgerMap.get(person.id) ?? 0,
          lastEmailedAt: emailMap.get(person.id) ?? null,
          emailStats: {
            sent: emailStats.sent,
            opened: emailStats.opened,
            openRate: emailOpenRate,
          },
          emailOpenRate,
          participantStats: participantStats || {
            total: 0,
            finalized: 0,
            latest: null,
            registrations: [],
            tiers: [],
            periods: [],
            teams: [],
            coupons: [],
            upsells: [],
            fields: {},
          },
          volunteerStats: volunteerStats || {
            total: 0,
            totalShifts: 0,
            latest: null,
            registrations: [],
            jobs: [],
            locations: [],
            fields: {},
          },
        };
      });
      tmark("Assembled enriched persons", {
        enriched: enrichedCrmPersons.length,
      });

      res.json({
        crmPersons: enrichedCrmPersons,
        total,
      });
      tmark("Response sent");
    } catch (error) {
      console.error("Error in GET /event/:eventId/crm:", error);
      tmark("Error path");
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
