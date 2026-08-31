export type LdRequestDeadlineInput = {
  desiredQuoteDate?: string | null;
  estimatedDeliveryDate?: string | null;
};

export type LdRequestDeadlineLimits = {
  requestDate: string;
  minimumEstimatedDeliveryDate: string;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function civilDateParts(value: string) {
  if (!DATE_PATTERN.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const instant = new Date(Date.UTC(year, month - 1, day));
  if (
    instant.getUTCFullYear() !== year ||
    instant.getUTCMonth() !== month - 1 ||
    instant.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

function toIsoCivilDate(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function addBusinessDays(startDate: string, businessDays: number): string {
  const parts = civilDateParts(startDate);
  if (!parts) throw new Error("Data de referência inválida.");
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  let added = 0;
  while (added < businessDays) {
    date.setUTCDate(date.getUTCDate() + 1);
    const weekday = date.getUTCDay();
    if (weekday !== 0 && weekday !== 6) added += 1;
  }
  return date.toISOString().slice(0, 10);
}

export function getLdRequestDeadlineLimits(now: Date = new Date()): LdRequestDeadlineLimits {
  const requestDate = toIsoCivilDate(now);
  return {
    requestDate,
    minimumEstimatedDeliveryDate: addBusinessDays(requestDate, 5),
  };
}

export function getLdRequestDeadlineValidationError(
  input: LdRequestDeadlineInput,
  now: Date = new Date(),
): string | null {
  const { requestDate, minimumEstimatedDeliveryDate } = getLdRequestDeadlineLimits(now);
  const desiredQuoteDate = input.desiredQuoteDate?.trim() || null;
  const estimatedDeliveryDate = input.estimatedDeliveryDate?.trim() || null;

  if (desiredQuoteDate) {
    if (!civilDateParts(desiredQuoteDate)) return "Informe uma data válida para receber o orçamento.";
    if (desiredQuoteDate < requestDate) return "O prazo desejado para receber o orçamento não pode ser retroativo.";
  }

  if (estimatedDeliveryDate) {
    if (!civilDateParts(estimatedDeliveryDate)) return "Informe uma data válida para entrega das luminárias.";
    if (estimatedDeliveryDate < minimumEstimatedDeliveryDate) {
      return `O prazo estimado para entrega das luminárias deve ser a partir de ${minimumEstimatedDeliveryDate.split("-").reverse().join("/")} (cinco dias úteis após a solicitação).`;
    }
  }

  return null;
}
