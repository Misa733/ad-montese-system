import { Receipt, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import type { TitheContribution } from "@/application/data/TitheService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";
import { Field, escapeHtml } from "../modules/shared";
import { formatDateLabel } from "../reports/ReportsPage";

function buildReceiptNumber(contribution: TitheContribution) {
  const rawNumber = contribution.raw["N"] ?? contribution.raw["Nº"] ?? contribution.raw["NÂº"] ?? contribution.raw.numero ?? contribution.raw.Numero;
  const base = sheetValueToReceiptText(rawNumber) || contribution.id.replace(/\D/g, "").slice(-4);
  return base || String(Date.now()).slice(-5);
}

function printReceipt(draft: ReceiptDraft) {
  const printWindow = window.open("", "_blank", "width=420,height=640");
  if (!printWindow) {
    toast.error("Nao foi possivel abrir a janela de impressao.");
    return;
  }

  const logo = `${window.location.origin}/assets/logo.png`;
  const returnUrl = window.location.href;
  const emittedAt = new Date().toLocaleString("pt-BR");
  printWindow.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Recibo de Doacao</title>
        <style>
          @page { size: 80mm auto; margin: 4mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #000; font-family: Arial, sans-serif; font-size: 12px; }
          .toolbar {
            position: sticky;
            top: 0;
            z-index: 2;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            padding: 10px;
            background: #f4f4f4;
            border-bottom: 1px solid #d8d8d8;
          }
          .toolbar button,
          .toolbar a {
            display: inline-flex;
            min-height: 42px;
            align-items: center;
            justify-content: center;
            border: 1px solid #7A0C10;
            border-radius: 8px;
            background: #7A0C10;
            color: #fff;
            font: 700 14px Arial, sans-serif;
            text-decoration: none;
          }
          .toolbar a { background: #fff; color: #7A0C10; }
          .receipt { width: 72mm; margin: 0 auto; }
          .logo { display: block; width: 30mm; max-height: 18mm; object-fit: contain; margin: 0 auto 2mm; }
          h1 { margin: 0 0 3mm; text-align: center; font-size: 16px; font-weight: 800; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          td { border: 1px solid #000; padding: 2mm 1.5mm; vertical-align: top; font-size: 12px; font-weight: 700; }
          td:first-child { width: 25mm; }
          .value { word-break: break-word; }
          .signature { margin: 18mm 0 5mm; text-align: center; }
          .line { border-top: 1px solid #000; margin: 0 8mm 3mm; }
          .agent { font-weight: 700; }
          .emitted { text-align: center; font-size: 10px; }
          .cut { margin-top: 4mm; border-top: 1px dashed #000; }
          @media screen { body { background: #eee; } .receipt { background: #fff; padding: 4mm; margin-top: 12px; } }
          @media print { .toolbar { display: none; } body { padding: 0; } }
        </style>
      </head>
      <body>
        <nav class="toolbar">
          <button type="button" onclick="window.print()">Imprimir</button>
          <a href="${escapeHtml(returnUrl)}" onclick="if (window.opener) { window.close(); }">Voltar ao sistema</a>
        </nav>
        <main class="receipt">
          <img class="logo" src="${logo}" alt="AD Montese" />
          <h1>Recibo de Doacao</h1>
          <table>
            <tr><td>No Local:</td><td class="value">${escapeHtml(draft.localNumber)}</td></tr>
            <tr><td>Tipo:</td><td class="value">${escapeHtml(draft.type)}</td></tr>
            <tr><td>Nome:</td><td class="value">${escapeHtml(draft.name)}</td></tr>
            <tr><td>Data:</td><td class="value">${escapeHtml(formatDateLabel(draft.date))}</td></tr>
            <tr><td>Forma:</td><td class="value">${escapeHtml(draft.paymentMethod)}</td></tr>
            <tr><td>Valor R$:</td><td class="value">${escapeHtml(draft.amount)}</td></tr>
            <tr><td>Igreja:</td><td class="value">${escapeHtml(draft.church)}</td></tr>
          </table>
          <section class="signature">
            <div class="line"></div>
            <div class="agent">Agente Recebedor</div>
          </section>
          <p class="emitted">Emitido em: ${emittedAt}</p>
          <div class="cut"></div>
        </main>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export function sheetValueToReceiptText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

interface ReceiptDraft {
  localNumber: string;
  type: string;
  name: string;
  date: string;
  paymentMethod: string;
  amount: string;
  church: string;
}

export function ReceiptModal({ contribution, onClose }: { contribution: TitheContribution; onClose: () => void }) {
  const [draft, setDraft] = useState<ReceiptDraft>(() => ({
    localNumber: buildReceiptNumber(contribution),
    type: "Dizimo",
    name: contribution.tithePayerName,
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: "Dinheiro",
    amount: formatCurrency(contribution.amount).replace("R$", "").trim(),
    church: contribution.congregation || "Sede Montese",
  }));

  const set = (key: keyof ReceiptDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card shadow-soft">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
          <h2 className="break-words text-lg font-semibold">Recibo de dizimo</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar"><X className="h-4 w-4" /></Button>
        </div>
        <div className="grid min-w-0 gap-3 p-4 sm:grid-cols-2 sm:gap-4 sm:p-5">
          <Field label="No Local" value={draft.localNumber} onChange={(value) => set("localNumber", value)} />
          <Field label="Tipo" value={draft.type} onChange={(value) => set("type", value)} />
          <Field label="Nome" value={draft.name} onChange={(value) => set("name", value)} />
          <Field label="Data" type="date" value={draft.date} onChange={(value) => set("date", value)} />
          <Field label="Forma" value={draft.paymentMethod} onChange={(value) => set("paymentMethod", value)} />
          <Field label="Valor R$" value={draft.amount} onChange={(value) => set("amount", value)} />
          <label className="min-w-0 text-sm font-medium sm:col-span-2">
            Igreja
            <Input className="mt-2 min-w-0" value={draft.church} onChange={(event) => set("church", event.target.value)} />
          </label>
        </div>
        <div className="grid gap-2 border-t border-border p-4 sm:flex sm:flex-row sm:justify-end sm:p-5">
          <Button variant="outline" className="w-full sm:w-auto" onClick={onClose}>Cancelar</Button>
          <Button className="w-full sm:w-auto" onClick={() => printReceipt(draft)}>
            <Receipt className="h-4 w-4" />
            Imprimir recibo
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MobileInfo({ label, value, strong = false }: { label: string; value: string | number; strong?: boolean }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-md border border-border bg-background/45 p-3">
      <p className="break-words text-[11px] font-medium uppercase leading-4 tracking-normal text-muted-foreground">{label}</p>
      <p className={cn("mt-1 break-words text-sm", strong ? "font-semibold text-foreground" : "font-medium")}>{value}</p>
    </div>
  );
}
