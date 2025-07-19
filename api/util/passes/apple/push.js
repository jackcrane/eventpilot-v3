import apn from "apn";
import { prisma } from "#prisma";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CERTS_DIR = path.join(__dirname, "certs");

export const apnProvider = new apn.Provider({
  token: {
    key: path.join(CERTS_DIR, "push-key.p8"),
    keyId: "FUH5723592",
    teamId: "2LXR6KM7AB",
  },
  production: true,
});

export const sendUpdateNotification = async (serialNumber) => {
  console.log("Updating pass");
  const pass = await prisma.pass.findUnique({
    where: { id: serialNumber },
    select: { pushToken: true },
  });
  if (!pass?.pushToken) return;

  const note = new apn.Notification({
    pushType: "background",
    topic: "pass.com.geteventpilot", // your passTypeIdentifier
    contentAvailable: 1, // maps to {"aps":{"content-available":1}}
    payload: { serialNumber },
  });
  console.log("Sending APN notification", note);

  try {
    const result = await apnProvider.send(note, pass.pushToken);
    console.log("APN result:", result);
  } catch (err) {
    console.error("APN error:", err);
  }
};
