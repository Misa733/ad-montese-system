import { getAssetQrUrl, type PatrimonyAsset } from "@/application/data/PatrimonyService";
import { escapeHtml } from "./shared";

export function getQrImage(asset: PatrimonyAsset) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(getAssetQrUrl(asset))}`;
}

export function printAssetLabel(asset: PatrimonyAsset) {
  const printWindow = window.open("", "_blank", "width=420,height=640");
  if (!printWindow) return;
  const logo = `${window.location.origin}/assets/logo.png`;
  const qr = getQrImage(asset);
  const returnUrl = window.location.href;
  printWindow.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Etiqueta ${escapeHtml(asset.code)}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 12px; font-family: Arial, sans-serif; color: #111; }
          .toolbar { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
          .toolbar button, .toolbar a { min-height: 40px; border: 1px solid #7A0C10; border-radius: 8px; background: #7A0C10; color: #fff; font: 700 13px Arial; text-decoration: none; display: flex; align-items: center; justify-content: center; }
          .toolbar a { background: #fff; color: #7A0C10; }
          .label { width: 80mm; border: 1px dashed #999; padding: 8px; text-align: center; }
          .logo { width: 54px; height: 54px; object-fit: contain; }
          .qr { width: 112px; height: 112px; margin: 4px auto; display: block; }
          h1 { margin: 4px 0; color: #7A0C10; font-size: 15px; }
          p { margin: 2px 0; font-size: 12px; }
          strong { font-size: 14px; }
          @media print { body { padding: 0; } .toolbar { display: none; } .label { border: 0; } }
        </style>
      </head>
      <body>
        <nav class="toolbar">
          <button onclick="window.print()">Imprimir</button>
          <a href="${escapeHtml(returnUrl)}" onclick="if (window.opener) window.close()">Voltar</a>
        </nav>
        <section class="label">
          <img class="logo" src="${logo}" alt="AD Montese" />
          <h1>AD Montese</h1>
          <img class="qr" src="${qr}" alt="QR Code" />
          <strong>${escapeHtml(asset.code)}</strong>
          <p>${escapeHtml(asset.shortDescription || asset.description)}</p>
        </section>
      </body>
    </html>
  `);
  printWindow.document.close();
}
