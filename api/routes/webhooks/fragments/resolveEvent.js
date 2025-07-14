import { prisma } from "#prisma";
import { findEPFromToArray, subdomainFromEmail } from "./helpers";

export const resolveEvent = async (body) => {
  let event = null;
  const epTo = findEPFromToArray(body.ToFull)?.Email;
  console.log(epTo);

  if (epTo) {
    const subdomain = subdomainFromEmail(epTo);
    if (subdomain !== "geteventpilot") {
      event = await prisma.event.findUnique({
        where: { slug: subdomain },
      });
    }
  }

  if (!event) {
    console.log("Trying to find event by externalContactEmail", body.ToFull);
    const toEmails = body.ToFull.map((to) => to.Email);

    event = await prisma.event.findFirst({
      where: {
        externalContactEmail: {
          in: toEmails,
          mode: "insensitive",
        },
      },
    });
  }
  return event;
};
