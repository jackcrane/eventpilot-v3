import toast from "react-hot-toast";

const openTab = (path, target = "_self") => {
  if (!path) {
    return;
  }
  window.open(path, target, "noreferrer");
};

const MODEL_HANDLERS = {
  crmPerson: ({ eventId, resourceId }) => {
    if (!eventId || !resourceId) {
      toast.error("Unable to open CRM person");
      return;
    }
    openTab(`/events/${eventId}/crm/${resourceId}`);
  },
  volunteer: () => {
    toast("No action supported");
  },
  todo: ({ eventId, resourceId }) => {
    if (!eventId) {
      toast.error("Unable to open todo");
      return;
    }
    openTab(`/events/${eventId}/todos?todo=${resourceId ?? ""}`);
  },
};

export const handleSearchResultNavigation = ({ result, eventId }) => {
  if (!result) {
    return;
  }
  const handler = MODEL_HANDLERS[result.resourceType];
  if (!handler) {
    toast("No action supported");
    return;
  }
  handler({ eventId, resourceId: result.resourceId, result });
};
