import { createSimpleCrudRouter } from "../lib/simpleCrudRouter.js";

export const purchaseOrdersRouter = createSimpleCrudRouter("purchaseOrders", "purchaseOrder", "purchaseOrders", {
  writePermissions: ["inventory.purchase"],
  readPermissions: ["inventory.purchase", "inventory.view"],
});
