import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "#index";
import { prisma } from "#prisma";
import { tc } from "#setup";

describe("/auth/verify", () => {
  describe("GET", () => {
    it("Verifies a user's email with link", async () => {
      const emailVerification = await prisma.emailVerification.create({
        data: {
          userId: tc.user.id,
          active: true,
        },
      });

      const res = await request(app).get(
        `/api/auth/verify?token=${emailVerification.id}`
      );
      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();

      const updatedVerification = await prisma.emailVerification.findFirst({
        where: {
          id: emailVerification.id,
        },
      });

      expect(updatedVerification.active).toBe(false);

      const user = await prisma.user.findFirst({
        where: {
          id: tc.user.id,
        },
      });

      expect(user.emailVerified).toBe(true);
    });

    it("Returns a 400 error for an invalid token", async () => {
      const res = await request(app).get("/api/auth/verify?token=invalid");
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid token");
      expect(res.body.token).toBeFalsy();
    });

    it("Returns a 400 for an expired token", async () => {
      const emailVerification = await prisma.emailVerification.create({
        data: {
          userId: tc.user.id,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        },
      });

      const res = await request(app).get(
        `/api/auth/verify?token=${emailVerification.id}`
      );
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Token expired");
      expect(res.body.token).toBeFalsy();
    });

    it("Returns 400 for a token that has already been used", async () => {
      const emailVerification = await prisma.emailVerification.create({
        data: {
          userId: tc.user.id,
          active: false,
        },
      });

      const res = await request(app).get(
        `/api/auth/verify?token=${emailVerification.id}`
      );
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid token");
      expect(res.body.token).toBeFalsy();
    });

    it("Returns 500 for an internal server error", async () => {
      const res = await request(app)
        .get("/api/auth/verify?token=invalid")
        .set({ forceError: true });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Internal server error");
      expect(res.body.token).toBeFalsy();
    });
  });
});
