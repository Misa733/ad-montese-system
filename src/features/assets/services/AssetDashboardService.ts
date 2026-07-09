import type { PatrimonyAsset, PatrimonyInventory, PatrimonyMaintenance } from "@/application/data/PatrimonyService";
import { PatrimonyService } from "@/application/data/PatrimonyService";

export class AssetDashboardService {
  build(assets: PatrimonyAsset[], inventories: PatrimonyInventory[], maintenances: PatrimonyMaintenance[]) {
    return new PatrimonyService().buildDashboard(assets, inventories, maintenances);
  }
}
