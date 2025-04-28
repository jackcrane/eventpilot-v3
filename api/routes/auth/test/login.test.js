import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "#index";

describe("/auth/login", () => {
  describe("POST", () => {
    it("Generates a token for a valid user", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "test@email.com",
        password: "password",
      });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
    });

    it("Returns a 400 error for an invalid email", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "invalid@email.com",
        password: "password",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid email or password");
      expect(res.body.token).toBeFalsy();
    });

    it("Returns a 400 error for an invalid password", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "test@email.com",
        password: "invalidpassword",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid email or password");
      expect(res.body.token).toBeFalsy();
    });

    it("Returns a 500 error for an internal server error", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .set({ forceError: true })
        .send({
          email: "test@email.com",
          password: "password",
        });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Internal server error");
      expect(res.body.token).toBeFalsy();
    });
  });
});
