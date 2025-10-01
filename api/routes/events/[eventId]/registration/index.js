import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { NameAndEmailFromRegistrationFactory } from "../../../../util/getNameAndEmailFromRegistration";

export const arrayToObject = (arr) =>
  arr.reduce((acc, cur) => Object.assign(acc, cur), {});

const flattenResponse = (response) => ({
  [response.fieldId]: response.value,
});

export const normalizeForSearch = (value) => {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    return value.map((item) => normalizeForSearch(item)).filter(Boolean).join(" ");
  }
  if (typeof value === "object") {
    if (value.label) return normalizeForSearch(value.label);
    return Object.values(value)
      .map((entry) => normalizeForSearch(entry))
      .filter(Boolean)
      .join(" ");
  }
  return "";
};

export const formatResponseValue = (field, response) => {
  if (!field) return response.value ?? null;

  switch (field.type) {
    case "DROPDOWN": {
      const match = (field.options || []).find((option) => {
        if (option.deleted) return false;
        const candidate = response.optionId ?? response.value;
        return option.id === candidate || option.value === candidate;
      });
      return match
        ? { id: match.id, label: match.label, value: match.value }
        : response.value ?? null;
    }
    case "CHECKBOX": {
      if (typeof response.value === "boolean") return response.value;
      if (typeof response.value === "string") {
        const normalized = response.value.trim().toLowerCase();
        if (["true", "1", "yes"].includes(normalized)) return true;
        if (["false", "0", "no"].includes(normalized)) return false;
      }
      return Boolean(response.value);
    }
    default:
      return response.value ?? null;
  }
};

export const getOrderedFields = async (eventId, instanceId) => {
  const fields = await prisma.registrationField.findMany({
    where: {
      eventId,
      instanceId,
      deleted: false,
      page: { deleted: false },
      type: {
        notIn: ["UPSELLS", "REGISTRATIONTIER", "RICHTEXT", "TEAM"],
      },
    },
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
    orderBy: { order: "asc" },
  });

  const priority = { participantName: 0, participantEmail: 1 };

  return fields.sort((a, b) => {
    const aRank = priority[a.fieldType] ?? 2;
    const bRank = priority[b.fieldType] ?? 2;
    if (aRank !== bRank) return aRank - bRank;
    return a.order - b.order;
  });
};

export const get = [
  verifyAuth(["manager", "dod:registration"]),
  async (req, res) => {
    const { eventId } = req.params;
    const instanceId = req.instanceId;

    try {
      const [registrationsRaw, fields, factory] = await Promise.all([
        prisma.registration.findMany({
          where: { eventId, instanceId, deleted: false },
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
              select: {
                fieldId: true,
                value: true,
                optionId: true,
              },
            },
            checkedInBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        }),
        getOrderedFields(eventId, instanceId),
        NameAndEmailFromRegistrationFactory.prepare(eventId, instanceId),
      ]);

      const fieldMap = new Map(fields.map((field) => [field.id, field]));

      const nameFieldId =
        fields.find((field) => field.fieldType === "participantName")?.id ?? null;
      const emailFieldId =
        fields.find((field) => field.fieldType === "participantEmail")?.id ?? null;
      const phoneFieldId =
        fields.find((field) => field.fieldType === "participantPhone")?.id ??
        fields.find((field) =>
          (field.label || "").toLowerCase().includes("phone")
        )?.id ?? null;

      const registrations = registrationsRaw.map((registration) => {
        const { fieldResponses, ...rest } = registration;

        const rawResponses = arrayToObject(fieldResponses.map(flattenResponse));

        const resolvedResponses = fieldResponses.reduce((acc, response) => {
          const field = fieldMap.get(response.fieldId);
          if (!field) return acc;
          acc[field.id] = formatResponseValue(field, response);
          return acc;
        }, {});

        const { name, email } = factory.getNameAndEmail(registration);
        const phoneRaw = phoneFieldId
          ? resolvedResponses[phoneFieldId] ?? rawResponses[phoneFieldId]
          : undefined;

        const searchTokens = new Set();
        searchTokens.add(registration.id);
        searchTokens.add(name ?? "");
        searchTokens.add(email ?? "");
        if (phoneRaw) searchTokens.add(normalizeForSearch(phoneRaw));

        Object.values(resolvedResponses).forEach((value) => {
          const normalized = normalizeForSearch(value);
          if (normalized) searchTokens.add(normalized);
        });

        const tierName = registration.registrationTier?.name;
        if (tierName) searchTokens.add(tierName);
        registration.upsells?.forEach((upsell) => {
          const label = upsell.upsellItem?.name;
          if (label) searchTokens.add(label);
        });

        return {
          ...rest,
          responses: rawResponses,
          resolvedResponses,
          fieldResponses,
          flat: {
            name,
            email,
            phone: phoneRaw ? normalizeForSearch(phoneRaw) : undefined,
          },
          searchText: Array.from(searchTokens)
            .map((token) => (token || "").toString().toLowerCase())
            .filter(Boolean)
            .join(" \n"),
        };
      });

      return res.json({ registrations, fields });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: error.message });
    }
  },
];
