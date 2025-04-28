import { upload } from "#file";
import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";

export const post = [
  verifyAuth(["instructor", "dispatcher", "manager"]),
  upload(),
  async (req, res) => {
    const file = req.file;
    console.log(file);
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    res.json({ message: "File uploaded successfully", url: file.location });
  },
];
