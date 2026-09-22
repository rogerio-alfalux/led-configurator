import { describe, expect, it } from "vitest";
import { isLdGuestUser, mustHideCommercialValues } from "./ldGuestAccess";

describe("isLdGuestUser", () => {
  it("reconhece o papel canônico de LD convidado", () => {
    expect(isLdGuestUser({ role: "convidado", loginMethod: "password", openId: "pwd_ld" })).toBe(true);
  });

  it("mantém a proteção em sessão antiga de login por senha cujo papel veio como usuário comum", () => {
    expect(isLdGuestUser({ role: "user", loginMethod: "password", openId: "pwd_legacy_ld" })).toBe(true);
  });

  it("não classifica papéis comerciais e administrativos como LD", () => {
    expect(isLdGuestUser({ role: "vendedor", loginMethod: "email", openId: "pwd_sales" })).toBe(false);
    expect(isLdGuestUser({ role: "admin", loginMethod: "password", openId: "pwd_admin" })).toBe(false);
  });

  it("oculta preços enquanto a sessão não foi identificada", () => {
    expect(mustHideCommercialValues(undefined, true)).toBe(true);
    expect(mustHideCommercialValues({ role: "convidado" }, false)).toBe(true);
    expect(mustHideCommercialValues({ role: "admin" }, false)).toBe(false);
  });
});
