Cypress.Commands.add("reSeedDb", () => {
  return cy
    .task("db:reseed")
    .then(() => {
      Cypress.log({ name: "reSeedDb", message: "Database reloaded" });
    })
    .catch((error) => {
      throw new Error(error.message || error);
    });
});
