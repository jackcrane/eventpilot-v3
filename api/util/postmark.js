import postmark from "postmark";
import dotenv from "dotenv";
dotenv.config();
import { prisma } from "#prisma";
import { z } from "zod";

let rawEmailClient = new postmark.ServerClient(process.env.POSTMARK_API_TOKEN);

const sendEmail = async (options) => {
  const schema = z.object({
    From: z.string({
      required_error: "From is a required field",
    }),
    To: z
      .string({
        required_error: "To is a required field",
      })
      .email(),
    Subject: z.string({
      required_error: "Subject is a required field",
    }),
    HtmlBody: z.string({
      required_error: "HtmlBody is a required field",
    }),
    userId: z.string(),
  });
  const result = schema.safeParse(options);

  if (!result.success) {
    console.log(options);
    console.error(result.error.issues);
    throw new Error(result.error.issues);
  }

  const res = await rawEmailClient.sendEmail(options);

  const emailRecord = await prisma.email.create({
    data: {
      messageId: res.MessageID,
      from: options.From,
      to: options.To,
      subject: options.Subject,
      userId: options.userId,
    },
  });

  await prisma.logs.create({
    data: {
      type: "EMAIL_SENT",
      userId: options.userId,
      emailId: emailRecord.id,
    },
  });

  return { postmarkResponse: res, emailRecord };
};

export { rawEmailClient, sendEmail };
