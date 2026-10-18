import { createSimpleCrudRouter } from "../lib/simpleCrudRouter.js";

export const payrollRunsRouter = createSimpleCrudRouter("payrollRuns", "payrollRun", "payrollRuns", {
  writePermissions: ["hr.payroll", "hr.manage"],
  readPermissions: ["hr.payroll", "hr.manage"],
});
