import { describe, expect, it } from "vitest";
import {
  toBrasiliaDate,
  toBrasiliaDateTime,
  toBrasiliaDateTimeShort,
  toBrasiliaFileDate,
  toBrasiliaMonthYear,
} from "./dateUtils";

describe("formatadores de data em Horário de Brasília", () => {
  // 00:30 UTC de 12/08 ainda é 21:30 do dia anterior em Brasília (UTC-3).
  const historicalUtc = "2026-08-12T00:30:00.000Z";

  it("converte registros históricos para a data correta em Brasília", () => {
    expect(toBrasiliaDate(historicalUtc)).toBe("11/08/2026");
    expect(toBrasiliaFileDate(historicalUtc)).toBe("2026-08-11");
    expect(toBrasiliaMonthYear(historicalUtc)).toBe("agosto de 2026");
  });

  it("converte a hora para Brasília sem alterar o instante", () => {
    expect(toBrasiliaDateTime(historicalUtc)).toBe("11/08/2026, 21:30:00");
    expect(toBrasiliaDateTimeShort(historicalUtc)).toBe("11/08/2026, 21:30");
  });

  it("interpreta timestamps MySQL sem sufixo como UTC antes de exibir Brasília", () => {
    expect(toBrasiliaDateTimeShort("2026-08-27 13:12:36")).toBe("27/08/2026, 10:12");
  });

  it("preserva datas civis sem horário no próprio dia de Brasília", () => {
    expect(toBrasiliaDate("2026-08-27")).toBe("27/08/2026");
    expect(toBrasiliaFileDate("2026-08-27")).toBe("2026-08-27");
  });
});
