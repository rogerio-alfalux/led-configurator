import { describe, expect, it } from "vitest";
import { buildUnambiguousCatalogPhotoMap, getPersistedItemPhotoUrl, getRenderableItemPhotoUrl, resolveCatalogItemPhoto } from "./itemPhoto";

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

  it("usa o SKU técnico do segmento para renovar foto de perfil com SKU comercial compartilhado", () => {
    const candidates = [
      { sku: "LLS-3945", name: "BLAZE S FL 10W/M", fotoUrl: "https://api.test/blaze-fl.jpg?assinatura=atual" },
      { sku: "LLS-3945.32F.38F", name: "BLAZE S 3.2B 1825MM 18W", fotoUrl: "https://api.test/blaze-s.jpg?assinatura=atual" },
      { sku: "LLS-3945.5ML.38F", name: "BLAZE S ML 5B 2820MM 18W", fotoUrl: "https://api.test/blaze-s.jpg?assinatura=atual" },
    ];
    expect(resolveCatalogItemPhoto({
      sku: "LLS-3945",
      description: "BLAZE Sobrepor 18W 3000K ON/OFF 220Vac 8475mm",
      photoUrl: "https://api.test/blaze-antiga.jpg?assinatura=expirada",
      profileSegments: [
        { sku: "LLS-3945.32F.38F" },
        { sku: "LLS-3945.5ML.38F" },
      ],
    }, candidates)).toBe("https://api.test/blaze-s.jpg?assinatura=atual");
  });
});

describe("getRenderableItemPhotoUrl", () => {
  it("passa imagens externas do catálogo pelo proxy e preserva caminhos internos", () => {
    expect(getRenderableItemPhotoUrl("https://d36hbw14aib5lz.cloudfront.net/produto.jpg?Expires=123"))
      .toBe("/api/image-proxy?url=https%3A%2F%2Fd36hbw14aib5lz.cloudfront.net%2Fproduto.jpg%3FExpires%3D123");
    expect(getRenderableItemPhotoUrl("/manus-storage/foto-manual.jpg")).toBe("/manus-storage/foto-manual.jpg");
    expect(getRenderableItemPhotoUrl("/api/image-proxy?url=https%3A%2F%2Fexample.com%2Ffoto.jpg"))
      .toBe("/api/image-proxy?url=https%3A%2F%2Fexample.com%2Ffoto.jpg");
  });
});
