import { BadgeCheck, FileText, Search, Wrench } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PatrimonyAsset } from "@/application/data/PatrimonyService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Info } from "./shared";

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

export function CameraScannerModal({ assets, onClose }: { assets: PatrimonyAsset[]; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PatrimonyAsset | null>(assets[0] ?? null);
  const [resultStatus, setResultStatus] = useState("Solicitando acesso a camera");
  const [cameraReady, setCameraReady] = useState(false);
  const [scannerSupported, setScannerSupported] = useState(Boolean(window.BarcodeDetector));

  useEffect(() => {
    let cancelled = false;
    let animationFrame = 0;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setResultStatus("Camera indisponivel neste navegador. Use a busca manual.");
        setScannerSupported(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraReady(true);

        if (!window.BarcodeDetector) {
          setScannerSupported(false);
          setResultStatus("Camera aberta. Leitura automatica nao suportada; digite o codigo abaixo.");
          return;
        }

        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        setResultStatus("Aponte a camera para o QR Code da etiqueta.");

        const scan = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            if (videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
              const codes = await detector.detect(videoRef.current);
              const rawValue = codes[0]?.rawValue;
              if (rawValue) {
                const parsedCode = extractAssetCode(rawValue);
                setQuery(parsedCode);
                findAsset(parsedCode, "QR Code lido pela camera");
                return;
              }
            }
          } catch {
            setResultStatus("Nao consegui ler este quadro. Aproxime a etiqueta ou use a busca manual.");
          }
          animationFrame = window.requestAnimationFrame(scan);
        };

        animationFrame = window.requestAnimationFrame(scan);
      } catch {
        setResultStatus("Permissao da camera negada ou indisponivel. Use a busca manual.");
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  function search() {
    findAsset(query, "Patrimonio localizado");
  }

  function findAsset(value: string, successMessage: string) {
    const found = findAssetByCodeOrText(assets, value);
    setSelected(found ?? null);
    setResultStatus(found ? successMessage : "Nao encontrado");
  }

  function mark(status: string) {
    setResultStatus(status);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <Card className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-b-none sm:rounded-lg">
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Conferencia por camera</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Use a camera do celular para ler a etiqueta patrimonial ou informe o codigo manualmente.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <FileText className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="relative min-h-72 overflow-hidden rounded-lg border border-border bg-black">
              <video ref={videoRef} className="h-72 w-full object-cover" playsInline muted />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-40 w-40 rounded-xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.28)]" />
              </div>
              <div className="absolute bottom-3 left-3 right-3 rounded-md bg-black/65 px-3 py-2 text-xs text-white">
                {cameraReady ? (scannerSupported ? "Camera ativa: procurando QR Code" : "Camera ativa: leitura automatica indisponivel") : "Abrindo camera"}
              </div>
            </div>
            <div className="grid gap-3">
              <label className="text-xs font-medium text-muted-foreground">
                Codigo patrimonial
                <Input className="mt-1" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ex: ADM-S02-MR-SOM-0001" />
              </label>
              <Button onClick={search}>
                <Search className="h-4 w-4" />
                Buscar
              </Button>
              <Badge>{resultStatus}</Badge>
              {selected ? (
                <div className="grid gap-2 rounded-md border border-border p-3">
                  <p className="font-semibold">{selected.description}</p>
                  <p className="text-sm text-muted-foreground">{selected.code} | {selected.congregation} | {selected.internalLocation}</p>
                  <Info label="Responsavel" value={selected.responsible} />
                  <Info label="Estado" value={selected.conservationState} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum patrimonio selecionado.</p>
              )}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Button onClick={() => mark("Existencia confirmada")} disabled={!selected}>
              <BadgeCheck className="h-4 w-4" />
              Confirmar existencia
            </Button>
            <Button variant="outline" onClick={() => mark("Marcado como nao localizado")} disabled={!selected}>
              Nao localizado
            </Button>
            <Button variant="outline" onClick={() => mark("Enviado para manutencao")} disabled={!selected}>
              <Wrench className="h-4 w-4" />
              Manutencao
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function extractAssetCode(value: string) {
  try {
    const url = new URL(value);
    return url.searchParams.get("bem") ?? value;
  } catch {
    return value;
  }
}

export function findAssetByCodeOrText(assets: PatrimonyAsset[], value: string) {
  const normalized = extractAssetCode(value).trim().toLowerCase();
  if (!normalized) return null;
  return assets.find((asset) => asset.code.toLowerCase() === normalized || asset.code.toLowerCase().includes(normalized) || asset.description.toLowerCase().includes(normalized)) ?? null;
}
