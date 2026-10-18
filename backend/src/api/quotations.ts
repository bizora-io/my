import { createSimpleCrudRouter } from "../lib/simpleCrudRouter.js";

export const quotationsRouter = createSimpleCrudRouter("quotations", "quotation", "quotations", {
  writePermissions: ["pos.sell", "pos.view_sales"],
  readPermissions: ["pos.sell", "pos.view_sales"],
});
