import { prisma } from "#prisma";

export const fetchParticipantRegistrations = async ({ eventId, personIds }) => {
  if (!personIds.length) return [];
  return prisma.$queryRawUnsafe(
    `
      SELECT
        r."id",
        r."crmPersonId",
        r."finalized",
        r."createdAt",

        json_build_object('id', i."id", 'name', i."name") AS instance,
        json_build_object('id', rt."id", 'name', rt."name") AS "registrationTier",
        json_build_object('id', rp."id", 'name', rp."name") AS "registrationPeriod",
        json_build_object('id', t."id", 'name', t."name") AS team,
        json_build_object('id', c."id", 'code', c."code", 'title', c."title") AS coupon,

        (
          SELECT json_agg(
            json_build_object(
              'quantity', u."quantity",
              'upsellItem', json_build_object('id', ui."id", 'name', ui."name")
            )
          )
          FROM "RegistrationUpsell" u
          LEFT JOIN "UpsellItem" ui ON ui."id" = u."upsellItemId"
          WHERE u."registrationId" = r."id"
        ) AS upsells,

        (
          SELECT json_agg(
            json_build_object(
              'fieldId', fr."fieldId",
              'value', fr."value",
              'option', json_build_object('label', o."label"),
              'field', json_build_object('id', f."id", 'label', f."label")
            )
          )
          FROM "RegistrationFieldResponse" fr
          LEFT JOIN "RegistrationFieldOption" o ON o."id" = fr."optionId"
          LEFT JOIN "RegistrationField" f ON f."id" = fr."fieldId"
          WHERE fr."registrationId" = r."id"
        ) AS "fieldResponses"

      FROM "Registration" r
      LEFT JOIN "EventInstance" i ON i."id" = r."instanceId"
      LEFT JOIN "RegistrationTier" rt ON rt."id" = r."registrationTierId"
      LEFT JOIN "RegistrationPricing" rp ON rp."id" = r."registrationPeriodId"
      LEFT JOIN "Team" t ON t."id" = r."teamId"
      LEFT JOIN "Coupon" c ON c."id" = r."couponId"
      WHERE
        r."eventId" = $1
        AND r."crmPersonId" = ANY($2)
        AND r."deleted" = false
      ORDER BY r."createdAt" DESC
    `,
    eventId,
    personIds
  );
};
