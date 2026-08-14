/** @vitest-environment jsdom */
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const invalidateBadge = vi.fn().mockResolvedValue(undefined);
const invalidateMine = vi.fn().mockResolvedValue(undefined);
const deleteRequest = vi.fn().mockResolvedValue({ success: true, requestId: 1 });
const currentPdfData = vi.fn().mockRejectedValue(new Error("Teste de indisponibilidade da geração atual"));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { role: "convidado" } }) }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ ldRequests: { notifications: { invalidate: invalidateBadge }, mine: { invalidate: invalidateMine } } }),
    ldRequests: {
      mine: { useQuery: () => ({ data: [{ id: 1, status: "quote_ready", finalClientName: "Cliente", officeName: "Escritório", constructorName: null, submittedAt: new Date(), pdfAvailable: true }], isLoading: false }) },
      currentPdfData: { useMutation: () => ({ mutateAsync: currentPdfData, isPending: false }) },
      deleteMine: { useMutation: () => ({ mutateAsync: deleteRequest, isPending: false }) },
    },
    alfalux: { products: { useQuery: () => ({ data: [] }) }, revendaProducts: { useQuery: () => ({ data: [] }) }, acessoriosProducts: { useQuery: () => ({ data: [] }) } },
  },
}));

import { LDGuestRequests } from "./LDRequests";

describe("LDGuestRequests", () => {
  it("solicita o PDF atual de uma única resposta pronta, sem abrir o arquivo legado", async () => {
    vi.stubGlobal("open", vi.fn());
    render(React.createElement(LDGuestRequests));
    expect(currentPdfData).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /baixar pdf/i }));
    await waitFor(() => expect(currentPdfData).toHaveBeenCalledWith({ requestId: 1 }));
    expect(currentPdfData).toHaveBeenCalledTimes(1);
    expect(invalidateBadge).not.toHaveBeenCalled();
  });

  it("pede confirmação antes de excluir a solicitação do próprio LD", async () => {
    render(React.createElement(LDGuestRequests));
    const deleteButtons = screen.getAllByRole("button", { name: /^excluir$/i });
    fireEvent.click(deleteButtons[deleteButtons.length - 1]!);
    expect(screen.getByRole("heading", { name: /excluir solicitação/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^excluir solicitação$/i }));
    await waitFor(() => expect(deleteRequest).toHaveBeenCalledWith({ requestId: 1 }));
  });

  it("prioriza a geração atual do orçamento vinculado para PDFs de solicitações retroativas", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/LDRequests.tsx"), "utf8");
    expect(source).toContain("ldRequests.currentPdfData.useMutation");
    expect(source).toContain("buildCurrentLdPdfJob(payload)");
    expect(source).toContain("onCapturePdf={async (blob)");
    expect(source).toContain("freshPhotoMap={productPhotoMap}");
    expect(source).not.toContain("openLdValidatedPdf");
  });
});
