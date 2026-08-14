/** @vitest-environment jsdom */
import React from "react";
import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const markResponsesViewed = vi.fn().mockResolvedValue({ success: true });
const invalidateBadge = vi.fn().mockResolvedValue(undefined);

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { role: "convidado" } }) }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ ldRequests: { notifications: { invalidate: invalidateBadge } } }),
    ldRequests: {
      mine: { useQuery: () => ({ data: [{ id: 1, status: "quote_ready", finalClientName: "Cliente", officeName: "Escritório", constructorName: null, submittedAt: new Date(), pdfAvailable: true }], isLoading: false }) },
      markResponsesViewed: { useMutation: () => ({ mutateAsync: markResponsesViewed }) },
      myPdf: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
    },
  },
}));

import { LDGuestRequests } from "./LDRequests";

describe("LDGuestRequests", () => {
  it("marca respostas prontas como vistas e invalida o badge ao abrir Minhas solicitações", async () => {
    render(React.createElement(LDGuestRequests));
    await waitFor(() => expect(markResponsesViewed).toHaveBeenCalledOnce());
    await waitFor(() => expect(invalidateBadge).toHaveBeenCalledOnce());
  });
});
