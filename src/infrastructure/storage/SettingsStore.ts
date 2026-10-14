import { supabase } from "@/infrastructure/supabase/supabaseClient";
import type { SheetModuleMapping } from "@/domain/sheets/types";

/**
 * Configuracoes globais do sistema, guardadas na tabela `settings` do banco.
 * Todos os usuarios enxergam a mesma planilha, a mesma fonte de dados e o mesmo
 * modo demonstracao. Somente administradores alteram.
 */

export type DataSource = "google" | "database";

export interface AppSettings {
  spreadsheet_url: string;
  data_source: DataSource;
  demo_mode: boolean;
  sheet_mappings: SheetModuleMapping[];
  last_import_at: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  spreadsheet_url: "",
  data_source: "google",
  demo_mode: false,
  sheet_mappings: [],
  last_import_at: "",
};

const LOCAL_KEY = "ad-montese.settings";

type Listener = () => void;

class SettingsStore {
  private settings: AppSettings = { ...DEFAULT_SETTINGS };
  private readonly listeners = new Set<Listener>();

  async hydrate() {
    if (!supabase.configured) {
      this.settings = { ...DEFAULT_SETTINGS, ...readLocal() };
    } else {
      const rows = await supabase.rest<Array<{ key: keyof AppSettings; value: unknown }>>("GET", "settings", {
        params: { select: "key,value" },
      });
      const loaded = Object.fromEntries(rows.map((row) => [row.key, row.value])) as Partial<AppSettings>;
      this.settings = { ...DEFAULT_SETTINGS, ...loaded };
    }
    this.emit();
  }

  get(): AppSettings {
    return this.settings;
  }

  async update(patch: Partial<AppSettings>) {
    const previous = this.settings;
    this.settings = { ...this.settings, ...patch };
    this.emit();

    if (!supabase.configured) {
      writeLocal(this.settings);
      return;
    }

    try {
      await supabase.rest("POST", "settings", {
        params: { on_conflict: "key" },
        prefer: "resolution=merge-duplicates,return=minimal",
        body: Object.entries(patch).map(([key, value]) => ({ key, value })),
      });
    } catch (error) {
      this.settings = previous;
      this.emit();
      throw error;
    }
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }
}

function readLocal(): Partial<AppSettings> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "{}") as Partial<AppSettings>;
  } catch {
    return {};
  }
}

function writeLocal(settings: AppSettings) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(settings));
  } catch {
    // Sem armazenamento local: a configuracao vale ate recarregar a pagina.
  }
}

export const settingsStore = new SettingsStore();
