import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { z } from "zod";
import { LogType } from "@prisma/client";

// Allow either text OR at least one file
const commentSchema = z
  .object({
    text: z.string().optional().default(""),
    fileIds: z.array(z.string()).optional().default([]),
  })
  .refine((d) => d.text.trim().length > 0 || (Array.isArray(d.fileIds) && d.fileIds.length > 0), {
    message: "Comment must include text or at least one file",
  });

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const todo = await prisma.todoItem.findUnique({
        where: { id: req.params.todoId, eventId: req.params.eventId },
      });
      if (!todo) return res.status(404).json({ message: "Todo not found" });

      const comments = await prisma.todoItemComment.findMany({
        where: { todoItemId: req.params.todoId },
        include: { files: true },
        orderBy: { createdAt: "desc" },
      });

      res.json({ comments });
    } catch (e) {
      console.error("[TODO][COMMENTS][GET] Error:", e);
      res.status(500).json({ message: "Error" });
    }
  },
];

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const todo = await prisma.todoItem.findUnique({
        where: { id: req.params.todoId },
      });
      if (!todo) return res.status(404).json({ message: "Todo not found" });

      const parsed = commentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: serializeError(parsed) });
      }

      const { text = "", fileIds = [] } = parsed.data;

      const comment = await prisma.todoItemComment.create({
        data: {
          todoItemId: todo.id,
          text,
        },
      });

      // Associate uploaded files (if any) with this comment
      if (fileIds.length) {
        await prisma.file.updateMany({
          where: { id: { in: fileIds } },
          data: { todoItemCommentId: comment.id },
        });
      }

      await prisma.logs.create({
        data: {
          type: LogType.TODO_ITEM_COMMENT_CREATED,
          userId: req.user.id,
          ip: req.ip || req.headers["x-forwarded-for"],
          data: { text, fileIds },
          todoItemId: todo.id,
        },
      });

      const full = await prisma.todoItemComment.findUnique({
        where: { id: comment.id },
        include: { files: true },
      });

      res.json({ comment: full });
    } catch (e) {
      console.error("[TODO][COMMENTS][POST] Error:", e);
      res.status(500).json({ message: "Error" });
    }
  },
];
