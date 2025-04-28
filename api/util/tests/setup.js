import { prisma } from "#prisma";
import { afterEach, beforeEach, vi } from "vitest";
import bcrypt from "bcrypt";

export let tc = {};

afterEach(() => {
  vi.restoreAllMocks();
});

beforeEach(async () => {
  if (process.env.NODE_ENV === "test") {
    if (
      !process.env.DATABASE_URL.includes(
        "postgres://postgres:postgres@localhost"
      )
    ) {
      throw new Error("Cannot reset the database outside of localhost.");
    }

    // Disable triggers
    await prisma.$executeRawUnsafe("SET session_replication_role = 'replica';");

    // Reset the database
    await prisma.$transaction([
      prisma.user.deleteMany(),
      prisma.logs.deleteMany(),
      prisma.email.deleteMany(),
      prisma.emailVerification.deleteMany(),
      prisma.emailWebhooks.deleteMany(),
      prisma.forgotPasswordToken.deleteMany(),
      prisma.emailPreferences.deleteMany(),
    ]);

    // Re-enable triggers
    await prisma.$executeRawUnsafe("SET session_replication_role = 'origin';");

    // Create an initial user
    const globalUser = await prisma.user.create({
      data: {
        email: "test@email.com",
        password: bcrypt.hashSync("password", 10),
        name: "Test User",
        emailVerified: true,
        emailPreferences: {
          create: {},
        },
      },
    });

    tc.globalUser = globalUser;
    tc.user = globalUser;
  }

  vi.mock("#postmark", () => {
    return {
      sendEmail: vi.fn().mockImplementation(async () => {
        return {
          postmarkResponse: { MessageID: "test-message-id" },
          emailRecord: {
            id: "test-email-record-id",
          },
        };
      }),
    };
  });

  vi.mock("#geolocation", () => {
    return {
      getGeolocation: async () => {
        return {
          city: "San Francisco",
          regionName: "California",
        };
      },
    };
  });
});
