import { afterEach, describe, expect, it, vi } from "vitest";
import { getLoginUrl } from "./const";

describe("getLoginUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("gera um redirecionamento OAuth com o retorno para a origem atual", () => {
    vi.stubEnv("VITE_OAUTH_PORTAL_URL", "https://auth.example.test");
    vi.stubEnv("VITE_APP_ID", "luna-app");
    vi.stubGlobal("window", { location: { origin: "https://configurador.example.test" } });

    const url = new URL(getLoginUrl());
    expect(url.origin).toBe("https://auth.example.test");
    expect(url.searchParams.get("appId")).toBe("luna-app");
    expect(url.searchParams.get("redirectUri")).toBe("https://configurador.example.test/api/oauth/callback");
    expect(url.searchParams.get("type")).toBe("signIn");
  });
});
