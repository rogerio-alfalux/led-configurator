/** @vitest-environment jsdom */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShapeAssemblyGuide } from "./ShapeAssemblyGuide";

describe("ShapeAssemblyGuide", () => {
  const result = {
    shape: "RECTANGLE" as const,
    profileName: "BLAZE H",
    profileCode: "LLP-6060",
    assemblyEdges: [{
      id: "superior",
      label: "Superior",
      requestedLength: 4600,
      achievedLength: 4590,
      modules: [
        { type: "CORNER" as const, sku: "LLP-6060.1L1.48F", length: 600, bars: 2 },
        { type: "ML" as const, sku: "LLP-6060.3ML.48F", length: 1695, bars: 3 },
      ],
    }],
  };

  it("abre a janela dedicada e imprime quando o documento restaurado carrega", () => {
    const print = vi.fn();
    const documentOpen = vi.fn();
    const documentWrite = vi.fn();
    const documentClose = vi.fn();
    const addEventListener = vi.fn((_event: string, handler: EventListener) => handler(new Event("load")));
    const printWindow = {
      document: { open: documentOpen, write: documentWrite, close: documentClose },
      print,
      addEventListener,
    } as unknown as Window;
    const open = vi.spyOn(window, "open").mockReturnValue(printWindow);
    render(<ShapeAssemblyGuide result={result} />);

    fireEvent.click(screen.getByRole("button", { name: "Guia de Montagem" }));
    expect(screen.getByText("Guia de montagem — BLAZE H")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Imprimir guia" }));
    expect(open).toHaveBeenCalledWith("", "_blank", "width=960,height=900");
    expect(documentOpen).toHaveBeenCalledOnce();
    expect(documentWrite.mock.calls[0]?.[0]).toContain("Guia de montagem");
    expect(documentClose).toHaveBeenCalledOnce();
    expect(print).toHaveBeenCalledOnce();
    expect(screen.getByText("Guia de montagem — BLAZE H")).toBeTruthy();
    open.mockRestore();
  });
});
