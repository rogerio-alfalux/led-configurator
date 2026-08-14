export async function waitForPreviewImages(images: Array<Pick<HTMLImageElement, "complete" | "addEventListener">>, timeoutMs = 4_000) {
  await Promise.all(images.map(image => image.complete
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
        globalThis.setTimeout(resolve, timeoutMs);
      })));
}

type CanvasLike = { width: number; height: number; toDataURL: (type: string, quality?: number) => string };
type PdfLike = { internal: { pageSize: { getWidth: () => number; getHeight: () => number } }; addPage: () => unknown; addImage: (...args: any[]) => unknown; output: (type: "blob") => Blob };
type PdfMargins = { top: number; right: number; bottom: number; left: number };

export async function capturePreviewPagePdf(input: {
  page: Pick<HTMLElement, "querySelectorAll">;
  rasterize: (page: unknown) => Promise<CanvasLike>;
  createPdf: () => PdfLike;
  margins?: PdfMargins;
}) {
  const images = Array.from(input.page.querySelectorAll("img")) as HTMLImageElement[];
  await waitForPreviewImages(images);
  const canvas = await input.rasterize(input.page);
  const pdf = input.createPdf();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margins = input.margins ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const printableWidth = pageWidth - margins.left - margins.right;
  const printableHeight = pageHeight - margins.top - margins.bottom;
  const imageHeight = (canvas.height * printableWidth) / canvas.width;
  const imageData = canvas.toDataURL("image/jpeg", 0.95);
  let offset = 0;
  while (offset < imageHeight) {
    if (offset > 0) pdf.addPage();
    pdf.addImage(imageData, "JPEG", margins.left, margins.top - offset, printableWidth, imageHeight, undefined, "FAST");
    offset += printableHeight;
  }
  return pdf.output("blob");
}

export function downloadPdfBlob(blob: Blob, fileName: string, documentRef?: Document, createObjectUrl?: (value: Blob) => string, revokeObjectUrl?: (url: string) => void) {
  if (blob.size === 0) throw new Error("O PDF gerado está vazio.");
  const activeDocument = documentRef ?? document;
  const createUrl = createObjectUrl ?? URL.createObjectURL;
  const revokeUrl = revokeObjectUrl ?? URL.revokeObjectURL;
  const url = createUrl(blob);
  console.log("[PDF Download] Blob size:", blob.size, "URL:", url, "fileName:", fileName);
  try {
    // Método principal: anchor com download attribute
    const anchor = activeDocument.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = "none";
    activeDocument.body.appendChild(anchor);
    anchor.click();
    activeDocument.body.removeChild(anchor);
  } catch (e) {
    // Fallback: abrir em nova aba
    console.warn("[PDF Download] Anchor click falhou, abrindo em nova aba:", e);
    window.open(url, "_blank");
  }
  globalThis.setTimeout(() => {
    revokeUrl(url);
  }, 60_000);
}
