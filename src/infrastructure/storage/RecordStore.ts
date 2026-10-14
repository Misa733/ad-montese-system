import toast from "react-hot-toast";
import { supabase } from "@/infrastructure/supabase/supabaseClient";

/**
 * Armazenamento dos cadastros feitos no sistema (patrimonio, dizimos, rascunhos...).
 *
 * As telas leem de forma sincrona de um cache em memoria, carregado do banco logo
 * apos o login (`hydrate`). Cada gravacao atualiza o cache na hora e envia a
 * mudanca ao Supabase em segundo plano, assim todos os usuarios veem os mesmos
 * dados. Sem Supabase configurado (apenas em desenvolvimento), o cache e salvo
 * no proprio navegador.
 */

export type RecordCollection =
  | "patrimony.assets"
  | "patrimony.movements"
  | "patrimony.maintenances"
  | "patrimony.inventories"
  | "tithe.payers"
  | "tithe.contributions"
  | "sheet.drafts";

export const ALL_COLLECTIONS: RecordCollection[] = [
  "patrimony.assets",
  "patrimony.movements",
  "patrimony.maintenances",
  "patrimony.inventories",
  "tithe.payers",
  "tithe.contributions",
  "sheet.drafts",
];

interface WithId {
  id: string;
}

interface AppRecordRow {
  collection: RecordCollection;
  id: string;
  data: unknown;
}

const LOCAL_PREFIX = "ad-montese.records.";
const PAGE_SIZE = 1000;

type Listener = () => void;

class RecordStore {
  private cache = new Map<RecordCollection, WithId[]>();
  private readonly listeners = new Set<Listener>();
  private version = 0;
  private pending: Promise<boolean> = Promise.resolve(true);

  /** Carrega todas as colecoes do banco para o cache. */
  async hydrate() {
    const next = new Map<RecordCollection, WithId[]>();
    ALL_COLLECTIONS.forEach((collection) => next.set(collection, []));

    if (!supabase.configured) {
      ALL_COLLECTIONS.forEach((collection) => next.set(collection, readLocal(collection)));
    } else {
      let offset = 0;
      for (;;) {
        const rows = await supabase.rest<AppRecordRow[]>("GET", "app_records", {
          params: { select: "collection,id,data", order: "updated_at.desc" },
          range: `${offset}-${offset + PAGE_SIZE - 1}`,
        });
        rows.forEach((row) => next.get(row.collection)?.push(row.data as WithId));
        if (rows.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }
    }

    this.cache = next;
    this.emit();
  }

  clear() {
    this.cache = new Map();
    this.emit();
  }

  list<T extends WithId>(collection: RecordCollection): T[] {
    return (this.cache.get(collection) ?? []) as T[];
  }

  /** Inclui ou atualiza registros (pelo id). Resolve `true` quando o banco confirmou. */
  upsert<T extends WithId>(collection: RecordCollection, records: T[]): Promise<boolean> {
    if (!records.length) return Promise.resolve(true);
    const ids = new Set(records.map((record) => record.id));
    const current = this.list<T>(collection).filter((record) => !ids.has(record.id));
    this.cache.set(collection, [...records, ...current]);
    this.emit();
    return this.persist(collection, records, []);
  }

  remove(collection: RecordCollection, ids: string[]): Promise<boolean> {
    if (!ids.length) return Promise.resolve(true);
    const removed = new Set(ids);
    this.cache.set(
      collection,
      this.list(collection).filter((record) => !removed.has(record.id)),
    );
    this.emit();
    return this.persist(collection, [], ids);
  }

  /** Aguarda todas as gravacoes em andamento (usado antes de sair). */
  flush() {
    return this.pending;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getVersion() {
    return this.version;
  }

  private emit() {
    this.version += 1;
    this.listeners.forEach((listener) => listener());
  }

  private persist(collection: RecordCollection, upserts: WithId[], deletions: string[]): Promise<boolean> {
    if (!supabase.configured) {
      return Promise.resolve(writeLocal(collection, this.list(collection)));
    }

    const task = async () => {
      if (upserts.length) {
        await supabase.rest("POST", "app_records", {
          params: { on_conflict: "collection,id" },
          prefer: "resolution=merge-duplicates,return=minimal",
          body: upserts.map((record) => ({ collection, id: record.id, data: record })),
        });
      }
      if (deletions.length) {
        await supabase.rest("DELETE", "app_records", {
          params: { collection: `eq.${collection}`, id: `in.(${deletions.map(quoteFilterValue).join(",")})` },
          prefer: "return=minimal",
        });
      }
    };

    const run = this.pending.then(task).then(
      () => true,
      (error: unknown) => {
        toast.error(`Nao foi possivel salvar no banco: ${error instanceof Error ? error.message : "erro desconhecido"}`);
        // Recarrega para a tela voltar a mostrar o que realmente esta salvo.
        void this.hydrate().catch(() => undefined);
        return false;
      },
    );
    this.pending = run;
    return run;
  }
}

function quoteFilterValue(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function readLocal(collection: RecordCollection): WithId[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_PREFIX + collection) ?? "[]") as WithId[];
  } catch {
    return [];
  }
}

function writeLocal(collection: RecordCollection, rows: WithId[]) {
  try {
    localStorage.setItem(LOCAL_PREFIX + collection, JSON.stringify(rows));
    return true;
  } catch {
    toast.error("Nao foi possivel salvar neste navegador.");
    return false;
  }
}

export const recordStore = new RecordStore();
