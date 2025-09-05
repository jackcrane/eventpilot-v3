import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { z } from "zod";
import { LogType } from "@prisma/client";

const createNoteSchema = z.object({
  text: z.string().min(1, "Note cannot be empty").max(5000),
});

const mapLogToNote = (log) => {
  if (!log) return null;
  if (log.type === LogType.CRM_FILE_NOTE_CREATED) {
    return {
      id: log.id,
      type: "file",
      userId: log.userId,
      createdAt: log.createdAt,
      file: {
        id: log?.data?.fileId,
        name: log?.data?.originalname,
        mimetype: log?.data?.mimetype,
        url: log?.data?.location,
      },
    };
  }
  if (log.type === LogType.CRM_NOTE_CREATED) {
    return {
      id: log.id,
      type: "text",
      userId: log.userId,
      createdAt: log.createdAt,
      text: log?.data?.text ?? "",
    };
  }
  return null;
};

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { personId } = req.params;
    try {
      const logs = await prisma.logs.findMany({
        where: {
          crmPersonId: personId,
          type: {
            in: [LogType.CRM_NOTE_CREATED, LogType.CRM_FILE_NOTE_CREATED],
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const notes = logs.map(mapLogToNote).filter(Boolean);
      return res.json({ notes });
    } catch (e) {
      console.error("[NOTES][GET] Error:", e);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
];

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, personId } = req.params;
    try {
      const parsed = createNoteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }

      // Ensure CRM person exists and is not deleted
      const person = await prisma.crmPerson.findUnique({
        where: { id: personId },
        select: { id: true, deleted: true },
      });
      if (!person || person.deleted) {
        return res.status(404).json({ message: "Person not found" });
      }

      const log = await prisma.logs.create({
        data: {
          type: LogType.CRM_NOTE_CREATED,
          crmPersonId: personId,
          userId: req.user.id,
          ip: req.ip || req.headers["x-forwarded-for"],
          data: { text: parsed.data.text },
          eventId,
        },
      });

      return res.json({ note: mapLogToNote(log) });
    } catch (e) {
      console.error("[NOTES][POST] Error:", e);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
];
