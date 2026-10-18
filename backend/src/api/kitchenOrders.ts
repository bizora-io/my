import { createSimpleCrudRouter } from "../lib/simpleCrudRouter.js";

export const kitchenOrdersRouter = createSimpleCrudRouter("kitchenOrders", "kitchenOrder", "kitchenOrders", {
  writePermissions: ["pos.sell", "pos.view_sales"],
  readPermissions: ["pos.sell", "pos.view_sales"],
});
