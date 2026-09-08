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

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { role: "convidado" } }) }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ ldRequests: { notifications: { invalidate: invalidateBadge }, mine: { invalidate: invalidateMine } } }),
    ldRequests: {
      mine: { useQuery: () => ({ data: [{ id: 1, status: "quote_ready", finalClientName: "Cliente", officeName: "Escritório", constructorName: null, submittedAt: new Date(), pdfAvailable: true }], isLoading: false }) },
      markResponseViewed: { useMutation: () => ({ mutateAsync: markResponseViewed, isPending: false }) },
      deleteMine: { useMutation: () => ({ mutateAsync: deleteRequest, isPending: false }) },
    },
  },
}));

import { LDGuestRequests } from "./LDRequests";

describe("LDGuestRequests", () => {
  it("registra somente a visualização de uma resposta pronta, sem abrir documento comercial", async () => {
    render(React.createElement(LDGuestRequests));
    expect(markResponseViewed).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /ver resposta/i }));
    await waitFor(() => expect(markResponseViewed).toHaveBeenCalledWith({ requestId: 1 }));
    expect(markResponseViewed).toHaveBeenCalledTimes(1);
    expect(invalidateBadge).toHaveBeenCalled();
  });

  it("pede confirmação antes de excluir a solicitação do próprio LD", async () => {
    render(React.createElement(LDGuestRequests));
    const deleteButtons = screen.getAllByRole("button", { name: /^excluir$/i });
    fireEvent.click(deleteButtons[deleteButtons.length - 1]!);
    expect(screen.getByRole("heading", { name: /excluir solicitação/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^excluir solicitação$/i }));
    await waitFor(() => expect(deleteRequest).toHaveBeenCalledWith({ requestId: 1 }));
  });

  it("não carrega dados nem componentes de preview comercial para solicitações retroativas", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/LDRequests.tsx"), "utf8");
    expect(source).toContain("ldRequests.markResponseViewed.useMutation");
    expect(source).not.toContain("currentPdfData");
    expect(source).not.toContain("ExcelPreviewModal");
    expect(source).toContain("onPreview={() => openOfficialPreview(request.id)}");
    expect(source).not.toContain("downloadPdfBlob(blob, currentPdfJob.fileName)");
    expect(source).not.toContain("openLdValidatedPdf");
  });
});
