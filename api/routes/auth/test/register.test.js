import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "#index";
import { prisma } from "#prisma";

describe("/auth/register", () => {
  describe("POST", () => {
    it("Creates a new user", async () => {
      const res = await request(app).post("/api/auth/register").send({
        email: "new@email.com",
        password: "password",
        name: "Test User",
      });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe("User created successfully");

      const user = await prisma.user.findFirst({
        where: {
          email: "new@email.com",
        },
      });

      expect(user).toBeTruthy();
    });

    it("Returns a 400 error for an invalid email", async () => {
      const res = await request(app).post("/api/auth/register").send({
        email: "invalid$email.com",
        password: "password",
        name: "Test User",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid email");

      const user = await prisma.user.findFirst({
        where: {
          email: "invalid$email.com",
        },
      });

      expect(user).toBeFalsy();
    });

    it("Returns a 400 error for an invalid password", async () => {
      const res = await request(app).post("/api/auth/register").send({
        email: "new@email.com",
        password: "__",
        name: "Test User",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Password must be at least 8 characters");

      const user = await prisma.user.findFirst({
        where: {
          email: "new@email.com",
        },
      });

      expect(user).toBeFalsy();
    });

    it("Returns a 400 error for an invalid name", async () => {
      const res = await request(app).post("/api/auth/register").send({
        email: "new@email.com",
        password: "password",
        name: "_",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Name must be at least 2 characters");

      const user = await prisma.user.findFirst({
        where: {
          email: "new@email.com",
        },
      });

      expect(user).toBeFalsy();
    });

    it("Returns a 400 error if email is already in use", async () => {
      const res = await request(app).post("/api/auth/register").send({
        email: "test@email.com",
        password: "password",
        name: "Test User",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Email already exists");
    });

    it("Returns a 500 error for an internal server error", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .set({ forceError: true })
        .send({
          email: "test@email.com",
          password: "password",
          name: "Test User",
        });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Internal server error");
    });
  });
});
