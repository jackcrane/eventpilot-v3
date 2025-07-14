export const subdomainFromEmail = (email) => {
  const parts = email.split("@");
  return parts[1].split(".")[0];
};

export const findEPFromToArray = (toArray) =>
  toArray.find((to) => to.Email.includes(".geteventpilot.com"));

export const extractAllEmails = (body) =>
  [body.FromFull, ...body.ToFull, ...body.CcFull, ...body.BccFull].filter(
    (email) => !email.Email.includes(".geteventpilot.com")
  );
