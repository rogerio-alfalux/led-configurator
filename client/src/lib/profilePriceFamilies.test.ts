import { describe, expect, it } from "vitest";
import { isApiPricedFixedProfileFamily } from "./profilePriceFamilies";

describe("isApiPricedFixedProfileFamily", () => {
  it("inclui BAGEO fixo no mapa comercial de corpo e driver", () => {
    expect(isApiPricedFixedProfileFamily("BAGEO")).toBe(true);
    expect(isApiPricedFixedProfileFamily("BAGEO E")).toBe(true);
  });

  it("mantém perfis modulares fora do mapa de luminárias fixas", () => {
    expect(isApiPricedFixedProfileFamily("BLAZE H")).toBe(false);
    expect(isApiPricedFixedProfileFamily("SKYLINE P")).toBe(false);
    expect(isApiPricedFixedProfileFamily("ALDA")).toBe(false);
  });
});
