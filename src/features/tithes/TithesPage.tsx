import type { ColumnDef } from "@tanstack/react-table";
import { Download, Eye, Plus, Receipt, X } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FilterService, emptyGlobalFilters, type GlobalFilters } from "@/application/data/FilterService";
import { normalizeText } from "@/application/data/SpreadsheetDataService";
import { MONTHS, type TitheContribution, type TithePayer } from "@/application/data/TitheService";
import { parseMoney } from "@/application/data/TreasuryService";
import { useRealData } from "@/application/data/useRealData";
import { useRecordsVersion } from "@/application/data/useStores";
import { recordStore } from "@/infrastructure/storage/RecordStore";
import { DataTable } from "@/components/data/DataTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { downloadXlsx } from "@/lib/export";
import { cn, formatCurrency } from "@/lib/utils";
import { Field, Filter, Metric, Modal, unique } from "../modules/shared";
import { MobileInfo, ReceiptModal, sheetValueToReceiptText } from "./receipts";

export function TithesPage() {
  const { tithePayers, titheContributions, dashboardService, spreadsheetService } = useRealData();
  const [filters, setFilters] = useState<GlobalFilters>(emptyGlobalFilters);
  const [mobileSearch, setMobileSearch] = useState("");
  const recordsVersion = useRecordsVersion();
  const localPayers = useMemo(() => recordStore.list<TithePayer>(TITHE_PAYERS), [recordsVersion]);
  const localContributions = useMemo(() => recordStore.list<TitheContribution>(TITHE_CONTRIBUTIONS), [recordsVersion]);
  const [selected, setSelected] = useState<TithePayer | null>(null);
  const [receiptContribution, setReceiptContribution] = useState<TitheContribution | null>(null);
  const [creatingPayer, setCreatingPayer] = useState(false);
  const [creatingContribution, setCreatingContribution] = useState(false);
  const service = new FilterService();
  const allPayers = useMemo(() => applyLocalTitheChanges(tithePayers, localPayers, localContributions), [tithePayers, localPayers, localContributions]);
  const allContributions = useMemo(() => dedupeTitheContributions([...titheContributions, ...localContributions]), [titheContributions, localContributions]);
  const filteredPayers = service.filterTithePayers(allPayers, filters);
  const filteredContributions = service.filterContributions(allContributions, filters);
  const payers = filterTithePayersBySearch(filteredPayers, mobileSearch);
  const contributions = filterContributionsBySearch(filteredContributions, mobileSearch);
  const model = dashboardService.build(filters);

  const payerColumns = useMemo<ColumnDef<TithePayer>[]>(
    () => [
      { accessorKey: "name", header: "Nome" },
      { accessorKey: "congregation", header: "Congregacao" },
      { accessorKey: "annualTotal", header: "Total anual", cell: ({ row }) => formatCurrency(row.original.annualTotal) },
      { accessorKey: "lastContributionMonth", header: "Ultimo mes" },
      { accessorKey: "contributedMonths", header: "Meses" },
      { accessorKey: "averageMonthly", header: "Media mensal", cell: ({ row }) => formatCurrency(row.original.averageMonthly) },
      {
        id: "actions",
        header: "Ficha",
        cell: ({ row }) => (
          <Button variant="ghost" size="icon" onClick={() => setSelected(row.original)} aria-label="Ver ficha">
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [],
  );

  const contributionColumns = useMemo<ColumnDef<(typeof contributions)[number]>[]>(
    () => [
      { accessorKey: "tithePayerName", header: "Dizimista" },
      { accessorKey: "month", header: "Mes" },
      { accessorKey: "year", header: "Ano" },
      { accessorKey: "congregation", header: "Congregacao" },
      { accessorKey: "amount", header: "Valor", cell: ({ row }) => formatCurrency(row.original.amount) },
      {
        id: "receipt",
        header: "Recibo",
        cell: ({ row }) => (
          <Button variant="ghost" size="icon" onClick={() => setReceiptContribution(row.original)} aria-label="Gerar recibo">
            <Receipt className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden">
      <PageHeader
        eyebrow="Dizimos"
        title="Dizimistas"
        description="Valores mensais, totais anuais e contribuicoes individuais lidos da aba Dizimistas."
        actions={
          <>
            <Button variant="outline" onClick={() => downloadXlsx("dizimistas.xlsx", payers as unknown as Array<Record<string, unknown>>)}>
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button variant="outline" onClick={() => setCreatingPayer(true)}>
              <Plus className="h-4 w-4" />
              Novo dizimista
            </Button>
            <Button onClick={() => setCreatingContribution(true)}>
              <Plus className="h-4 w-4" />
              Lançar dizimo
            </Button>
          </>
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Total de dizimos" value={formatCurrency(contributions.reduce((sum, item) => sum + item.amount, 0) || Number(model.cards.titheTotal ?? 0))} />
        <Metric label="Total do mes" value={formatCurrency(contributions.filter((item) => item.month === filters.month || filters.month === "Todos").reduce((sum, item) => sum + item.amount, 0))} />
        <Metric label="Total do ano" value={formatCurrency(contributions.filter((item) => String(item.year) === filters.year || filters.year === "Todos").reduce((sum, item) => sum + item.amount, 0))} />
        <Metric label="Dizimistas" value={payers.length} />
        <Metric label="Ativos" value={payers.filter((item) => item.contributedMonths > 0).length} />
      </div>
      <TitheFilters filters={filters} setFilters={setFilters} payers={allPayers} />
      <Card className="mb-6 min-w-0 overflow-hidden lg:hidden">
        <CardContent className="p-4">
          <label className="text-xs font-medium text-muted-foreground">
            Buscar dizimista
            <Input
              className="mt-2"
              value={mobileSearch}
              onChange={(event) => setMobileSearch(event.target.value)}
              placeholder="Digite nome ou congregacao..."
            />
          </label>
        </CardContent>
      </Card>
      <div className="grid min-w-0 max-w-full gap-6 overflow-hidden">
        <div className="min-w-0 max-w-full overflow-hidden">
          <h2 className="mb-3 text-base font-semibold">Dizimistas</h2>
          <div className="min-w-0 max-w-full overflow-hidden lg:hidden">
            <MobileTithePayerCards payers={payers} onSelect={setSelected} onReceipt={setReceiptContribution} />
          </div>
          <div className="hidden lg:block">
            <DataTable columns={payerColumns} data={payers} searchPlaceholder="Pesquisar dizimista..." />
          </div>
        </div>

        <div className="min-w-0 max-w-full overflow-hidden">
          <h2 className="mb-3 text-base font-semibold">Contribuicoes mensais</h2>
          <div className="min-w-0 max-w-full overflow-hidden lg:hidden">
            <MobileContributionCards contributions={contributions} onReceipt={setReceiptContribution} />
          </div>
          <div className="hidden lg:block">
            <DataTable columns={contributionColumns} data={contributions} searchPlaceholder="Pesquisar contribuicoes..." />
          </div>
        </div>
      </div>
      {selected ? <TitheProfile payer={selected} onClose={() => setSelected(null)} /> : null}
      {receiptContribution ? <ReceiptModal contribution={receiptContribution} onClose={() => setReceiptContribution(null)} /> : null}
      {creatingPayer ? <NewTithePayerModal existingPayers={allPayers} onClose={() => setCreatingPayer(false)} onSave={(payer, row) => {
        recordStore.upsert(TITHE_PAYERS, [payer]);
        spreadsheetService.appendRowToSheet("Dizimistas", row);
        setCreatingPayer(false);
        toast.success("Dizimista cadastrado");
      }} /> : null}
      {creatingContribution ? <TitheContributionModal payers={allPayers} onClose={() => setCreatingContribution(false)} onSave={(contribution, row) => {
        recordStore.upsert(TITHE_CONTRIBUTIONS, [contribution]);
        spreadsheetService.appendRowToSheet("Dizimistas", row);
        setCreatingContribution(false);
        toast.success("Dizimo lançado");
      }} /> : null}
    </div>
  );
}

function filterTithePayersBySearch(payers: TithePayer[], search: string) {
  const term = normalizeText(search);
  if (!term) return payers;

  return payers.filter((payer) =>
    [payer.name, payer.congregation, payer.sector, payer.area].some((value) => normalizeText(value).includes(term)),
  );
}

function filterContributionsBySearch(contributions: TitheContribution[], search: string) {
  const term = normalizeText(search);
  if (!term) return contributions;

  return contributions.filter((contribution) =>
    [contribution.tithePayerName, contribution.congregation, contribution.month, String(contribution.year)].some((value) =>
      normalizeText(value).includes(term),
    ),
  );
}

function TitheFilters({ filters, setFilters, payers }: { filters: GlobalFilters; setFilters: React.Dispatch<React.SetStateAction<GlobalFilters>>; payers: TithePayer[] }) {
  return (
    <Card className="mb-6">
      <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Filter label="Mes" value={filters.month} options={[...MONTHS]} onChange={(month) => setFilters((current) => ({ ...current, month }))} />
        <Filter label="Ano" value={filters.year} options={unique(payers.map((item) => String(item.raw.ano ?? "")))} onChange={(year) => setFilters((current) => ({ ...current, year }))} />
        <Filter label="Congregacao" value={filters.congregation} options={unique(payers.map((item) => item.congregation))} onChange={(congregation) => setFilters((current) => ({ ...current, congregation }))} />
        <Filter label="Setor" value={filters.sector} options={unique(payers.map((item) => item.sector))} onChange={(sector) => setFilters((current) => ({ ...current, sector }))} />
        <Filter label="Area" value={filters.area} options={unique(payers.map((item) => item.area))} onChange={(area) => setFilters((current) => ({ ...current, area }))} />
        <Filter label="Nome" value={filters.tithePayer} options={unique(payers.map((item) => item.name))} onChange={(tithePayer) => setFilters((current) => ({ ...current, tithePayer }))} />
      </CardContent>
    </Card>
  );
}

const TITHE_PAYERS = "tithe.payers";

const TITHE_CONTRIBUTIONS = "tithe.contributions";

function applyLocalTitheChanges(basePayers: TithePayer[], localPayers: TithePayer[], localContributions: TitheContribution[]) {
  const payerMap = new Map<string, TithePayer>();
  const payerIdToKey = new Map<string, string>();

  [...basePayers, ...localPayers].forEach((payer) => {
    const key = tithePayerKey(payer.name);
    if (!key) return;

    const current = payerMap.get(key);
    if (current) {
      mergePayerInto(current, payer);
    } else {
      payerMap.set(key, clonePayer(payer));
    }
    payerIdToKey.set(payer.id, key);
  });

  localContributions.forEach((contribution) => {
    const key = payerIdToKey.get(contribution.tithePayerId) ?? tithePayerKey(contribution.tithePayerName);
    const payer = payerMap.get(key);
    if (!payer) return;

    const month = getTitheMonthByNumber(contribution.monthNumber);
    if (!month) return;

    payer.monthlyTithes[month.key] = (payer.monthlyTithes[month.key] ?? 0) + contribution.amount;
    recalculatePayerTotals(payer);
  });

  return Array.from(payerMap.values());
}

function tithePayerKey(name: string) {
  return normalizeText(name);
}

function clonePayer(payer: TithePayer): TithePayer {
  const cloned = { ...payer, monthlyTithes: { ...payer.monthlyTithes }, raw: { ...payer.raw } };
  recalculatePayerTotals(cloned);
  return cloned;
}

function mergePayerInto(target: TithePayer, source: TithePayer) {
  TITHE_MONTHS.forEach((month) => {
    target.monthlyTithes[month.key] = Math.max(target.monthlyTithes[month.key] ?? 0, source.monthlyTithes[month.key] ?? 0);
  });
  target.congregation ||= source.congregation;
  target.sector ||= source.sector;
  target.area ||= source.area;
  target.raw = { ...source.raw, ...target.raw };
  recalculatePayerTotals(target);
}

function recalculatePayerTotals(payer: TithePayer) {
  const paidMonths = getPaidMonths(payer);
  payer.calculatedTotal = TITHE_MONTHS.reduce((sum, month) => sum + (payer.monthlyTithes[month.key] ?? 0), 0);
  payer.annualTotal = payer.calculatedTotal;
  payer.contributedMonths = paidMonths.length;
  payer.averageMonthly = paidMonths.length ? payer.calculatedTotal / paidMonths.length : 0;
  payer.lastContributionMonth = paidMonths.at(-1)?.label ?? null;
}

function getTitheMonthByNumber(monthNumber: number) {
  return TITHE_MONTHS[monthNumber - 1];
}

function getTitheMonthByLabel(label: string) {
  const normalized = normalizeText(label);
  return TITHE_MONTHS.find((month) => normalizeText(month.label) === normalized || normalizeText(month.short) === normalized);
}

function emptyTitheMonths(): TithePayer["monthlyTithes"] {
  return {
    janeiro: 0,
    fevereiro: 0,
    marco: 0,
    abril: 0,
    maio: 0,
    junho: 0,
    julho: 0,
    agosto: 0,
    setembro: 0,
    outubro: 0,
    novembro: 0,
    dezembro: 0,
  };
}

function dedupeTitheContributions(contributions: TitheContribution[]) {
  const seen = new Set<string>();
  return contributions.filter((contribution) => {
    if (contribution.id.startsWith("local_contribution_")) return true;
    const key = [
      tithePayerKey(contribution.tithePayerName),
      contribution.year,
      contribution.monthNumber,
      contribution.amount,
      normalizeText(contribution.congregation),
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const TITHE_MONTHS: Array<{ key: keyof TithePayer["monthlyTithes"]; label: string; short: string }> = [
  { key: "janeiro", label: "Janeiro", short: "Jan" },
  { key: "fevereiro", label: "Fevereiro", short: "Fev" },
  { key: "marco", label: "Marco", short: "Mar" },
  { key: "abril", label: "Abril", short: "Abr" },
  { key: "maio", label: "Maio", short: "Mai" },
  { key: "junho", label: "Junho", short: "Jun" },
  { key: "julho", label: "Julho", short: "Jul" },
  { key: "agosto", label: "Agosto", short: "Ago" },
  { key: "setembro", label: "Setembro", short: "Set" },
  { key: "outubro", label: "Outubro", short: "Out" },
  { key: "novembro", label: "Novembro", short: "Nov" },
  { key: "dezembro", label: "Dezembro", short: "Dez" },
];

function NewTithePayerModal({ existingPayers, onClose, onSave }: { existingPayers: TithePayer[]; onClose: () => void; onSave: (payer: TithePayer, row: Record<string, string>) => void }) {
  const [draft, setDraft] = useState({
    name: "",
    congregation: "",
    sector: "",
    area: "",
    year: String(new Date().getFullYear()),
  });

  const set = (key: keyof typeof draft, value: string) => setDraft((current) => ({ ...current, [key]: value }));

  function save() {
    if (!draft.name.trim()) {
      toast.error("Informe o nome do dizimista");
      return;
    }
    if (existingPayers.some((payer) => tithePayerKey(payer.name) === tithePayerKey(draft.name))) {
      toast.error("Esse dizimista ja existe. Use Lancar dizimo para adicionar um valor.");
      return;
    }

    const row = {
      "Nome Completo": draft.name.trim(),
      CONGREGACAO: draft.congregation.trim(),
      SETOR: draft.sector.trim(),
      AREA: draft.area.trim(),
      ano: draft.year.trim(),
    };
    const payer: TithePayer = {
      id: `local_payer_${crypto.randomUUID()}`,
      number: null,
      name: row["Nome Completo"],
      congregation: row.CONGREGACAO,
      sector: row.SETOR,
      area: row.AREA,
      monthlyTithes: emptyTitheMonths(),
      annualTotal: 0,
      calculatedTotal: 0,
      contributedMonths: 0,
      averageMonthly: 0,
      lastContributionMonth: null,
      raw: row,
    };

    onSave(payer, row);
  }

  return (
    <Modal title="Novo dizimista" onClose={onClose} onSave={save}>
      <Field label="Nome" value={draft.name} onChange={(value) => set("name", value)} />
      <Field label="Congregacao" value={draft.congregation} onChange={(value) => set("congregation", value)} />
      <Field label="Setor" value={draft.sector} onChange={(value) => set("sector", value)} />
      <Field label="Area" value={draft.area} onChange={(value) => set("area", value)} />
      <Field label="Ano" value={draft.year} onChange={(value) => set("year", value)} />
    </Modal>
  );
}

function TitheContributionModal({ payers, onClose, onSave }: { payers: TithePayer[]; onClose: () => void; onSave: (contribution: TitheContribution, row: Record<string, string>) => void }) {
  const [draft, setDraft] = useState({
    payerId: payers[0]?.id ?? "",
    month: "Julho",
    year: String(new Date().getFullYear()),
    amount: "",
  });

  const set = (key: keyof typeof draft, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const payer = payers.find((item) => item.id === draft.payerId);

  function save() {
    if (!payer) {
      toast.error("Selecione um dizimista");
      return;
    }

    const month = getTitheMonthByLabel(draft.month);
    const amount = parseMoney(draft.amount);
    const year = Number(draft.year);
    if (!month) {
      toast.error("Selecione o mes");
      return;
    }
    if (!amount || amount <= 0) {
      toast.error("Informe um valor valido");
      return;
    }
    if (!Number.isFinite(year)) {
      toast.error("Informe o ano");
      return;
    }

    const row = {
      "Nome Completo": payer.name,
      CONGREGACAO: payer.congregation,
      SETOR: payer.sector,
      AREA: payer.area,
      ano: String(year),
      [month.label]: draft.amount,
    };
    const contribution: TitheContribution = {
      id: `local_contribution_${crypto.randomUUID()}`,
      tithePayerId: payer.id,
      tithePayerName: payer.name,
      month: month.label,
      monthNumber: TITHE_MONTHS.findIndex((item) => item.key === month.key) + 1,
      amount,
      year,
      congregation: payer.congregation,
      sector: payer.sector,
      area: payer.area,
      raw: row,
    };

    onSave(contribution, row);
  }

  return (
    <Modal title="Lancar dizimo mensal" onClose={onClose} onSave={save}>
      <label className="min-w-0 text-sm font-medium">
        Dizimista
        <Select className="mt-2 w-full" value={draft.payerId} onChange={(event) => set("payerId", event.target.value)}>
          {payers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="min-w-0 text-sm font-medium">
        Mes
        <Select className="mt-2 w-full" value={draft.month} onChange={(event) => set("month", event.target.value)}>
          {TITHE_MONTHS.map((month) => (
            <option key={month.key} value={month.label}>
              {month.label}
            </option>
          ))}
        </Select>
      </label>
      <Field label="Ano" value={draft.year} onChange={(value) => set("year", value)} />
      <Field label="Valor R$" value={draft.amount} onChange={(value) => set("amount", value)} />
    </Modal>
  );
}

function MobileTithePayerCards({ payers, onSelect, onReceipt }: { payers: TithePayer[]; onSelect: (payer: TithePayer) => void; onReceipt: (contribution: TitheContribution) => void }) {
  if (!payers.length) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">Nenhum dizimista encontrado com os filtros atuais.</CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-3 overflow-hidden">
      {payers.map((payer) => {
        const receipt = latestContributionFromPayer(payer);
        return (
          <Card key={payer.id} className="w-full min-w-0 max-w-full overflow-hidden">
            <CardContent className="p-4">
              <div className="flex min-w-0 flex-col gap-3 min-[390px]:flex-row min-[390px]:items-start min-[390px]:justify-between">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold leading-5">{payer.name}</p>
                  <p className="mt-1 break-words text-xs text-muted-foreground">{payer.congregation || "Congregacao nao informada"}</p>
                </div>
                <div className="grid shrink-0 grid-cols-2 gap-2 min-[390px]:flex">
                  <Button variant="outline" size="sm" onClick={() => onSelect(payer)}>
                    <Eye className="h-4 w-4" />
                    Ver
                  </Button>
                  <Button variant="secondary" size="sm" disabled={!receipt} onClick={() => receipt && onReceipt(receipt)}>
                    <Receipt className="h-4 w-4" />
                    Recibo
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 min-[430px]:grid-cols-2">
                <MobileInfo label="Total anual" value={formatCurrency(payer.annualTotal)} strong />
                <MobileInfo label="Ultimo mes" value={payer.lastContributionMonth ?? "Sem contribuicao"} />
                <MobileInfo label="Meses" value={payer.contributedMonths} />
                <MobileInfo label="Media mensal" value={formatCurrency(payer.averageMonthly)} strong />
              </div>

              <div className="mt-4 border-t border-border pt-3">
                <p className="text-[11px] font-medium uppercase tracking-normal text-muted-foreground">Meses com contribuicao</p>
                <div className="mt-2 flex max-w-full flex-wrap gap-2">
                  {getPaidMonths(payer).length ? (
                    getPaidMonths(payer).map((month) => (
                      <div key={month.key} className="min-w-0 flex-1 basis-[86px] rounded-md border border-border bg-surface px-3 py-2">
                        <p className="text-xs font-semibold text-primary">{month.short}</p>
                        <p className="mt-1 whitespace-nowrap text-xs font-semibold">{formatCurrency(month.amount)}</p>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Sem valores mensais pagos.</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function MobileContributionCards({ contributions, onReceipt }: { contributions: TitheContribution[]; onReceipt: (contribution: TitheContribution) => void }) {
  if (!contributions.length) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">Nenhuma contribuicao encontrada com os filtros atuais.</CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-3 overflow-hidden">
      {contributions.map((contribution) => (
        <Card key={contribution.id} className="w-full min-w-0 max-w-full overflow-hidden">
          <CardContent className="p-4">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold leading-5">{contribution.tithePayerName}</p>
                <p className="mt-1 break-words text-xs text-muted-foreground">{contribution.congregation || "Congregacao nao informada"}</p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-primary">{formatCurrency(contribution.amount)}</p>
            </div>

            <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 min-[430px]:grid-cols-2">
              <MobileInfo label="Mes" value={contribution.month} />
              <MobileInfo label="Ano" value={contribution.year} />
              <MobileInfo label="Valor" value={formatCurrency(contribution.amount)} strong />
              <MobileInfo label="Congregacao" value={contribution.congregation || "Nao informada"} />
            </div>
            <Button variant="outline" className="mt-4 w-full" onClick={() => onReceipt(contribution)}>
              <Receipt className="h-4 w-4" />
              Gerar recibo
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function latestContributionFromPayer(payer: TithePayer): TitheContribution | null {
  const paidMonths = getPaidMonths(payer);
  const latest = paidMonths.at(-1);
  if (!latest) return null;

  const year = Number(sheetValueToReceiptText(payer.raw.ano ?? payer.raw.Ano)) || new Date().getFullYear();
  return {
    id: `${payer.id}_${latest.key}`,
    tithePayerId: payer.id,
    tithePayerName: payer.name,
    month: latest.label,
    monthNumber: TITHE_MONTHS.findIndex((month) => month.key === latest.key) + 1,
    amount: latest.amount,
    year,
    congregation: payer.congregation,
    sector: payer.sector,
    area: payer.area,
    raw: payer.raw,
  };
}

function TitheProfile({ payer, onClose }: { payer: TithePayer; onClose: () => void }) {
  const paidMonths = getPaidMonths(payer);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 sm:p-4">
      <Card className="max-h-[92vh] w-full max-w-4xl overflow-y-auto">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="break-words">{payer.name}</CardTitle>
            <p className="mt-1 break-words text-sm text-muted-foreground">{payer.congregation || "Congregacao nao informada"}</p>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0" onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid min-w-0 grid-cols-1 gap-2 min-[430px]:grid-cols-2 lg:grid-cols-4">
            <MobileInfo label="Total anual" value={formatCurrency(payer.annualTotal)} strong />
            <MobileInfo label="Soma dos meses" value={formatCurrency(payer.calculatedTotal)} strong />
            <MobileInfo label="Ultimo mes" value={payer.lastContributionMonth ?? "Sem contribuicao"} />
            <MobileInfo label="Media mensal" value={formatCurrency(payer.averageMonthly)} strong />
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Valores mes a mes</h3>
              <Badge>{paidMonths.length} meses pagos</Badge>
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-2 min-[430px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {TITHE_MONTHS.map((month) => {
                const amount = payer.monthlyTithes[month.key] ?? 0;
                const paid = amount > 0;
                return (
                  <div key={month.key} className={cn("rounded-md border p-3", paid ? "border-primary/35 bg-surface" : "border-border bg-background/45")}>
                    <p className={cn("text-xs font-semibold", paid ? "text-primary" : "text-muted-foreground")}>{month.label}</p>
                    <p className="mt-1 whitespace-nowrap text-sm font-semibold">{formatCurrency(amount)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <details className="rounded-md border border-border">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Dados completos da linha</summary>
            <pre className="max-h-72 overflow-auto border-t border-border bg-muted p-3 text-xs">{JSON.stringify(payer.raw, null, 2)}</pre>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}

function getPaidMonths(payer: TithePayer) {
  return TITHE_MONTHS.map((month) => ({ ...month, amount: payer.monthlyTithes[month.key] ?? 0 })).filter((month) => month.amount > 0);
}
