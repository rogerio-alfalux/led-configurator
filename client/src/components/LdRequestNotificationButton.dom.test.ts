/** @vitest-environment jsdom */
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LdRequestNotificationButton } from "./LdRequestNotificationButton";

describe("badge administrativo de solicitações LD", () => {
  it("remove a contagem exibida quando a consulta de notificações é atualizada após o envio", () => {
    const view = render(React.createElement(LdRequestNotificationButton, { href: "/solicitacoes-ld", title: "Solicitações LD", count: 2, tone: "admin" }));
    expect(screen.getByLabelText("2 solicitações pendentes")).toBeTruthy();
    view.rerender(React.createElement(LdRequestNotificationButton, { href: "/solicitacoes-ld", title: "Solicitações LD", count: 0, tone: "admin" }));
    expect(screen.queryByLabelText(/solicitações pendentes/)).toBeNull();
  });
});
