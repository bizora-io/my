import { createSimpleCrudRouter } from "../lib/simpleCrudRouter.js";

export const rawMaterialsRouter = createSimpleCrudRouter("rawMaterials", "material", "rawMaterials", {
  writePermissions: ["inventory.production", "inventory.edit"],
  readPermissions: ["inventory.production", "inventory.view"],
});
export const bomsRouter = createSimpleCrudRouter("boms", "bom", "boms", {
  writePermissions: ["inventory.production", "inventory.edit"],
  readPermissions: ["inventory.production", "inventory.view"],
});
export const productionBatchesRouter = createSimpleCrudRouter("productionBatches", "batch", "productionBatches", {
  writePermissions: ["inventory.production"],
  readPermissions: ["inventory.production", "inventory.view"],
});
