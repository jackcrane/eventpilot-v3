import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

export const get = [
  // Allow unauthenticated; validate via JWT state
  verifyAuth([], true),
  async (req, res) => {
    const { eventId } = req.params;
    const { code, state } = req.query || {};

    const baseApp = (
      process.env.BASE_APP_URL || "http://localhost:5173"
    ).startsWith("http")
      ? process.env.BASE_APP_URL
      : `http://${process.env.BASE_APP_URL}`;

    const redirectSuccess = `${baseApp}/events/${eventId}/settings?gmailConnected=1`;
    const redirectError = `${baseApp}/events/${eventId}/settings?gmailError=1`;

    try {
      if (!code || !state) return res.redirect(redirectError);

      let decoded;
      try {
        decoded = jwt.verify(state, process.env.JWT_SECRET);
      } catch (e) {
        return res.redirect(redirectError);
      }

      if (decoded?.eventId !== eventId) return res.redirect(redirectError);

      const baseServer = (
        process.env.BASE_SERVER_URL || "http://localhost:3000"
      ).startsWith("http")
        ? process.env.BASE_SERVER_URL
        : `http://${process.env.BASE_SERVER_URL}`;
      const redirectUri = `${baseServer}/api/events/${eventId}/gmail/callback`;

      // Exchange code for tokens
      const body = new URLSearchParams({
        code: String(code),
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
        client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      });

      const tokenRes = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      if (!tokenRes.ok) {
        console.error("Google token exchange failed", await tokenRes.text());
        return res.redirect(redirectError);
      }

      const tokenJson = await tokenRes.json();
      const {
        access_token: accessToken,
        refresh_token: refreshToken,
        scope,
        token_type: tokenType,
        expires_in: expiresIn,
      } = tokenJson;

      if (!accessToken) return res.redirect(redirectError);

      // Fetch user info for email/id
      const userInfoRes = await fetch(USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!userInfoRes.ok) {
        console.error("Failed to fetch userinfo", await userInfoRes.text());
        return res.redirect(redirectError);
      }
      const userinfo = await userInfoRes.json();

      const googleUserId = String(userinfo?.id || userinfo?.sub || "");
      const email = String(userinfo?.email || "");
      if (!googleUserId || !email) return res.redirect(redirectError);

      const tokenExpiry = expiresIn
        ? new Date(Date.now() + Number(expiresIn) * 1000)
        : null;

      await prisma.gmailConnection.upsert({
        where: { eventId },
        update: {
          googleUserId,
          email,
          accessToken,
          refreshToken: refreshToken || undefined,
          scope,
          tokenType,
          tokenExpiry,
          createdById: decoded?.userId || undefined,
        },
        create: {
          eventId,
          createdById: decoded?.userId || undefined,
          googleUserId,
          email,
          accessToken,
          refreshToken: refreshToken || "",
          scope,
          tokenType,
          tokenExpiry,
        },
      });

      // Also set the event's external contact email to the connected Gmail address
      try {
        await prisma.event.update({
          where: { id: eventId },
          data: {
            externalContactEmail: email,
            // Ensure legacy hosted field is off so computed values use externalContactEmail
            useHostedEmail: false,
          },
        });
      } catch (e) {
        console.error("Failed to update event contact email after Gmail connect", e);
      }

      return res.redirect(redirectSuccess);
    } catch (e) {
      console.error(e);
      return res.redirect(redirectError);
    }
  },
];
