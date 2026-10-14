import toast from "react-hot-toast";
import { PATRIMONY_SEED_INVENTORIES } from "@/application/data/patrimonySeed";
import { recordStore, type RecordCollection } from "@/infrastructure/storage/RecordStore";

/**
 * Antes do banco, os cadastros ficavam so no navegador de quem digitou.
 * Na primeira entrada depois da atualizacao, enviamos esses dados para o banco
 * (uma vez por navegador) para ninguem perder o que ja tinha lancado.
 */
const LEGACY_KEYS: Array<[string, RecordCollection]> = [
  ["ad-montese.patrimony.assets", "patrimony.assets"],
  ["ad-montese.patrimony.movements", "patrimony.movements"],
  ["ad-montese.patrimony.maintenance", "patrimony.maintenances"],
  ["ad-montese.patrimony.inventories", "patrimony.inventories"],
  ["ad-montese.local-tithe-payers", "tithe.payers"],
  ["ad-montese.local-tithe-contributions", "tithe.contributions"],
  ["ad-montese.sheet-draft-changes", "sheet.drafts"],
];

const DEMO_INVENTORY_IDS = new Set(PATRIMONY_SEED_INVENTORIES.map((inventory) => inventory.id));

export async function migrateLegacyBrowserData() {
  let moved = 0;
  for (const [key, collection] of LEGACY_KEYS) {
    let rows: Array<{ id?: string }> = [];
    try {
      rows = JSON.parse(localStorage.getItem(key) ?? "[]") as Array<{ id?: string }>;
    } catch {
      rows = [];
    }

    const valid = rows
      .filter((row): row is { id: string } => typeof row?.id === "string")
      // O sistema antigo salvava os inventarios de demonstracao junto com os reais.
      .filter((row) => collection !== "patrimony.inventories" || !DEMO_INVENTORY_IDS.has(row.id));

    // So apaga do navegador depois que o banco confirmou a gravacao.
    const saved = valid.length ? await recordStore.upsert(collection, valid) : true;
    if (!saved) continue;
    moved += valid.length;
    try {
      localStorage.removeItem(key);
    } catch {
      // Sem acesso ao armazenamento: nada a limpar.
    }
  }

  if (moved) toast.success(`${moved} cadastros feitos neste navegador foram enviados para o banco.`);
}
