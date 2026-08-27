export const BRASILIA_TIME_ZONE = "America/Sao_Paulo";

/**
 * Serializa um instante UTC no formato aceito pelas colunas TIMESTAMP do MySQL.
 * Persistimos o instante em UTC e aplicamos America/Sao_Paulo somente na apresentação.
 */
export function toUtcSqlTimestamp(value: Date = new Date()): string {
  return value.toISOString().slice(0, 19).replace("T", " ");
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
