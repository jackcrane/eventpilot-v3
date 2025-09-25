import React, { useMemo } from "react";
import { useCrmPersons } from "../../hooks/useCrmPersons";
import { useMailingListMembers } from "../../hooks/useMailingListMembers";
import { CrmPersonSelectorPanel } from "./CrmPersonSelectorPanel";

export const MailingListAddPeoplePanel = ({
  eventId,
  mailingListId,
  mailingListTitle,
  onClose,
  addMembers: providedAddMembers,
}) => {
  const { crmPersons = [], loading: crmLoading } = useCrmPersons({ eventId });
  const shouldFetchMembers = !providedAddMembers;
  const { addMembers: hookAddMembers } = useMailingListMembers({
    eventId,
    mailingListId: shouldFetchMembers ? mailingListId : undefined,
  });

  const addMembers = providedAddMembers || hookAddMembers;

  const items = useMemo(() => {
    return (crmPersons || []).map((person) => {
      const email =
        Array.isArray(person?.emails) && person.emails.length > 0
          ? person.emails[0]?.email
          : undefined;
      return {
        id: person.id,
        title: person.name || "Contact",
        subtitle: email || undefined,
      };
    });
  }, [crmPersons]);

  const handleSubmit = async (ids) => {
    const unique = Array.from(new Set(ids || [])).filter(Boolean);
    if (!unique.length || typeof addMembers !== "function") return false;
    const result = await addMembers({ crmPersonIds: unique });
    return Boolean(result);
  };

  return (
    <CrmPersonSelectorPanel
      title="CRM"
      heading={
        mailingListTitle
          ? `Add people to ${mailingListTitle}`
          : "Add people to mailing list"
      }
      searchPlaceholder="Search contacts by name or email"
      submitLabel="Add people"
      cancelLabel="Cancel"
      items={items}
      loading={crmLoading}
      initialSelectedIds={[]}
      onSubmit={handleSubmit}
      onCancel={onClose}
    />
  );
};

export default MailingListAddPeoplePanel;
