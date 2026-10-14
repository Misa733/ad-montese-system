import { DataExplorerPage } from "../data-explorer/DataExplorerPage";
import { CongregationsPage, StructurePage } from "../organization/OrganizationPages";
import { ReportsPage } from "../reports/ReportsPage";
import { TithesPage } from "../tithes/TithesPage";
import { TreasuryPage } from "../treasury/TreasuryPage";

export function ModulePage({ moduleName }: { moduleName: string }) {
  const normalized = moduleName.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  if (normalized.includes("tesouraria")) return <TreasuryPage />;
  if (normalized.includes("dizim")) return <TithesPage />;
  if (normalized.includes("congreg")) return <CongregationsPage />;
  if (normalized.includes("area")) return <StructurePage title="Areas" kind="area" />;
  if (normalized.includes("setor")) return <StructurePage title="Setores" kind="sector" />;
  if (normalized.includes("relat")) return <ReportsPage />;
  return <DataExplorerPage title={moduleName} />;
}
