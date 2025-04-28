import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "#index";
import { prisma } from "#prisma";
import { sendEmail } from "#postmark";
import { tc } from "#setup";
import bcrypt from "bcrypt";

describe("/auth/reset-password", () => {
  describe("PUT", () => {
    it("Fires a password reset email", async () => {
      const res = await request(app).put("/api/auth/reset-password").send({
        email: "test@email.com",
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Password reset request sent");

      expect(sendEmail).toHaveBeenCalled();
    });

    it("Returns a 400 error for an invalid email", async () => {
      const res = await request(app).put("/api/auth/reset-password").send({
        email: "none@email.com",
      });

      expect(sendEmail).not.toHaveBeenCalled();
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid email");
    });

    it("Returns a 400 error for a missing email", async () => {
      const res = await request(app).put("/api/auth/reset-password");

      expect(sendEmail).not.toHaveBeenCalled();
      expect(res.status).toBe(400);
      expect(res.body.message[0].message).toBe("Email is a required field");
    });

    it("Returns a 500 error for an internal server error", async () => {
      const res = await request(app)
        .put("/api/auth/reset-password?email=test@email.com")
        .set({ forceError: true });

      expect(sendEmail).not.toHaveBeenCalled();
      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Internal server error");
    });
  });

  describe("POST", () => {
    it("Resets a password", async () => {
      const passwordResetToken = await prisma.forgotPasswordToken.create({
        data: {
          userId: tc.user.id,
        },
      });

      const res = await request(app).post("/api/auth/reset-password").send({
        token: passwordResetToken.id,
        password: "newpassword",
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Password reset successfully");

      const user = await prisma.user.findFirst({
        where: {
          id: tc.user.id,
        },
      });

      expect(bcrypt.compareSync("newpassword", user.password)).toBe(true);
    });

    it("Returns a 400 error for an invalid token", async () => {
      const res = await request(app).post("/api/auth/reset-password").send({
        token: "invalidtoken",
        password: "newpassword",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid token");

      const user = await prisma.user.findFirst({
        where: {
          id: tc.user.id,
        },
      });

      expect(bcrypt.compareSync("newpassword", user.password)).toBe(false);
    });

    it("Returns a 400 error for an missing password", async () => {
      const passwordResetToken = await prisma.forgotPasswordToken.create({
        data: {
          userId: tc.user.id,
        },
      });

      const res = await request(app).post("/api/auth/reset-password").send({
        token: passwordResetToken.id,
      });

      expect(res.status).toBe(400);
      expect(res.body.message[0].message).toBe("Password is a required field");

      const user = await prisma.user.findFirst({
        where: {
          id: tc.user.id,
        },
      });

      expect(bcrypt.compareSync("newpassword", user.password)).toBe(false);
    });

    it("Returns a 400 error for an invalid password", async () => {
      const passwordResetToken = await prisma.forgotPasswordToken.create({
        data: {
          userId: tc.user.id,
        },
      });

      const res = await request(app).post("/api/auth/reset-password").send({
        token: passwordResetToken.id,
        password: "s",
      });

      expect(res.status).toBe(400);
      expect(res.body.message[0].message).toBe(
        "Password must be at least 8 characters"
      );

      const user = await prisma.user.findFirst({
        where: {
          id: tc.user.id,
        },
      });

      expect(bcrypt.compareSync("newpassword", user.password)).toBe(false);
    });

    it("Returns a 500 error for an internal server error", async () => {
      const passwordResetToken = await prisma.forgotPasswordToken.create({
        data: {
          userId: tc.user.id,
        },
      });

      const res = await request(app)
        .post("/api/auth/reset-password")
        .set({ forceError: true })
        .send({
          token: passwordResetToken.id,
          password: "newpassword",
        });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Internal server error");
    });
  });
});
