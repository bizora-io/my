import { createSimpleCrudRouter } from "../lib/simpleCrudRouter.js";

export const stockTransfersRouter = createSimpleCrudRouter(
  "stockTransfers",
  "stockTransfer",
  "stockTransfers",
  {
    writePermissions: ["inventory.transfer", "inventory.edit"],
    readPermissions: ["inventory.transfer", "inventory.view", "inventory.edit"],
  }
);
