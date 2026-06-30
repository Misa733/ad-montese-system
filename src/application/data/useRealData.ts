import { useMemo } from "react";
import { useSpreadsheet } from "@/application/import/useSpreadsheet";
import { DashboardService } from "./DashboardService";
import { OrganizationService } from "./OrganizationService";
import { ReportsService } from "./ReportsService";
import { SpreadsheetDataService } from "./SpreadsheetDataService";
import { TitheService } from "./TitheService";
import { TreasuryService } from "./TreasuryService";

export function useRealData() {
  const query = useSpreadsheet();

  const model = useMemo(() => {
    const spreadsheet = query.data;
    const spreadsheetService = new SpreadsheetDataService(spreadsheet);
    const treasuryService = new TreasuryService(spreadsheet);
    const titheService = new TitheService(spreadsheet);
    const movements = treasuryService.getMovements();
    const tithePayers = titheService.getTithePayers();
    const titheContributions = titheService.getContributions();
    const organizationService = new OrganizationService(spreadsheet, movements, tithePayers);
    const congregations = organizationService.getCongregations();
    const dashboardService = new DashboardService(spreadsheet, movements, tithePayers, titheContributions, congregations);
    const reportsService = new ReportsService(spreadsheet, movements, titheContributions);

    return {
      spreadsheet,
      spreadsheetService,
      treasuryService,
      titheService,
      organizationService,
      dashboardService,
      reportsService,
      movements,
      tithePayers,
      titheContributions,
      congregations,
      sheets: spreadsheetService.getSheets(),
      draftChanges: spreadsheetService.getDraftChanges(),
    };
  }, [query.data]);

  return { ...query, ...model };
}
