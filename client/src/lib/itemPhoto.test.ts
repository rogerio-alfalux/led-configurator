import { describe, expect, it } from "vitest";
import { buildUnambiguousCatalogPhotoMap, getPersistedItemPhotoUrl, resolveCatalogItemPhoto } from "./itemPhoto";

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

  it("seleciona a foto da variante compatível quando a API reutiliza o SKU", () => {
    const candidates = [
      { sku: "LDE-7240.090.13F", name: "FOCO G COB 70 RE 38W 36º", fotoUrl: "https://api.test/foco-cob-70.jpg?assinatura=atual" },
      { sku: "LDE-7240.090.13F", name: "FOCO G RE 13W", fotoUrl: "https://api.test/foco-g-13w.jpg?assinatura=atual" },
    ];
    expect(resolveCatalogItemPhoto({
      sku: "LDE-7240.090.13F",
      description: "FOCO G COB 70 RE 38W 36° 4000K ON/OFF 220V",
      photoUrl: "https://api.test/foto-historica.jpg",
    } as any, candidates)).toBe("https://api.test/foco-cob-70.jpg?assinatura=atual");
    expect(buildUnambiguousCatalogPhotoMap(candidates).has("LDE-7240.090.13F")).toBe(false);
  });

  it("nunca substitui a foto manual de Item Especial por uma variante de catálogo", () => {
    expect(resolveCatalogItemPhoto({
      sku: "LDE-7240.090.13F",
      description: "FOCO G COB 70 RE 38W 36° 4000K",
      specialPhotoUrl: "/manus-storage/foto-manual.png",
      photoUrl: "https://api.test/foto-historica.jpg",
    } as any, [{ sku: "LDE-7240.090.13F", name: "FOCO G COB 70 RE 38W 36º", fotoUrl: "https://api.test/foco-cob-70.jpg" }]))
      .toBe("/manus-storage/foto-manual.png");
  });
});
