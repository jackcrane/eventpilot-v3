/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      reSeedDb(): Chainable<void>;
    }
  }
}

export {};
