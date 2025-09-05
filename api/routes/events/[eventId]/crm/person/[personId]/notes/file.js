import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { LogType } from "@prisma/client";
import { rawUpload } from "#file";

// Accept any file type; use rawUpload and then persist in DB
export const post = [
  verifyAuth(["manager"]),
  rawUpload.single("file"),
  async (req, res) => {
    const { eventId, personId } = req.params;
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Ensure CRM person exists and is not deleted
      const person = await prisma.crmPerson.findUnique({
        where: { id: personId },
        select: { id: true, deleted: true },
      });
      if (!person || person.deleted) {
        return res.status(404).json({ message: "Person not found" });
      }

      const { originalname, mimetype, size, location, key, contentType } =
        req.file;
      const userId = req.user?.id || null;

      // Persist file record
      const fileRow = await prisma.file.create({
        data: {
          userId,
          key,
          originalname,
          mimetype,
          contentType: contentType || mimetype,
          size,
          location,
        },
      });

      // Log against CRM person
      const log = await prisma.logs.create({
        data: {
          type: LogType.CRM_FILE_NOTE_CREATED,
          crmPersonId: personId,
          userId,
          ip: req.ip || req.headers["x-forwarded-for"],
          data: {
            fileId: fileRow.id,
            originalname: fileRow.originalname,
            mimetype: fileRow.mimetype,
            location: fileRow.location,
          },
          eventId,
        },
      });

      return res.json({
        note: {
          id: log.id,
          type: "file",
          userId,
          createdAt: log.createdAt,
          file: {
            id: fileRow.id,
            name: fileRow.originalname,
            mimetype: fileRow.mimetype,
            url: fileRow.location,
          },
        },
      });
    } catch (e) {
      console.error("[NOTES][FILE][POST] Error:", e);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
];
