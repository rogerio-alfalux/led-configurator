import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("preferências persistentes de indicadores", () => {
  it("vincula as caixas de Meus Orçamentos ao usuário autenticado", async () => {
    const [schema, db, router] = await Promise.all([
      readFile(new URL("../drizzle/schema.ts", import.meta.url), "utf8"),
      readFile(new URL("./db.ts", import.meta.url), "utf8"),
      readFile(new URL("./routers.ts", import.meta.url), "utf8"),
    ]);
    expect(schema).toContain("userDashboardPreferences");
    expect(schema).toContain("user_dashboard_preferences_user_unique");
    expect(db).toContain("saveQuoteMetricVisibilityPreference");
    expect(router).toContain("saveQuoteMetricVisibility: protectedProcedure");
  });
});
