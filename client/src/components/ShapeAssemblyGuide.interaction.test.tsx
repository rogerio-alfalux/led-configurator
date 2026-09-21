/** @vitest-environment jsdom */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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

  it("expõe um link físico e nativo para a página de impressão em nova aba", () => {
    render(<ShapeAssemblyGuide result={result} />);

    fireEvent.click(screen.getByRole("button", { name: "Guia de Montagem" }));
    expect(screen.getByText("Guia de montagem — BLAZE H")).toBeTruthy();

    const link = screen.getByRole("link", { name: "Abrir guia de montagem para impressão" });
    expect(link.getAttribute("href")).toMatch(/^\/guia-montagem\/imprimir\?data=/);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.className).toContain("cursor-pointer");
  });
});
