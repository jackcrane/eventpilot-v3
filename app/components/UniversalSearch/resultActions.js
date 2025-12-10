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
  volunteer: ({ actions, eventId, resourceId, result }) => {
    if (actions?.openVolunteer) {
      actions.openVolunteer({ eventId, resourceId, result });
      return;
    }
    toast("No action supported");
  },
  team: ({ actions, eventId, resourceId, result }) => {
    if (actions?.openTeam) {
      actions.openTeam({ eventId, resourceId, result });
      return;
    }
    toast("No action supported");
  },
  upsell: ({ actions, eventId, resourceId, result }) => {
    if (actions?.openUpsell) {
      actions.openUpsell({ eventId, resourceId, result });
      return;
    }
    toast("No action supported");
  },
  coupon: ({ actions, eventId, resourceId, result }) => {
    if (actions?.openCoupon) {
      actions.openCoupon({ eventId, resourceId, result });
      return;
    }
    toast("No action supported");
  },
  email: ({ actions, eventId, resourceId, result }) => {
    if (actions?.openEmail && resourceId) {
      actions.openEmail({ resourceId });
      return;
    }
    const conversationId = result?.conversationId;
    if (!eventId || !conversationId) {
      toast.error("Unable to open conversation");
      return;
    }
    openTab(`/events/${eventId}/conversations/${conversationId}`);
  },
  todo: ({ actions, eventId, resourceId, result }) => {
    if (actions?.openTodo) {
      actions.openTodo({ eventId, resourceId, result });
      return;
    }
    toast("No action supported");
  },
};

export const handleSearchResultNavigation = ({ result, eventId, actions }) => {
  if (!result) {
    return;
  }
  const handler = MODEL_HANDLERS[result.resourceType];
  if (!handler) {
    toast("No action supported");
    return;
  }
  handler({ eventId, resourceId: result.resourceId, result, actions });
};
