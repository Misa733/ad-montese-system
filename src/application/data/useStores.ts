import { useSyncExternalStore } from "react";
import { recordStore } from "@/infrastructure/storage/RecordStore";
import { settingsStore } from "@/infrastructure/storage/SettingsStore";

/** Configuracoes globais, atualizadas na tela assim que mudam. */
export function useSettings() {
  return useSyncExternalStore(
    (listener) => settingsStore.subscribe(listener),
    () => settingsStore.get(),
  );
}

/** Numero que muda sempre que algum cadastro do sistema e alterado. */
export function useRecordsVersion() {
  return useSyncExternalStore(
    (listener) => recordStore.subscribe(listener),
    () => recordStore.getVersion(),
  );
}
