/** @vitest-environment jsdom */
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const invalidateBadge = vi.fn().mockResolvedValue(undefined);
const invalidateMine = vi.fn().mockResolvedValue(undefined);
const deleteRequest = vi.fn().mockResolvedValue({ success: true, requestId: 1 });
const markResponseViewed = vi.fn().mockResolvedValue({ success: true });
const getResponsePdf = vi.fn().mockResolvedValue({ url: "/api/assets/ld-quotes/7/1/orcamento.pdf" });

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { role: "convidado" } }) }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ ldRequests: { notifications: { invalidate: invalidateBadge }, mine: { invalidate: invalidateMine } } }),
    ldRequests: {
      mine: { useQuery: () => ({ data: [{ id: 1, status: "quote_ready", finalClientName: "Cliente", officeName: "Escritório", constructorName: null, submittedAt: new Date(), pdfAvailable: true }], isLoading: false }) },
      myPdf: { useMutation: () => ({ mutateAsync: getResponsePdf, isPending: false }) },
      markResponseViewed: { useMutation: () => ({ mutateAsync: markResponseViewed, isPending: false }) },
      deleteMine: { useMutation: () => ({ mutateAsync: deleteRequest, isPending: false }) },
    },
  },
}));

import { LDGuestRequests } from "./LDRequests";

describe("LDGuestRequests", () => {
  it("abre o PDF validado da resposta pronta e registra sua visualização", async () => {
    const popup = { location: { href: "" }, close: vi.fn() } as unknown as Window;
    const open = vi.spyOn(window, "open").mockReturnValue(popup);
    render(React.createElement(LDGuestRequests));
    expect(markResponseViewed).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /ver resposta/i }));
    await waitFor(() => expect(getResponsePdf).toHaveBeenCalledWith({ requestId: 1 }));
    await waitFor(() => expect(markResponseViewed).toHaveBeenCalledWith({ requestId: 1 }));
    expect(markResponseViewed).toHaveBeenCalledTimes(1);
    expect(invalidateBadge).toHaveBeenCalled();
    expect(open).toHaveBeenCalledWith("about:blank", "_blank");
    expect((popup.location as unknown as { href: string }).href).toBe("/api/assets/ld-quotes/7/1/orcamento.pdf");
    open.mockRestore();
  });

  it("pede confirmação antes de excluir a solicitação do próprio LD", async () => {
    render(React.createElement(LDGuestRequests));
    const deleteButtons = screen.getAllByRole("button", { name: /^excluir$/i });
    fireEvent.click(deleteButtons[deleteButtons.length - 1]!);
    expect(screen.getByRole("heading", { name: /excluir solicitação/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^excluir solicitação$/i }));
    await waitFor(() => expect(deleteRequest).toHaveBeenCalledWith({ requestId: 1 }));
  });

  it("não carrega dados comerciais brutos; usa exclusivamente o PDF validado para a solicitação do LD", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/LDRequests.tsx"), "utf8");
    expect(source).toContain("ldRequests.myPdf.useMutation");
    expect(source).toContain("ldRequests.markResponseViewed.useMutation");
    expect(source).not.toContain("currentPdfData");
    expect(source).not.toContain("ExcelPreviewModal");
    expect(source).toContain("onPreview={() => openOfficialPreview(request.id)}");
    expect(source).not.toContain("downloadPdfBlob(blob, currentPdfJob.fileName)");
    expect(source).not.toContain("openLdValidatedPdf");
  });
});
