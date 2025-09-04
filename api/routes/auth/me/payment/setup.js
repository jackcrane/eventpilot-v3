import { verifyAuth } from "#verifyAuth";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    return res
      .status(400)
      .json({ message: "User-level payment setup disabled" });
  },
];
