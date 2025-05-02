import { upload } from "#file";
import { verifyAuth } from "#verifyAuth";

export const post = [
  verifyAuth(["manager"]),
  upload(),
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
