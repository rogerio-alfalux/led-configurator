import { describe, expect, it } from "vitest";
import { getLdRequestDeadlineLimits, getLdRequestDeadlineValidationError } from "../shared/ldRequestDeadlines";

describe("prazos de solicitações LD", () => {
  const fridayInBrasilia = new Date("2026-08-28T15:00:00.000Z");

  it("calcula cinco dias úteis a partir da data da solicitação, ignorando o fim de semana", () => {
    expect(getLdRequestDeadlineLimits(fridayInBrasilia)).toEqual({
      requestDate: "2026-08-28",
      minimumEstimatedDeliveryDate: "2026-09-04",
    });
  });

  it("impede prazo retroativo para o recebimento do orçamento", () => {
    expect(getLdRequestDeadlineValidationError({ desiredQuoteDate: "2026-08-27" }, fridayInBrasilia)).toContain("não pode ser retroativo");
    expect(getLdRequestDeadlineValidationError({ desiredQuoteDate: "2026-08-28" }, fridayInBrasilia)).toBeNull();
  });

  it("exige entrega a partir do quinto dia útil e aceita a data mínima", () => {
    expect(getLdRequestDeadlineValidationError({ estimatedDeliveryDate: "2026-09-03" }, fridayInBrasilia)).toContain("04/09/2026");
    expect(getLdRequestDeadlineValidationError({ estimatedDeliveryDate: "2026-09-04" }, fridayInBrasilia)).toBeNull();
  });
});
