import { prisma } from "#prisma";

export const fetchVolunteerRegistrations = async ({ eventId, personIds }) => {
  if (!personIds.length) return [];
  return prisma.$queryRawUnsafe(
    `
      SELECT
        vr."id",
        vr."createdAt",
        json_build_object('id', i."id", 'name', i."name") AS instance,
        json_build_object('crmPersonId', cpl."crmPersonId") AS "crmPersonLink",

        (
          SELECT json_agg(
            json_build_object(
              'fieldId', fr."fieldId",
              'value', fr."value",
              'field', json_build_object('id', f."id", 'label', f."label")
            )
          )
          FROM "FieldResponse" fr
          LEFT JOIN "FormField" f ON f."id" = fr."fieldId"
          WHERE fr."responseId" = vr."id"
        ) AS "fieldResponses",

        (
          SELECT json_agg(
            json_build_object(
              'shift',
              json_build_object(
                'id', s."id",
                'job', json_build_object(
                  'id', j."id",
                  'name', j."name",
                  'location', json_build_object('id', jl."id", 'name', jl."name")
                ),
                'location', json_build_object('id', sl."id", 'name', sl."name")
              )
            )
          )
          FROM "FormResponseShift" vs
          LEFT JOIN "Shift" s ON s."id" = vs."shiftId"
          LEFT JOIN "Job" j ON j."id" = s."jobId"
          LEFT JOIN "Location" jl ON jl."id" = j."locationId"
          LEFT JOIN "Location" sl ON sl."id" = s."locationId"
          WHERE vs."formResponseId" = vr."id"
        ) AS shifts

      FROM "FormResponse" vr
      LEFT JOIN "EventInstance" i ON i."id" = vr."instanceId"
      LEFT JOIN "CrmPersonLink" cpl ON cpl."formResponseId" = vr."id"
      WHERE
        vr."eventId" = $1
        AND vr."deleted" = false
        AND cpl."crmPersonId" = ANY($2)
      ORDER BY vr."createdAt" DESC
    `,
    eventId,
    personIds
  );
};
