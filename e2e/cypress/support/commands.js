Cypress.Commands.add("reSeedDb", () => {
  return cy
    .task("db:reseed")
    .then(
      () => {
        Cypress.log({ name: "reSeedDb", message: "Database reloaded" });
      },
      (error) => {
        throw new Error(error?.message || error);
      },
    );
});

Cypress.Commands.add("savePageSnapshot", (name = "page") => {
  cy.document().then((doc) => {
    const clonedRoot = doc.documentElement.cloneNode(true);

    const collectCssText = () => {
      return Array.from(doc.styleSheets || [])
        .map((sheet) => {
          try {
            const rules = Array.from(sheet.cssRules || []);
            return rules.map((rule) => rule.cssText).join("\n");
          } catch (error) {
            const href = sheet.href || "inline";
            return `/* Failed to read stylesheet ${href}: ${error.message} */`;
          }
        })
        .filter(Boolean)
        .join("\n");
    };

    const ensureHead = () => {
      let head = clonedRoot.querySelector("head");
      if (!head) {
        head = doc.createElement("head");
        const firstChild = clonedRoot.firstChild;
        if (firstChild) {
          clonedRoot.insertBefore(head, firstChild);
        } else {
          clonedRoot.appendChild(head);
        }
      }
      return head;
    };

    const styleTag = doc.createElement("style");
    styleTag.id = "__cypress_snapshot_styles__";
    styleTag.textContent = collectCssText();
    ensureHead().appendChild(styleTag);

    const snapshotHtml = "<!DOCTYPE html>\n" + clonedRoot.outerHTML;
    cy.writeFile(`artifacts/snapshots/${name}.html`, snapshotHtml, { log: true });
  });
});
