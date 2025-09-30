import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import {
  arrayToObject,
  formatResponseValue,
  getOrderedFields,
  normalizeForSearch,
} from "../index.js";

const toDisplayString = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    if (value.label) return toDisplayString(value.label);
    return JSON.stringify(value);
  }
  return null;
};

export const get = [
  verifyAuth(["manager", "dod:registration"]),
  async (req, res) => {
    const { eventId, registrationId } = req.params;

    try {
      const registration = await prisma.registration.findUnique({
        where: { id: registrationId },
        include: {
          registrationTier: {
            select: { id: true, name: true },
          },
          upsells: {
            include: {
              upsellItem: {
                select: { id: true, name: true },
              },
            },
          },
          fieldResponses: {
            include: {
              field: {
                include: {
                  options: {
                    select: {
                      id: true,
                      label: true,
                      value: true,
                      deleted: true,
                    },
                  },
                },
              },
              option: {
                select: {
                  id: true,
                  label: true,
                  value: true,
                },
              },
            },
          },
          checkedInBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!registration || registration.eventId !== eventId) {
        return res.status(404).json({ message: "Registration not found" });
      }

      const fields = await getOrderedFields(eventId, registration.instanceId);
      const fieldMap = new Map(fields.map((field) => [field.id, field]));

      const rawResponses = arrayToObject(
        registration.fieldResponses.map((response) => ({
          [response.fieldId]: response.value,
        }))
      );

      const resolvedResponses = fields.reduce((acc, field) => {
        acc[field.id] = null;
        return acc;
      }, {});

      registration.fieldResponses.forEach((response) => {
        const hydratedField = response.field || fieldMap.get(response.fieldId);
        if (!hydratedField) return;
        const canonicalField = {
          ...hydratedField,
          options: hydratedField.options ?? fieldMap.get(response.fieldId)?.options ?? [],
        };
        resolvedResponses[response.fieldId] = formatResponseValue(
          canonicalField,
          response
        );
      });

      const nameField =
        fields.find((field) => field.fieldType === "participantName") ||
        fields.find((field) => (field.label || "").toLowerCase().includes("name")) ||
        null;
      const emailField =
        fields.find((field) => field.fieldType === "participantEmail") ||
        fields.find((field) => (field.type || "").toLowerCase() === "email") ||
        null;
      const phoneField =
        fields.find((field) => field.fieldType === "participantPhone") ||
        fields.find((field) => (field.label || "").toLowerCase().includes("phone")) ||
        null;

      const nameValue = nameField
        ? resolvedResponses[nameField.id] ?? rawResponses[nameField.id]
        : null;
      const emailValue = emailField
        ? resolvedResponses[emailField.id] ?? rawResponses[emailField.id]
        : null;
      const phoneValue = phoneField
        ? resolvedResponses[phoneField.id] ?? rawResponses[phoneField.id]
        : null;

      const fieldMeta = fields.map((field) => ({
        ...field,
        currentlyInForm: !field.deleted,
      }));

      const searchTokens = new Set();
      searchTokens.add(registration.id);
      if (nameValue) searchTokens.add(normalizeForSearch(nameValue));
      if (emailValue) searchTokens.add(normalizeForSearch(emailValue));
      if (phoneValue) searchTokens.add(normalizeForSearch(phoneValue));
      Object.values(resolvedResponses).forEach((value) => {
        const normalized = normalizeForSearch(value);
        if (normalized) searchTokens.add(normalized);
      });

      return res.json({
        registration: {
          id: registration.id,
          eventId: registration.eventId,
          instanceId: registration.instanceId,
          createdAt: registration.createdAt,
          updatedAt: registration.updatedAt,
          finalized: registration.finalized,
          deleted: registration.deleted,
          checkedInAt: registration.checkedInAt,
          checkedInBy: registration.checkedInBy,
          registrationTier: registration.registrationTier,
          upsells: registration.upsells,
          fieldResponses: registration.fieldResponses,
          responses: rawResponses,
          resolvedResponses,
          flat: {
            name: toDisplayString(nameValue),
            email: toDisplayString(emailValue),
            phone: toDisplayString(phoneValue),
          },
          searchText: Array.from(searchTokens)
            .map((token) => (token || "").toString().toLowerCase())
            .filter(Boolean)
            .join(" \n"),
        },
        fields: fieldMeta,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: error.message });
    }
  },
];
