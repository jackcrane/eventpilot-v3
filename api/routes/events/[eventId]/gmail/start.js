import jwt from "jsonwebtoken";
import { verifyAuth } from "#verifyAuth";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
// Request top-level Gmail scope for widest permissions
const SCOPES = ["openid", "email", "https://mail.google.com/"];

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const { eventId } = req.params;

      const baseServer = (
        process.env.BASE_SERVER_URL || "http://localhost:3000"
      ).startsWith("http")
        ? process.env.BASE_SERVER_URL
        : `http://${process.env.BASE_SERVER_URL}`;
      // Use static redirect uri under webhooks so Google console only needs one URI
      const redirectUri = `${baseServer}/api/webhooks/google-oauth`;

      const state = jwt.sign(
        { eventId, userId: req.user?.id, ts: Date.now() },
        process.env.JWT_SECRET,
        { expiresIn: "10m" }
      );

      const params = new URLSearchParams({
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: SCOPES.join(" "),
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
        state,
      });

      const url = `${GOOGLE_AUTH_URL}?${params.toString()}`;
      return res.status(200).json({ url });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];
