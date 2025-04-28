import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "#index";

describe("/", () => {
  describe("GET", () => {
    it("Returns a 200 status code", async () => {
      const res = await request(app).get("/api");
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Hello from the API");
    });
  });
});
