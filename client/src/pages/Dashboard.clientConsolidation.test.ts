/** @vitest-environment jsdom */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClientConsolidatedPanel } from "./Dashboard";

const rows = [
  {
    key: "CONSTRUTORA ALFA", label: "Construtora Alfa", quotedAmount: 50_000, quotedQuoteCount: 4, quotedAverageTicket: 12_500,
    openAmount: 5_000, openQuoteCount: 1,
    closedAmount: 30_000, closedQuoteCount: 2, closedAverageTicket: 15_000,
    lostAmount: 20_000, lostQuoteCount: 2, lostAverageTicket: 10_000, duplicateQuoteCount: 0,
  },
  {
    key: "BETA ENGENHARIA", label: "Beta Engenharia", quotedAmount: 9_000, quotedQuoteCount: 1, quotedAverageTicket: 9_000,
    openAmount: 9_000, openQuoteCount: 1,
    closedAmount: 0, closedQuoteCount: 0, closedAverageTicket: null,
    lostAmount: 9_000, lostQuoteCount: 1, lostAverageTicket: 9_000, duplicateQuoteCount: 0,
  },
];

describe("ClientConsolidatedPanel", () => {
  it("seleciona um cliente pelo autocomplete e exibe os quatro consolidados e a conversão do período", () => {
    render(React.createElement(ClientConsolidatedPanel, { rows }));

    fireEvent.change(screen.getByRole("textbox", { name: "Buscar cliente no período selecionado" }), { target: { value: "alfa" } });
    fireEvent.click(screen.getByRole("option", { name: /Construtora Alfa/i }));

    expect(screen.getByText("Cliente selecionado")).toBeTruthy();
    expect(screen.getByText("Construtora Alfa")).toBeTruthy();
    expect(screen.getByText("Total orçado")).toBeTruthy();
    expect(screen.getByText("Em aberto")).toBeTruthy();
    expect(screen.getByText("Total fechado")).toBeTruthy();
    expect(screen.getByText("Total perdido")).toBeTruthy();
    expect(screen.getByText("R$ 50.000,00")).toBeTruthy();
    expect(screen.getByText("R$ 5.000,00")).toBeTruthy();
    expect(screen.getByText("R$ 30.000,00")).toBeTruthy();
    expect(screen.getByText("50% conv.")).toBeTruthy();
    expect(screen.getByText("R$ 20.000,00")).toBeTruthy();
  });
});
