import type { PatrimonyInventory } from "@/application/data/PatrimonyService";

export class AssetInventoryService {
  summarize(inventory: PatrimonyInventory) {
    const checkedItems = inventory.checkedItems ?? Object.keys(inventory.checks).length;
    const totalItems = inventory.totalItems ?? checkedItems;
    return {
      checkedItems,
      totalItems,
      pendingItems: inventory.pendingItems ?? Math.max(totalItems - checkedItems, 0),
      notFoundItems: inventory.notFoundItems ?? 0,
      completionPercentage: inventory.completionPercentage ?? (totalItems ? Math.round((checkedItems / totalItems) * 100) : 0),
    };
  }
}
