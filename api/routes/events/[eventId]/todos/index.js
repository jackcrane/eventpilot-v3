import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { z } from "zod";
import { LogType, TodoItemStatus } from "@prisma/client";
import { zerialize } from "zodex";

// Shared schema for creating/updating a todo item
export const todoSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional().default(""),
  status: z.nativeEnum(TodoItemStatus).optional(),

  // Optional links to other resources
  volunteerRegistrationId: z.string().optional().nullable(),
  participantRegistrationId: z.string().optional().nullable(),
  sessionId: z.string().optional().nullable(),
  conversationId: z.string().optional().nullable(),
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
      const parsed = todoSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: serializeError(parsed) });
      }

      const data = parsed.data;

      const todo = await prisma.todoItem.create({
        data: {
          title: data.title,
          content: data.content ?? "",
          status: data.status,
          volunteerRegistration: data.volunteerRegistrationId && {
            connect: { id: data.volunteerRegistrationId },
          },
          participantRegistration: data.participantRegistrationId && {
            connect: { id: data.participantRegistrationId },
          },
          session: data.sessionId && {
            connect: { id: data.sessionId },
          },
          conversation: data.conversationId && {
            connect: { id: data.conversationId },
          },
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
    return res.json(zerialize(todoSchema));
  },
];
