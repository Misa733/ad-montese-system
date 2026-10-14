import { BadgeCheck, Boxes, ClipboardCheck, FileText, Home, QrCode, Wrench } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PatrimonyAsset } from "@/application/data/PatrimonyService";
import { useRealData } from "@/application/data/useRealData";
import { ChartCard } from "@/components/charts/ChartCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export function PatrimonyDashboard({ dashboard, assets }: { dashboard: ReturnType<ReturnType<typeof useRealData>["patrimonyService"]["buildDashboard"]>; assets: PatrimonyAsset[] }) {
  const cards = [
    { label: "Total de bens", value: dashboard.cards.total, icon: Boxes },
    { label: "Valor estimado", value: formatCurrency(dashboard.cards.estimatedValue), icon: BadgeCheck },
    { label: "Ativos", value: dashboard.cards.active, icon: BadgeCheck },
    { label: "Em manutencao", value: dashboard.cards.inMaintenance, icon: Wrench },
    { label: "Baixados", value: dashboard.cards.disposed, icon: FileText },
    { label: "Sem tombamento", value: dashboard.cards.withoutCode, icon: QrCode },
    { label: "Sem documentacao", value: dashboard.cards.withoutDocumentation, icon: FileText },
    { label: "Inventario pendente", value: dashboard.cards.pendingInventory, icon: ClipboardCheck },
    { label: "Imoveis cadastrados", value: dashboard.cards.properties, icon: Home },
    { label: "Proximas manutencoes", value: dashboard.cards.upcomingMaintenances, icon: Wrench },
  ];
  return (
    <div className="grid gap-6">
      <div className="grid gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="min-w-0">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 break-words text-2xl font-semibold">{value}</p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-surface text-primary">
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <PatrimonyBar title="Patrimonio por Area" data={dashboard.byArea} />
        <PatrimonyBar title="Patrimonio por Setor" data={dashboard.bySector} />
        <PatrimonyBar title="Patrimonio por Congregacao" data={dashboard.byCongregation} />
        <PatrimonyBar title="Patrimonio por Categoria" data={dashboard.byCategory} />
        <PatrimonyBar title="Estado dos bens" data={dashboard.byStatus} />
        <PatrimonyBar title="Estado de conservacao" data={dashboard.byConservation} />
        <PatrimonyBar title="Valor patrimonial" data={dashboard.valueByCongregation} currency />
        <PatrimonyBar title="Bens por responsavel" data={dashboard.byResponsible} />
        <PatrimonyBar title="Bens adquiridos por ano" data={dashboard.acquiredByYear} />
        <PatrimonyBar title="Inventarios por status" data={dashboard.inventoriesByStatus} />
        <Card>
          <CardHeader>
            <CardTitle>Ultimos patrimonios cadastrados</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {(dashboard.latestAssets.length ? dashboard.latestAssets : assets.slice(0, 6)).map((asset) => (
              <div key={asset.id} className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{asset.description}</p>
                  <p className="text-sm text-muted-foreground">{asset.code} | {asset.congregation}</p>
                </div>
                <Badge>{asset.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PatrimonyBar({ title, data, currency = false }: { title: string; data: Array<{ name: string; value: number }>; currency?: boolean }) {
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={(value) => (currency ? formatCurrency(Number(value)) : Number(value))} />
          <Bar dataKey="value" fill="#7A0C10" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
