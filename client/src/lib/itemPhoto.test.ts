import { describe, expect, it } from "vitest";
import { getPersistedItemPhotoUrl } from "./itemPhoto";

describe("getPersistedItemPhotoUrl", () => {
  it("prioriza a foto manual persistida do Item Especial", () => {
    expect(getPersistedItemPhotoUrl({
      specialPhotoUrl: "/api/assets/foto-manual.png",
      photoUrl: "/api/assets/foto-antiga.png",
    } as any)).toBe("/api/assets/foto-manual.png");
  });

  it("mantém compatibilidade com orçamentos antigos que só possuem photoUrl", () => {
    expect(getPersistedItemPhotoUrl({ photoUrl: "/api/assets/foto-legada.png" } as any))
      .toBe("/api/assets/foto-legada.png");
  });
});
