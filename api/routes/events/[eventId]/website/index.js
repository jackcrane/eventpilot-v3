import { z } from "zod";
import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { serializeError } from "#serializeError";
import {
  extractWebsitePage,
  listAvailableRouteKeys,
  normalizeRouteKeyInput,
  upsertWebsitePage,
} from "#util/websitePages.js";

const routeKeySchema = z.string().trim().min(1).max(100);

const websitePageSchema = z.object({
  routeKey: routeKeySchema,
  data: z
    .object({
      content: z.array(z.any()).optional(),
      root: z.record(z.any()).optional(),
      zones: z.record(z.any()).optional(),
    })
    .passthrough()
    .default({}),
});

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

const fetchEventForRequest = async (req) => {
  return prisma.event.findFirst({
    where: {
      userId: req.user.id,
      OR: [{ id: req.params.eventId }, { slug: req.params.eventId }],
    },
    select: {
      id: true,
      websitePages: true,
    },
  });
};

export const get = [
  verifyAuth(["manager"], true),
  async (req, res) => {
    const requestedRouteKey = getRequestedRouteKey(req);
    const event = await fetchEventForRequest(req);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    console.log("[website#get] raw event websitePages", {
      eventId: event.id,
      requestedRouteKey,
      type: event.websitePages == null ? "null" : typeof event.websitePages,
      keys:
        event.websitePages && typeof event.websitePages === "object"
          ? Object.keys(event.websitePages)
          : null,
      value: event.websitePages,
    });

    const { pages, routeKey, pageData } = extractWebsitePage(
      event.websitePages,
      requestedRouteKey
    );
    const availableRouteKeys = listAvailableRouteKeys(pages, routeKey);

    console.log("[website#get] normalized websitePages result", {
      eventId: event.id,
      routeKey,
      availableRouteKeys,
      pageKeys: Object.keys(pages || {}),
      pageData,
    });

    return res.json({
      websitePage: {
        routeKey,
        data: pageData,
      },
      availableRouteKeys,
    });
  },
];

export const put = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const parsed = websitePageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: serializeError(parsed) });
    }

    const event = await fetchEventForRequest(req);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const { routeKey, data } = parsed.data;
    const {
      pages: updatedPages,
      routeKey: sanitizedRouteKey,
      draft: sanitizedData,
    } = upsertWebsitePage(event.websitePages, routeKey, data);
    const availableRouteKeys = listAvailableRouteKeys(
      updatedPages,
      sanitizedRouteKey
    );

    await prisma.event.update({
      where: { id: event.id },
      data: {
        websitePages: updatedPages,
      },
    });

    return res.json({
      websitePage: {
        routeKey: sanitizedRouteKey,
        data: sanitizedData,
      },
      availableRouteKeys,
    });
  },
];
