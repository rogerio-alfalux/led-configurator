import { describe, expect, it } from "vitest";
import { filterUsersByRole } from "./userRoleFilter";

describe("filterUsersByRole", () => {
  const users = [
    { id: 1, role: "admin" },
    { id: 2, role: "assistente" },
    { id: 3, role: "assistente" },
    { id: 4, role: "convidado" },
  ];

  it("mantém todos os usuários quando o filtro é Todos", () => {
    expect(filterUsersByRole(users, "all")).toEqual(users);
  });

  it("retorna somente usuários da função escolhida", () => {
    expect(filterUsersByRole(users, "assistente")).toEqual([
      { id: 2, role: "assistente" },
      { id: 3, role: "assistente" },
    ]);
  });

  it("retorna lista vazia quando não há usuários daquela função", () => {
    expect(filterUsersByRole(users, "vendedor")).toEqual([]);
  });
});
