import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { LogType } from "@prisma/client";
import { zerialize } from "zodex";
import { todoUpdateSchema } from "../index.js";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const todo = await prisma.todoItem.findUnique({
        where: {
          id: req.params.todoId,
          eventId: req.params.eventId,
          deleted: false,
        },
        include: {
          comments: {
            include: { files: true },
            orderBy: { createdAt: "desc" },
          },
          logs: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!todo) return res.status(404).json({ message: "Not found" });
      res.json({ todo });
    } catch (e) {
      console.error("[TODO][GET] Error:", e);
      res.status(500).json({ message: "Error" });
    }
  },
];

export const put = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const existing = await prisma.todoItem.findUnique({
        where: {
          id: req.params.todoId,
          eventId: req.params.eventId,
          deleted: false,
        },
      });
      if (!existing) return res.status(404).json({ message: "Not found" });

      const parsed = todoUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: serializeError(parsed) });
      }

      const data = parsed.data;
      // Determine if status actually changes
      const statusChanged =
        typeof data.status !== "undefined" && data.status !== existing.status;
      // Determine if there are any non-status updates being requested
      const hasNonStatusChanges =
        typeof data.title !== "undefined" ||
        typeof data.content !== "undefined" ||
        Array.isArray(data.volunteerRegistrationIds) ||
        Array.isArray(data.participantRegistrationIds) ||
        Array.isArray(data.sessionIds) ||
        Array.isArray(data.conversationIds) ||
        Array.isArray(data.crmPersonIds);

      // Build update data explicitly to support M:N set operations
      const updateData = {
        ...(typeof data.title !== "undefined" ? { title: data.title } : {}),
        ...(typeof data.content !== "undefined" ? { content: data.content } : {}),
        ...(typeof data.status !== "undefined" ? { status: data.status } : {}),
        ...(Array.isArray(data.volunteerRegistrationIds)
          ? {
              VolunteerRegistration: {
                set: data.volunteerRegistrationIds.map((id) => ({ id })),
              },
            }
          : {}),
        ...(Array.isArray(data.participantRegistrationIds)
          ? {
              Registration: {
                set: data.participantRegistrationIds.map((id) => ({ id })),
              },
            }
          : {}),
        ...(Array.isArray(data.sessionIds)
          ? { Session: { set: data.sessionIds.map((id) => ({ id })) } }
          : {}),
        ...(Array.isArray(data.conversationIds)
          ? {
              Conversation: {
                set: data.conversationIds.map((id) => ({ id })),
              },
            }
          : {}),
        ...(Array.isArray(data.crmPersonIds)
          ? {
              CrmPerson: {
                set: data.crmPersonIds.map((id) => ({ id })),
              },
            }
          : {}),
        // Only log a generic UPDATE if fields other than status changed.
        // If the only change is status, log just the STATUS_CHANGED entry.
        logs: {
          create: [
            ...(hasNonStatusChanges
              ? [
                  {
                    type: LogType.TODO_ITEM_UPDATED,
                    userId: req.user.id,
                    ip: req.ip || req.headers["x-forwarded-for"],
                    data,
                  },
                ]
              : []),
            ...(statusChanged
              ? [
                  {
                    type: LogType.TODO_ITEM_STATUS_CHANGED,
                    userId: req.user.id,
                    ip: req.ip || req.headers["x-forwarded-for"],
                    data: { from: existing.status, to: data.status },
                  },
                ]
              : []),
          ],
        },
      };

      const updated = await prisma.todoItem.update({
        where: { id: req.params.todoId },
        data: updateData,
        include: {
          comments: {
            include: { files: true },
            orderBy: { createdAt: "desc" },
          },
          logs: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      res.json({ todo: updated });
    } catch (e) {
      console.error("[TODO][PUT] Error:", e);
      res.status(500).json({ message: "Error" });
    }
  },
];

export const del = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const existing = await prisma.todoItem.findUnique({
        where: {
          id: req.params.todoId,
          eventId: req.params.eventId,
          deleted: false,
        },
      });
      if (!existing) return res.status(404).json({ message: "Not found" });

      await prisma.$transaction([
        prisma.logs.create({
          data: {
            type: LogType.TODO_ITEM_DELETED,
            userId: req.user.id,
            ip: req.ip || req.headers["x-forwarded-for"],
            data: { id: existing.id, title: existing.title },
            todoItemId: existing.id,
          },
        }),
        prisma.todoItem.update({
          where: { id: existing.id },
          data: { deleted: true },
        }),
      ]);

      res.json({ ok: true });
    } catch (e) {
      console.error("[TODO][DEL] Error:", e);
      res.status(500).json({ message: "Error" });
    }
  },
];

export const query = [
  (req, res) => {
    return res.json(zerialize(todoUpdateSchema));
  },
];
