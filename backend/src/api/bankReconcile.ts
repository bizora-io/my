import { createSimpleCrudRouter } from "../lib/simpleCrudRouter.js";

export const bankStatementsRouter = createSimpleCrudRouter("bankStatements", "statement", "bankStatements", {
  writePermissions: ["finance.cashbox", "finance.accounts", "finance.ledgers"],
  readPermissions: ["finance.cashbox", "finance.accounts", "finance.ledgers"],
});
