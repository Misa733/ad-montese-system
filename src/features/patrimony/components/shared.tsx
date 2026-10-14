import type { PatrimonyAsset } from "@/application/data/PatrimonyService";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="min-w-0 text-xs font-medium text-muted-foreground">
      {label}
      <Select className="mt-1 w-full" value={value} onChange={(event) => onChange(event.target.value)}>
        <option>Todos</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </Select>
    </label>
  );
}

export function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="min-w-0 text-xs font-medium text-muted-foreground">
      {label}
      <Input className="mt-1" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-card p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-normal break-words text-sm font-semibold leading-5 sm:text-base">{value || "-"}</p>
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardContent className="p-6 text-center">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function getAssetTotal(asset: PatrimonyAsset) {
  return asset.totalValue || asset.currentValue || asset.value || (asset.unitValue || 0) * Math.max(asset.quantity || 1, 1);
}

export function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export function escapeHtml(value: unknown) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
