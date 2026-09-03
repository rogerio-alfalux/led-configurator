import { describe, expect, it } from "vitest";
import { brasiliaDateToUtcSqlTimestamp, getBrasiliaYear2, toBrasiliaSqlTimestamp, toUtcSqlTimestamp } from "./timeUtils";

describe("timeUtils", () => {
  const instant = new Date("2026-08-27T13:12:36.000Z");

  it("persiste o instante em UTC no formato MySQL", () => {
    expect(toUtcSqlTimestamp(instant)).toBe("2026-08-27 13:12:36");
  });

  it("formata textos de negócio no horário de Brasília", () => {
    expect(toBrasiliaSqlTimestamp(instant)).toBe("2026-08-27 10:12:36");
  });

  it("calcula o ano comercial no fuso de Brasília", () => {
    expect(getBrasiliaYear2(new Date("2027-01-01T01:30:00.000Z"))).toBe("26");
  });

  it("preserva a data civil de faturamento informada em Brasília", () => {
    expect(brasiliaDateToUtcSqlTimestamp("2026-08-21")).toBe("2026-08-21 15:00:00");
  });

  it("rejeita datas fiscais inexistentes", () => {
    expect(() => brasiliaDateToUtcSqlTimestamp("2026-02-30")).toThrow("Data de faturamento inválida.");
  });
});
