import { useQuery } from "@tanstack/react-query";
import { importService } from "./container";

export function useSpreadsheet() {
  return useQuery({
    queryKey: ["spreadsheet", "current"],
    queryFn: () => importService.loadCurrentSpreadsheet(),
  });
}
