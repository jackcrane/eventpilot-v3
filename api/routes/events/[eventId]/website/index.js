import { z } from "zod";
import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { serializeError } from "#serializeError";

const routeKeySchema = z.string().min(1).max(100);

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
  const parsed = routeKeySchema.safeParse(candidate ?? "home");
  return parsed.success ? parsed.data : "home";
};

const coerceWebsitePages = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value;
};

const sanitizeForJson = (value) => JSON.parse(JSON.stringify(value ?? {}));

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
    const routeKey = getRequestedRouteKey(req);
    const event = await fetchEventForRequest(req);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const pages = coerceWebsitePages(event.websitePages);
    const pageData = pages[routeKey] ?? null;

    return res.json({
      websitePage: {
        routeKey,
        data: pageData,
      },
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
    const sanitizedData = sanitizeForJson(data);
    const pages = coerceWebsitePages(event.websitePages);

    const updatedPages = {
      ...pages,
      [routeKey]: sanitizedData,
    };

    await prisma.event.update({
      where: { id: event.id },
      data: {
        websitePages: updatedPages,
      },
    });

    return res.json({
      websitePage: {
        routeKey,
        data: sanitizedData,
      },
    });
  },
];
