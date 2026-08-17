import { describe, expect, it } from "vitest";
import { prepareUserUpsert } from "./db";

describe("prepareUserUpsert", () => {
  it("mantém o nome do provedor somente na criação e não o sobrescreve em logins posteriores", () => {
    const { values, updateSet } = prepareUserUpsert({
      openId: "oauth-user-1",
      name: "Nome enviado pelo provedor",
      email: "usuario@grupoalfalux.com.br",
      loginMethod: "google",
    } as any);

    expect(values.name).toBe("Nome enviado pelo provedor");
    expect(updateSet).not.toHaveProperty("name");
    expect(updateSet).toMatchObject({
      email: "usuario@grupoalfalux.com.br",
      loginMethod: "google",
    });
  });
});
