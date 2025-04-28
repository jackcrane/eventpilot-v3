import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "#index";
import { prisma } from "#prisma";

describe("/webhooks/postmark", () => {
  describe("POST", () => {
    it("Returns a 200 status code", async () => {
      const res = await request(app).post("/api/webhooks/postmark").send({
        RecordType: "OPEN",
        MessageID: "test-message-id",
        From: "test@email.com",
        To: "test@email.com",
        Subject: "Test Subject",
        Body: "Test Body",
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Webhook received");
    });

    it("Logs the incoming webhook", async () => {
      await prisma.email.create({
        data: {
          messageId: "test-message-id",
          from: "test@email.com",
          to: "test@email.com",
          subject: "Test Subject",
        },
      });

      const res = await request(app).post("/api/webhooks/postmark").send({
        RecordType: "Open",
        MessageID: "test-message-id",
        From: "test@email.com",
        To: "test@email.com",
        Subject: "Test Subject",
        Body: "Test Body",
      });

      const logs = await prisma.emailWebhooks.findMany({
        where: {
          messageId: "test-message-id",
        },
      });

      expect(res.status).toBe(200);
      expect(logs.length).toBe(1);
      // expect(logs[0].type).toBe("EMAIL_SENT");
    });
  });
});
