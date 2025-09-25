import { useMemo } from "react";
import { useMailingListMembers } from "./useMailingListMembers";

export { MAILING_LIST_MEMBER_STATUSES } from "./useMailingListMembers";

export const useMailingListMember = (
  { eventId, mailingListId, crmPersonId } = {}
) => {
  const {
    members,
    memberSchemas,
    loading,
    error,
    refetch,
    addMember,
    updateMemberStatus,
    removeMember,
  } = useMailingListMembers({ eventId, mailingListId });

  const member = useMemo(() => {
    if (!crmPersonId) return null;
    return (
      members?.find((m) => m.crmPersonId === crmPersonId) ||
      members?.find((m) => m.crmPerson?.id === crmPersonId) ||
      null
    );
  }, [members, crmPersonId]);

  const ensureId = () => {
    if (!crmPersonId) {
      return false;
    }
    return true;
  };

  const addToList = async (extra = {}) => {
    if (!ensureId()) return false;
    return addMember({ crmPersonId, ...extra });
  };

  const updateStatus = async (status) => {
    if (!ensureId()) return false;
    return updateMemberStatus({ crmPersonId, status });
  };

  const removeFromList = async () => {
    if (!ensureId()) return false;
    return removeMember({ crmPersonId });
  };

  return {
    member,
    loading,
    error,
    refetch,
    schemas: memberSchemas,
    addToList,
    updateStatus,
    removeFromList,
  };
};
