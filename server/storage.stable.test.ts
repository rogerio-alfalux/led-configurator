import { afterEach, describe, expect, it, vi } from "vitest";
import { storagePutStable } from "./storage";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("storagePutStable", () => {
  it("preserva a chave determinística usada pelo snapshot interno", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://upload.example/snapshot" }),
      })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const result = await storagePutStable(
      "/system/alfalux/products-latest.v1.json.gz",
      Buffer.from("snapshot"),
      "application/gzip",
    );

    const presignUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(presignUrl.searchParams.get("path")).toBe("system/alfalux/products-latest.v1.json.gz");
    expect(result.key).toBe("system/alfalux/products-latest.v1.json.gz");
  });
});
