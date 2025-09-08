import { upload } from "#file";
import { verifyAuth } from "#verifyAuth";

// Unrestricted file upload endpoint for contexts like Todo comments.
// Keeps default `/api/file` restrictive for images, while this accepts any mimetype.
export const post = [
  verifyAuth(["manager"]),
  upload({ allowAll: true }),
  async (req, res) => {
    const file = req.file;
    const fileLog = req.fileLog;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    res.json({
      message: "File uploaded successfully",
      url: file.location,
      fileId: fileLog.id,
    });
  },
];

