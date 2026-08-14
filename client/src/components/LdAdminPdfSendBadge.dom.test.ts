/** @vitest-environment jsdom */
import React, { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { handleLdPdfSent } from "@/lib/ldAdminBadgeRefresh";
import { LdRequestNotificationButton } from "./LdRequestNotificationButton";

function AdminPdfSendFlow({ attachPdf }: { attachPdf: () => Promise<void> }) {
  const [pendingCount, setPendingCount] = useState(1);
  const send = async () => {
    await attachPdf();
    await handleLdPdfSent(async () => setPendingCount(0));
  };
  return React.createElement(React.Fragment, null,
    React.createElement("button", { onClick: send }, "Enviar PDF ao LD"),
    React.createElement(LdRequestNotificationButton, { href: "/solicitacoes-ld", title: "Solicitações LD", count: pendingCount, tone: "admin" }),
  );
}

describe("envio administrativo de PDF e badge LD", () => {
  it("baixa visivelmente o badge ao concluir o envio do PDF", async () => {
    const attachPdf = vi.fn().mockResolvedValue(undefined);
    render(React.createElement(AdminPdfSendFlow, { attachPdf }));
    expect(screen.getByLabelText("1 solicitações pendentes")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Enviar PDF ao LD" }));
    await waitFor(() => expect(attachPdf).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByLabelText(/solicitações pendentes/)).toBeNull());
  });
});
