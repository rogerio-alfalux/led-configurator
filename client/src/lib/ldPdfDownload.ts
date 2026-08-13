/**
 * Mantém a URL entregue pelo servidor no mesmo host da aplicação. PDFs de LD
 * são armazenados em caminhos aninhados, como /api/assets/ld-quotes/.../arquivo.pdf.
 */
export function getLdPdfDownloadUrl(validatedPdfUrl: string): string {
  if (!validatedPdfUrl.startsWith("/api/assets/")) {
    throw new Error("O PDF validado não possui uma URL de download compatível.");
  }
  return validatedPdfUrl;
}

export async function openLdValidatedPdf(
  requestId: number,
  getPdf: (input: { requestId: number }) => Promise<{ url: string }>,
  openWindow: (url?: string | URL, target?: string, features?: string) => Window | null = window.open,
) {
  const { url } = await getPdf({ requestId });
  const downloadUrl = getLdPdfDownloadUrl(url);
  openWindow(downloadUrl, "_blank", "noopener,noreferrer");
  return downloadUrl;
}
