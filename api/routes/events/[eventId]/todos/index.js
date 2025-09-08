import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { z } from "zod";
import { LogType, TodoItemStatus } from "@prisma/client";
import { zerialize } from "zodex";

// Create schema: used for POST on collection
export const todoCreateSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional().default(""),
  status: z.nativeEnum(TodoItemStatus).optional(),

  // Optional links to other resources (many-to-many)
  volunteerRegistrationIds: z.array(z.string()).optional(),
  participantRegistrationIds: z.array(z.string()).optional(),
  sessionIds: z.array(z.string()).optional(),
  conversationIds: z.array(z.string()).optional(),
  crmPersonIds: z.array(z.string()).optional(),
});

// Update schema: all fields optional, no defaults applied to avoid unintended overwrites
export const todoUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  status: z.nativeEnum(TodoItemStatus).optional(),

  // When provided, these replace the full set
  volunteerRegistrationIds: z.array(z.string()).optional(),
  participantRegistrationIds: z.array(z.string()).optional(),
  sessionIds: z.array(z.string()).optional(),
  conversationIds: z.array(z.string()).optional(),
  crmPersonIds: z.array(z.string()).optional(),
});

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const todos = await prisma.todoItem.findMany({
        where: {
          deleted: false,
          eventId: req.params.eventId,
        },
        include: {
          comments: true,
          // Return associated volunteers (ids only) for lightweight hydration
          VolunteerRegistration: { select: { id: true } },
          Registration: { select: { id: true } },
          CrmPerson: { select: { id: true } },
        },
        orderBy: { updatedAt: "desc" },
      });

      res.json({
        todos,
      });
    } catch (e) {
      console.error("[TODOS][GET] Error:", e);
      res.status(500).json({ message: "Error" });
    }
  },
];

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const parsed = todoCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: serializeError(parsed) });
      }

      const data = parsed.data;

      const todo = await prisma.todoItem.create({
        data: {
          title: data.title,
          content: data.content ?? "",
          status: data.status,
          ...(Array.isArray(data.volunteerRegistrationIds) &&
          data.volunteerRegistrationIds.length
            ? {
                VolunteerRegistration: {
                  connect: data.volunteerRegistrationIds.map((id) => ({ id })),
                },
              }
            : {}),
          ...(Array.isArray(data.participantRegistrationIds) &&
          data.participantRegistrationIds.length
            ? {
                Registration: {
                  connect: data.participantRegistrationIds.map((id) => ({
                    id,
                  })),
                },
              }
            : {}),
          ...(Array.isArray(data.sessionIds) && data.sessionIds.length
            ? {
                Session: {
                  connect: data.sessionIds.map((id) => ({ id })),
                },
              }
            : {}),
          ...(Array.isArray(data.conversationIds) && data.conversationIds.length
            ? {
                Conversation: {
                  connect: data.conversationIds.map((id) => ({ id })),
                },
              }
            : {}),
          ...(Array.isArray(data.crmPersonIds) && data.crmPersonIds.length
            ? {
                CrmPerson: {
                  connect: data.crmPersonIds.map((id) => ({ id })),
                },
              }
            : {}),
          event: { connect: { id: req.params.eventId } },
          logs: {
            create: {
              type: LogType.TODO_ITEM_CREATED,
              userId: req.user.id,
              ip: req.ip || req.headers["x-forwarded-for"],
              data,
            },
          },
        },
        include: {
          comments: true,
          VolunteerRegistration: { select: { id: true } },
          Registration: { select: { id: true } },
          CrmPerson: { select: { id: true } },
        },
      });

      res.json({ todo });
    } catch (e) {
      console.error("[TODOS][POST] Error:", e);
      res.status(500).json({ message: "Error" });
    }
  },
];

export const query = [
  (req, res) => {
    return res.json(zerialize(todoCreateSchema));
  },
];
