import { createSimpleCrudRouter } from "../lib/simpleCrudRouter.js";

export const departmentsRouter = createSimpleCrudRouter("departments", "department", "departments", {
  writePermissions: ["hr.manage"],
  readPermissions: ["hr.manage", "hr.payroll"],
});
export const designationsRouter = createSimpleCrudRouter("designations", "designation", "designations", {
  writePermissions: ["hr.manage"],
  readPermissions: ["hr.manage", "hr.payroll"],
});
export const workShiftsRouter = createSimpleCrudRouter("workShifts", "workShift", "workShifts", {
  writePermissions: ["hr.manage"],
  readPermissions: ["hr.manage"],
});
export const holidaysRouter = createSimpleCrudRouter("holidays", "holiday", "holidays", {
  writePermissions: ["hr.manage"],
  readPermissions: ["hr.manage", "hr.payroll"],
});
