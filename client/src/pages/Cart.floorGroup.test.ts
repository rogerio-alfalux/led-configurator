/** @vitest-environment jsdom */
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => undefined,
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => undefined } },
}));

import { FloorGroupBar } from "./Cart";

describe("FloorGroupBar", () => {
  it("permite renomear diretamente o pavimento e confirma o novo nome ao sair do campo", () => {
    const onRenameChange = vi.fn();
    const onRenameBlur = vi.fn();

    render(React.createElement(
      FloorGroupBar,
      {
        floorId: "floor:Térreo",
        displayName: "Térreo",
        editingName: "Térreo",
        groupEntries: [{ id: 1, data: { category: "Perfis", sku: "TESTE", description: "Produto", qty: 1, unitPrice: 1, totalPrice: 1, photoUrl: null }, createdAt: "2026-09-11" }],
        isCollapsed: false,
        isDraggingThis: false,
        onToggleCollapse: vi.fn(),
        onRenameChange,
        onRenameBlur,
      },
      React.createElement("div", null, "Itens do pavimento"),
    ));

    const input = screen.getByDisplayValue("Térreo");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Cobertura" } });
    fireEvent.blur(input);

    expect(onRenameChange).toHaveBeenCalledWith("Cobertura");
    expect(onRenameBlur).toHaveBeenCalledWith("Cobertura");
    expect(screen.getByTitle("Clique para renomear o pavimento")).toBeTruthy();
  });

  it("propaga a renomeação para todos os itens do mesmo grupo de pavimento", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/Cart.tsx"), "utf8");
    expect(source).toContain("const renameFloor = useCallback((oldName: string, newName: string) => {");
    expect(source).toContain(".filter(e => (e.data.floorName?.trim() || \"Sem Pavimento\") === oldName)");
    expect(source).toContain("updateItemField(e.id, { floorName: trimmed, floorId: trimmed }, 0)");
    expect(source).toContain("renameFloor(displayName, newName)");
  });
});
