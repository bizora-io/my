import { createSimpleCrudRouter } from "../lib/simpleCrudRouter.js";

export const giftCardsRouter = createSimpleCrudRouter("giftCards", "giftCard", "giftCards", {
  writePermissions: ["crm.marketing", "pos.sell"],
  readPermissions: ["crm.marketing", "pos.sell", "pos.view_sales"],
});
