import { describe, expect, it } from "vitest";
import { getUserCreationRoleAuthorizationError, isVivianLdGuestCreator } from "@shared/userCreationAccess";

describe("delegação de criação de usuário para Vivian", () => {
  it("reconhece o e-mail administrativo da Vivian sem diferença de caixa", () => {
    expect(isVivianLdGuestCreator("VIVIAN@GRUPOALFALUX.COM.BR")).toBe(true);
    expect(isVivianLdGuestCreator("vivian_rf@yahoo.com.br")).toBe(false);
  });

  it("autoriza Vivian a criar somente LD Convidado", () => {
    expect(getUserCreationRoleAuthorizationError("vivian@grupoalfalux.com.br", "convidado")).toBeNull();
    expect(getUserCreationRoleAuthorizationError("vivian@grupoalfalux.com.br", "vendedor"))
      .toBe("A Vivian pode criar somente usuários LD Convidado.");
  });

  it("mantém as opções administrativas existentes para os demais administradores", () => {
    expect(getUserCreationRoleAuthorizationError("rogeriojohnwayne@gmail.com", "assistente")).toBeNull();
  });
});
