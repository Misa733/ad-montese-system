import { useQuery } from "@tanstack/react-query";
import { useSettings } from "@/application/data/useStores";
import { importService } from "./container";

export function useSpreadsheet() {
  const settings = useSettings();
  return useQuery({
    queryKey: ["spreadsheet", settings.data_source, settings.spreadsheet_url, settings.last_import_at],
    queryFn: () => importService.loadCurrentSpreadsheet(),
    enabled: settings.data_source === "database" || Boolean(settings.spreadsheet_url),
  });
}
