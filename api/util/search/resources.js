import { createSearchDocument } from "./createDocument.js";

const cleanList = (values = []) => values.filter(Boolean);

const personContactValues = (record) => {
  const emailList = (record.emails ?? [])
    .filter((email) => !email.deleted)
    .map((email) => email.email);
  const phoneList = (record.phones ?? [])
    .filter((phone) => !phone.deleted)
    .map((phone) => phone.phone);
  return { emailList, phoneList };
};

const volunteerNameFromResponses = (responses = []) => {
  const preferred = responses.find((response) => {
    const label = response.field?.label?.toLowerCase?.() ?? "";
    return label.includes("name");
  });
  if (preferred?.value) {
    return preferred.value;
  }
  const fallback = responses.find((response) => response.value);
  return fallback?.value;
};

export const SEARCH_RESOURCE_CONFIG = {
  CrmPerson: {
    client: "crmPerson",
    resourceType: "crmPerson",
    resourceKind: "CRM Person",
    bulkWhere: { deleted: false },
    include: { emails: true, phones: true },
    build: (record) => {
      if (record.deleted) {
        return null;
      }
      const { emailList, phoneList } = personContactValues(record);
      return createSearchDocument("crmPerson", record, {
        title: record.name,
        subtitle: emailList[0] ?? phoneList[0],
        searchFields: [emailList, phoneList],
        resourceKind: "CRM Person",
      });
    },
  },
  TodoItem: {
    client: "todoItem",
    resourceType: "todo",
    resourceKind: "Todo",
    bulkWhere: { deleted: false },
    include: {},
    build: (record) => {
      if (record.deleted) {
        return null;
      }
      return createSearchDocument("todo", record, {
        title: record.title,
        description: record.content,
        searchFields: [record.status],
        resourceKind: "Todo Item",
      });
    },
  },
  MailingList: {
    client: "mailingList",
    resourceType: "mailingList",
    resourceKind: "Email List",
    bulkWhere: { deleted: false },
    include: {},
    build: (record) => {
      if (record.deleted) {
        return null;
      }
      return createSearchDocument("mailingList", record, {
        title: record.title,
        resourceKind: "Email List",
      });
    },
  },
  EmailTemplate: {
    client: "emailTemplate",
    resourceType: "emailTemplate",
    resourceKind: "Template",
    bulkWhere: { deleted: false },
    include: {},
    build: (record) => {
      if (record.deleted) {
        return null;
      }
      return createSearchDocument("emailTemplate", record, {
        title: record.name,
        description: record.textBody,
        searchFields: [record.subject],
        resourceKind: "Email Template",
      });
    },
  },
  Campaign: {
    client: "campaign",
    resourceType: "campaign",
    resourceKind: "Campaign",
    include: { mailingList: true },
    bulkWhere: {},
    build: (record) => {
      return createSearchDocument("campaign", record, {
        title: record.name,
        subtitle: record.mailingList?.title,
        resourceKind: "Campaign",
      });
    },
  },
  Registration: {
    client: "registration",
    resourceType: "registration",
    resourceKind: "Registration",
    include: {
      crmPerson: { include: { emails: true, phones: true } },
      team: true,
    },
    bulkWhere: { deleted: false },
    build: (record) => {
      if (record.deleted) {
        return null;
      }
      const linkedPerson = record.crmPerson;
      const { emailList, phoneList } = linkedPerson
        ? personContactValues(linkedPerson)
        : { emailList: [], phoneList: [] };
      const title = linkedPerson?.name ?? `Registration ${record.id}`;
      return createSearchDocument("registration", record, {
        title,
        subtitle: record.team?.name,
        description: linkedPerson?.name,
        searchFields: [emailList, phoneList],
        resourceKind: "Registration",
      });
    },
  },
  Team: {
    client: "team",
    resourceType: "team",
    resourceKind: "Team",
    include: {},
    bulkWhere: { deleted: false },
    build: (record) => {
      if (record.deleted) {
        return null;
      }
      return createSearchDocument("team", record, {
        title: record.name,
        subtitle: record.code,
        searchFields: [record.code],
        resourceKind: "Team",
      });
    },
  },
  UpsellItem: {
    client: "upsellItem",
    resourceType: "upsell",
    resourceKind: "Upsell",
    include: {},
    bulkWhere: { deleted: false },
    build: (record) => {
      if (record.deleted) {
        return null;
      }
      return createSearchDocument("upsell", record, {
        title: record.name,
        description: record.description,
        resourceKind: "Upsell",
      });
    },
  },
  Coupon: {
    client: "coupon",
    resourceType: "coupon",
    resourceKind: "Coupon",
    include: {},
    bulkWhere: { deleted: false },
    build: (record) => {
      if (record.deleted) {
        return null;
      }
      return createSearchDocument("coupon", record, {
        title: record.title,
        subtitle: record.code,
        searchFields: [record.code],
        resourceKind: "Coupon",
      });
    },
  },
  VolunteerRegistration: {
    client: "volunteerRegistration",
    resourceType: "volunteer",
    resourceKind: "Volunteer",
    include: {
      fieldResponses: { include: { field: true } },
      crmPersonLink: {
        include: {
          crmPerson: {
            include: { emails: true, phones: true },
          },
        },
      },
    },
    bulkWhere: { deleted: false },
    build: (record) => {
      if (record.deleted) {
        return null;
      }
      const linkedPerson = record.crmPersonLink?.crmPerson;
      const { emailList, phoneList } = linkedPerson
        ? personContactValues(linkedPerson)
        : { emailList: [], phoneList: [] };
      const responseValues = cleanList(
        record.fieldResponses?.map((response) => response.value)
      );
      return createSearchDocument("volunteer", record, {
        title: linkedPerson?.name ?? volunteerNameFromResponses(record.fieldResponses),
        subtitle: emailList[0],
        description: responseValues.slice(0, 3).join(" · ") || null,
        searchFields: [responseValues, emailList, phoneList],
        resourceKind: "Volunteer",
      });
    },
  },
  Job: {
    client: "job",
    resourceType: "job",
    resourceKind: "Job",
    include: { location: true },
    bulkWhere: { deleted: false },
    build: (record) => {
      if (record.deleted) {
        return null;
      }
      return createSearchDocument("job", record, {
        title: record.name,
        description: record.description,
        subtitle: record.location?.name,
        searchFields: [record.restrictions],
        resourceKind: "Job",
      });
    },
  },
  Location: {
    client: "location",
    resourceType: "location",
    resourceKind: "Location",
    include: {},
    bulkWhere: { deleted: false },
    build: (record) => {
      if (record.deleted) {
        return null;
      }
      return createSearchDocument("location", record, {
        title: record.name,
        description: record.description,
        searchFields: [record.address, record.city, record.state],
        resourceKind: "Location",
      });
    },
  },
};

export const INDEXABLE_MODELS = Object.keys(SEARCH_RESOURCE_CONFIG);
