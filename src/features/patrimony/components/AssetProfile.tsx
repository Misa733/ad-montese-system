import { Printer, QrCode } from "lucide-react";
import { getAssetQrUrl, type PatrimonyAsset } from "@/application/data/PatrimonyService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { getQrImage } from "./labels";
import { EmptyState, Info, getAssetTotal } from "./shared";

export function AssetProfile({ asset, onPrintLabel }: { asset?: PatrimonyAsset; onPrintLabel: (asset: PatrimonyAsset) => void }) {
  if (!asset) {
    return <EmptyState title="Nenhum patrimonio selecionado" description="Abra o catalogo e selecione um bem para visualizar a ficha completa." />;
  }
  const qrUrl = getQrImage(asset);
  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>{asset.description}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{asset.code} | {asset.congregation}</p>
          </div>
          <Badge>{asset.status}</Badge>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Info label="Categoria" value={asset.category} />
            <Info label="Localizacao" value={asset.location || asset.congregation} />
            <Info label="Setor" value={asset.sector} />
            <Info label="Area" value={asset.area} />
            <Info label="Responsavel" value={asset.responsible} />
            <Info label="Quantidade" value={asset.quantity || 1} />
            <Info label="Valor unitario" value={formatCurrency(asset.unitValue || asset.value)} />
            <Info label="Valor total" value={formatCurrency(getAssetTotal(asset))} />
            <Info label="Estado" value={asset.conservationState || "Nao informado"} />
            <Info label="Marca / modelo" value={[asset.brand, asset.model].filter(Boolean).join(" / ") || "Nao informado"} />
            <Info label="Data aquisicao" value={asset.acquisitionDate || "Nao informada"} />
            <Info label="Forma aquisicao" value={asset.acquisitionMethod || "Nao informada"} />
            <Info label="Documentos" value={asset.documentation} />
            <Info label="Ultima conferencia" value={asset.lastInventoryAt || "Pendente"} />
          </div>
          <Info label="Observacoes" value={asset.observations || "Sem observacoes registradas."} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>QR Code e Etiqueta</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex justify-center rounded-md border border-border bg-white p-4">
            <img className="h-44 w-44" src={qrUrl} alt={`QR Code ${asset.code}`} />
          </div>
          <div className="grid gap-2">
            <Button onClick={() => onPrintLabel(asset)}>
              <Printer className="h-4 w-4" />
              Imprimir etiqueta
            </Button>
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(getAssetQrUrl(asset))}>
              <QrCode className="h-4 w-4" />
              Copiar link do QR Code
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
