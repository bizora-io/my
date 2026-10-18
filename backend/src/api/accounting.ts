import { createSimpleCrudRouter } from "../lib/simpleCrudRouter.js";

export const journalEntriesRouter = createSimpleCrudRouter("journalEntries", "journalEntry", "journalEntries", {
  writePermissions: ["finance.ledgers", "finance.accounts"],
  readPermissions: ["finance.ledgers", "finance.accounts", "reports.view"],
});
export const leaveRequestsRouter = createSimpleCrudRouter("leaveRequests", "leaveRequest", "leaveRequests", {
  writePermissions: ["hr.manage"],
  readPermissions: ["hr.manage", "hr.payroll"],
});
