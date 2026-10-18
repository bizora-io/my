import { createSimpleCrudRouter } from "../lib/simpleCrudRouter.js";

export const supportTicketsRouter = createSimpleCrudRouter("supportTickets", "ticket", "supportTickets", {
  writePermissions: ["crm.support"],
  readPermissions: ["crm.support", "crm.view"],
});
export const feedbacksRouter = createSimpleCrudRouter("feedbacks", "feedback", "feedbacks", {
  writePermissions: ["crm.support", "crm.manage"],
  readPermissions: ["crm.support", "crm.view"],
});
export const marketingCampaignsRouter = createSimpleCrudRouter("marketingCampaigns", "campaign", "marketingCampaigns", {
  writePermissions: ["crm.marketing"],
  readPermissions: ["crm.marketing", "crm.view"],
});
export const financialAccountsRouter = createSimpleCrudRouter("financialAccounts", "account", "financialAccounts", {
  writePermissions: ["finance.accounts", "finance.cashbox"],
  readPermissions: ["finance.cashbox", "finance.ledgers", "finance.accounts"],
});
export const onlineOrdersRouter = createSimpleCrudRouter("onlineOrders", "order", "onlineOrders", {
  writePermissions: ["shop.orders", "shop.manage"],
  readPermissions: ["shop.orders", "shop.manage"],
});
export const customerGroupsRouter = createSimpleCrudRouter("customerGroups", "group", "customerGroups", {
  writePermissions: ["crm.manage"],
  readPermissions: ["crm.view", "crm.manage"],
});
