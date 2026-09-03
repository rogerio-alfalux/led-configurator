export const BRASILIA_TIME_ZONE = "America/Sao_Paulo";

/**
 * Serializa um instante UTC no formato aceito pelas colunas TIMESTAMP do MySQL.
 * Persistimos o instante em UTC e aplicamos America/Sao_Paulo somente na apresentação.
 */
export function toUtcSqlTimestamp(value: Date = new Date()): string {
  return value.toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Converte uma data civil selecionada em Brasília para um instante UTC seguro
 * de persistir. Usamos meio-dia de Brasília para que filtros e exibições por
 * data nunca migrem para o dia anterior por causa do fuso horário.
 */
export function brasiliaDateToUtcSqlTimestamp(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Data de faturamento inválida.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const civilDate = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 2000 || year > 2100 ||
    civilDate.getUTCFullYear() !== year ||
    civilDate.getUTCMonth() !== month - 1 ||
    civilDate.getUTCDate() !== day
  ) {
    throw new Error("Data de faturamento inválida.");
  }
  // UTC-3 corresponde a 12:00 em Brasília; o horário intermediário também
  // preserva a data correta para marcos históricos de fuso horário.
  return toUtcSqlTimestamp(new Date(Date.UTC(year, month - 1, day, 15, 0, 0)));
}

/** Formata um instante como data/hora civil de Brasília para textos e metadados. */
export function toBrasiliaSqlTimestamp(value: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRASILIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

export function getBrasiliaYear2(value: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BRASILIA_TIME_ZONE,
    year: "2-digit",
  }).format(value);
}
