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

      const {
        originalname,
        mimetype,
        size: sizeRaw,
        location,
        key,
        contentType,
      } = req.file;
      // Resolve object size from S3 if needed
      let resolvedSize = Number(sizeRaw || 0);
      if (!(Number.isFinite(resolvedSize) && resolvedSize > 0) && key) {
        try {
          const { S3Client, HeadObjectCommand } = await import(
            "@aws-sdk/client-s3"
          );
          const s3 = new S3Client({
            credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
            region: process.env.AWS_REGION,
            endpoint: process.env.AWS_ENDPOINT,
          });
          const head = await s3.send(
            new HeadObjectCommand({ Bucket: process.env.AWS_BUCKET, Key: key })
          );
          const len = Number(head?.ContentLength || 0);
          if (Number.isFinite(len) && len > 0) resolvedSize = len;
        } catch (e) {
          console.warn(
            "[CRM notes file] Failed to HEAD object for size",
            { key },
            e
          );
        }
      }
      const userId = req.user?.id || null;

      // Persist file record
      const fileRow = await prisma.file.create({
        data: {
          userId,
          key,
          originalname,
          mimetype,
          contentType: contentType || mimetype,
          size: resolvedSize || 0,
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
      reportApiError(e, req);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
];
