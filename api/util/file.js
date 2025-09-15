import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import cuid from "cuid";
import multer from "multer";
import multerS3 from "multer-s3";
import dotenv from "dotenv";
dotenv.config();
import { prisma } from "#prisma";

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT,
});

export const rawUpload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET,
    key: (req, file, cb) => {
      cb(null, `${process.env.PROJECT_NAME}/${cuid()}${file.originalname}`);
    },
    acl: "public-read",
  }),
});

export const upload =
  ({
    fieldName = "files",
    maxFileSize = 5 * 1024 * 1024, // Default 5MB
    allowedMimeTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"],
    allowAll = false, // when true, accept any mimetype
  } = {}) =>
  (req, res, next) => {
    const dynamicUpload = multer({
      storage: multerS3({
        s3,
        bucket: process.env.AWS_BUCKET,
        key: (req, file, cb) => {
          cb(null, `${process.env.PROJECT_NAME}/${cuid()}${file.originalname}`);
        },
        acl: "public-read",
      }),
      limits: { fileSize: maxFileSize },
      fileFilter: (req, file, cb) => {
        if (allowAll === true) {
          cb(null, true);
          return;
        }
        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          return cb(
            new Error(
              `Invalid file type. Allowed: ${allowedMimeTypes.join(", ")}`
            )
          );
        }
      },
    });

    dynamicUpload.single(fieldName)(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }

      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded." });
      }

      try {
        const {
          originalname,
          mimetype,
          size: sizeRaw,
          location,
          key,
          contentType,
        } = req.file;
        const userId = req.user?.id || null;

        // Resolve accurate object size from S3 if multer didn't provide it
        let resolvedSize = Number(sizeRaw || 0);
        if (!(Number.isFinite(resolvedSize) && resolvedSize > 0) && key) {
          try {
            const head = await s3.send(
              new HeadObjectCommand({
                Bucket: process.env.AWS_BUCKET,
                Key: key,
              })
            );
            const len = Number(head?.ContentLength || 0);
            if (Number.isFinite(len) && len > 0) resolvedSize = len;
          } catch (e) {
            console.warn("[upload] Failed to HEAD object for size", { key }, e);
          }
        }

        req.fileLog = await prisma.file.create({
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

        next();
      } catch (error) {
        console.error("Error logging file upload:", error);
        return res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    });
  };

export const uploadFile = async ({
  file, // base64 string
  name, // file name
  contentType, // file content type
  contentLength, // optional; will be ignored if wrong
  inboundEmailAttachmentId,
}) => {
  // If there’s any chance of base64url input, normalize first:
  const normalizeB64 = (s) => {
    let t = s.replace(/-/g, "+").replace(/_/g, "/");
    const pad = t.length % 4;
    return pad ? t + "=".repeat(4 - pad) : t;
  };

  const normalized = normalizeB64(file);
  const buffer = Buffer.from(normalized, "base64");
  const byteLen = buffer.length;

  // If a caller sent a wrong length, ignore it (or throw)
  if (Number.isFinite(contentLength) && contentLength !== byteLen) {
    // Option A: ignore and proceed with correct length
    // Option B (stricter): throw new Error(`ContentLength mismatch: got ${contentLength}, expected ${byteLen}`);
  }

  const key = `${process.env.PROJECT_NAME}/${cuid()}-${name}`; // safer than inserting an extra '.'

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ContentLength: byteLen, // always correct
    ACL: "public-read",
  });

  await s3.send(command);

  const uploadedFile = await prisma.file.create({
    data: {
      key,
      originalname: name,
      mimetype: contentType,
      contentType,
      size: byteLen,
      location: `${process.env.AWS_ENDPOINT}/${process.env.AWS_BUCKET}/${key}`,
      inboundEmailAttachmentId,
    },
  });

  return uploadedFile;
};
