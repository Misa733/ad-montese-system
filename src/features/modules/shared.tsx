import { Save, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function escapeHtml(value: unknown) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function SimpleCreateModal({ title, fields, onClose, onSave }: { title: string; fields: string[]; onClose: () => void; onSave: (row: Record<string, string>) => void }) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  return (
    <Modal title={title} onClose={onClose} onSave={() => onSave(draft)}>
      {fields.map((field) => <Field key={field} label={field} value={draft[field]} onChange={(value) => setDraft((current) => ({ ...current, [field]: value }))} />)}
    </Modal>
  );
}

export function Modal({ title, children, onClose, onSave }: { title: string; children: React.ReactNode; onClose: () => void; onSave: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 sm:p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-card shadow-soft">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
          <h2 className="break-words text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar"><X className="h-4 w-4" /></Button>
        </div>
        <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2">{children}</div>
        <div className="flex flex-col-reverse gap-2 border-t border-border p-4 sm:flex-row sm:justify-end sm:p-5">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSave}><Save className="h-4 w-4" />Salvar</Button>
        </div>
      </div>
    </div>
  );
}

export function RawModal({ title, raw, onClose }: { title: string; raw: Record<string, unknown>; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 sm:p-4">
      <Card className="max-h-[92vh] w-full max-w-4xl overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar"><X className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          <pre className="max-w-full overflow-auto rounded-md bg-muted p-3 text-xs sm:p-4">{JSON.stringify(raw, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="min-w-0">
      <CardContent className="min-w-0 p-4 sm:p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 break-words text-xl font-semibold sm:text-2xl">{value}</p>
      </CardContent>
    </Card>
  );
}

export function Filter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="text-xs font-medium text-muted-foreground">
      {label}
      <Select className="mt-1 w-full" value={value} onChange={(event) => onChange(event.target.value)}>
        <option>Todos</option>
        {options.map((option) => <option key={option}>{option}</option>)}
      </Select>
    </label>
  );
}

export function Field({ label, value, onChange, type = "text" }: { label: string; value?: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="min-w-0 text-sm font-medium">
      {label}
      <Input className="mt-2 min-w-0 max-w-full" type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}
