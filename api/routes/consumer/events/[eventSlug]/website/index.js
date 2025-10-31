import { prisma } from "#prisma";
import {
  extractWebsitePage,
  listAvailableRouteKeys,
  normalizeRouteKeyInput,
} from "#util/websitePages.js";

const getRequestedRouteKey = (req) => {
  const { routeKey } = req.query || {};
  const candidate =
    typeof routeKey === "string"
      ? routeKey
      : Array.isArray(routeKey)
        ? routeKey[0]
        : null;
  return normalizeRouteKeyInput(candidate);
};

const fetchEventBySlug = async (eventSlug) => {
  if (!eventSlug || typeof eventSlug !== "string") return null;
  return prisma.event.findFirst({
    where: {
      OR: [{ id: eventSlug }, { slug: eventSlug }],
    },
    select: {
      id: true,
      name: true,
      websitePages: true,
    },
  });
};

export const get = async (req, res) => {
  const { eventSlug } = req.params;
  const requestedRouteKey = getRequestedRouteKey(req);
  const event = await fetchEventBySlug(eventSlug);

  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  const { pages, routeKey, pageData } = extractWebsitePage(
    event.websitePages,
    requestedRouteKey
  );
  const availableRouteKeys = listAvailableRouteKeys(pages, routeKey);

  return res.json({
    event: {
      id: event.id,
      name: event.name,
    },
    websitePage: {
      routeKey,
      data: pageData,
    },
    availableRouteKeys,
  });
};
