/** @vitest-environment jsdom */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuoteExportOptionsDialog } from "./QuoteExportOptionsDialog";

describe("QuoteExportOptionsDialog", () => {
  it("oferece unificação somente para PDF e a mantém desmarcada por padrão", () => {
    const onConfirm = vi.fn();
    render(React.createElement(QuoteExportOptionsDialog, {
      open: true,
      format: "PDF",
      onOpenChange: () => undefined,
      onConfirm,
    }));

    const [, unify] = screen.getAllByRole("checkbox");
    expect(unify.getAttribute("data-state")).toBe("unchecked");

    fireEvent.click(screen.getByRole("button", { name: "Gerar PDF" }));
    expect(onConfirm).toHaveBeenCalledWith(false, false);
  });

  it("envia IPI e unificação como escolhas independentes", () => {
    const onConfirm = vi.fn();
    render(React.createElement(QuoteExportOptionsDialog, {
      open: true,
      format: "PDF",
      onOpenChange: () => undefined,
      onConfirm,
    }));

    const [showIpi, unify] = screen.getAllByRole("checkbox");
    fireEvent.click(showIpi);
    fireEvent.click(unify);
    fireEvent.click(screen.getByRole("button", { name: "Gerar PDF" }));
    expect(onConfirm).toHaveBeenCalledWith(true, true);
  });

  it("não oferece unificação ao gerar Excel", () => {
    render(React.createElement(QuoteExportOptionsDialog, {
      open: true,
      format: "Excel",
      onOpenChange: () => undefined,
      onConfirm: () => undefined,
    }));

    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
  });
});
