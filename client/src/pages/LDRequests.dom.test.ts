/** @vitest-environment jsdom */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const downloadPdf = vi.fn().mockResolvedValue({ url: "/api/assets/ld-quotes/77/1/orcamento.pdf" });
const invalidateBadge = vi.fn().mockResolvedValue(undefined);

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { role: "convidado" } }) }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ ldRequests: { notifications: { invalidate: invalidateBadge } } }),
    ldRequests: {
      mine: { useQuery: () => ({ data: [{ id: 1, status: "quote_ready", finalClientName: "Cliente", officeName: "Escritório", constructorName: null, submittedAt: new Date(), pdfAvailable: true }], isLoading: false }) },
      myPdf: { useMutation: () => ({ mutateAsync: downloadPdf, isPending: false }) },
    },
  },
}));

import { LDGuestRequests } from "./LDRequests";

describe("LDGuestRequests", () => {
  it("baixa o badge somente ao baixar o PDF da resposta pronta", async () => {
    vi.stubGlobal("open", vi.fn());
    render(React.createElement(LDGuestRequests));
    expect(downloadPdf).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /baixar pdf/i }));
    await waitFor(() => expect(downloadPdf).toHaveBeenCalledWith({ requestId: 1 }));
    await waitFor(() => expect(invalidateBadge).toHaveBeenCalledOnce());
  });
});
