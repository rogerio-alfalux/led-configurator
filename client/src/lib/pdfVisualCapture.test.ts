import { describe, expect, it, vi } from "vitest";
import { capturePreviewPagePdf, waitForPreviewImages } from "./pdfVisualCapture";

describe("captura visual de PDF", () => {
  it("aguarda as fotos pendentes antes de iniciar a captura", async () => {
    let onLoad: (() => void) | undefined;
    const image = { complete: false, addEventListener: vi.fn((event: string, callback: () => void) => { if (event === "load") onLoad = callback; }) };
    const waiting = waitForPreviewImages([image], 50);
    expect(image.addEventListener).toHaveBeenCalledWith("load", expect.any(Function), { once: true });
    onLoad?.();
    await expect(waiting).resolves.toBeUndefined();
  });

  it("não aguarda fotos já carregadas", async () => {
    const image = { complete: true, addEventListener: vi.fn() };
    await waitForPreviewImages([image]);
    expect(image.addEventListener).not.toHaveBeenCalled();
  });

  it("captura fotos renderizadas em um Blob paginado de PDF", async () => {
    const image = { complete: true, addEventListener: vi.fn() };
    const page = { querySelectorAll: vi.fn().mockReturnValue([image]) } as unknown as HTMLElement;
    const rasterize = vi.fn().mockResolvedValue({ width: 100, height: 300, toDataURL: vi.fn().mockReturnValue("data:image/jpeg;base64,foto") });
    const blob = new Blob(["pdf"], { type: "application/pdf" });
    const pdf = { internal: { pageSize: { getWidth: () => 100, getHeight: () => 100 } }, addPage: vi.fn(), addImage: vi.fn(), output: vi.fn().mockReturnValue(blob) };
    await expect(capturePreviewPagePdf({ page, rasterize, createPdf: () => pdf })).resolves.toBe(blob);
    expect(rasterize).toHaveBeenCalledWith(page);
    expect(pdf.addImage).toHaveBeenCalledTimes(3);
    expect(pdf.output).toHaveBeenCalledWith("blob");
  });

  it("respeita a área útil e as margens A4 do documento oficial", async () => {
    const page = { querySelectorAll: vi.fn().mockReturnValue([]) } as unknown as HTMLElement;
    const rasterize = vi.fn().mockResolvedValue({ width: 100, height: 200, toDataURL: vi.fn().mockReturnValue("data:image/jpeg;base64,foto") });
    const blob = new Blob(["pdf"], { type: "application/pdf" });
    const pdf = { internal: { pageSize: { getWidth: () => 100, getHeight: () => 100 } }, addPage: vi.fn(), addImage: vi.fn(), output: vi.fn().mockReturnValue(blob) };
    await capturePreviewPagePdf({ page, rasterize, createPdf: () => pdf, margins: { top: 10, right: 10, bottom: 10, left: 10 } });
    expect(pdf.addImage).toHaveBeenCalledWith(expect.any(String), "JPEG", 10, 10, 80, 160, undefined, "FAST");
    expect(pdf.addPage).toHaveBeenCalledTimes(1);
  });
});
