import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { LogType } from "@prisma/client";
import { zerialize } from "zodex";
import { todoSchema as todoUpdateSchema } from "../index.js";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const todo = await prisma.todoItem.findUnique({
        where: { id: req.params.todoId, eventId: req.event.id, deleted: false },
        include: {
          comments: {
            include: { files: true },
            orderBy: { createdAt: "desc" },
          },
          logs: true,
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
        where: { id: req.params.todoId, eventId: req.event.id, deleted: false },
      });
      if (!existing) return res.status(404).json({ message: "Not found" });

      const parsed = todoUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: serializeError(parsed) });
      }

      const data = parsed.data;
      let statusChanged = false;
      if (
        typeof data.status !== "undefined" &&
        data.status !== existing.status
      ) {
        statusChanged = true;
      }

      const updated = await prisma.todoItem.update({
        where: { id: req.params.todoId },
        data: {
          ...data,
          logs: {
            create: [
              {
                type: LogType.TODO_ITEM_UPDATED,
                userId: req.user.id,
                ip: req.ip || req.headers["x-forwarded-for"],
                data,
              },
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
        },
        include: {
          comments: {
            include: { files: true },
            orderBy: { createdAt: "desc" },
          },
          logs: true,
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
        where: { id: req.params.todoId, eventId: req.event.id, deleted: false },
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
