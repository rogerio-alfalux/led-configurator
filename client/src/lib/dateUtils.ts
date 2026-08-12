/**
 * Utilitários de data com fuso horário de Brasília (America/Sao_Paulo).
 * Os instantes persistidos permanecem em UTC; estas funções devem ser usadas
 * sempre que uma data ou horário for apresentado ao usuário ou exportado.
 */

export const BRASILIA_TIME_ZONE = "America/Sao_Paulo";

type DateValue = Date | string | number;

function asDate(value: DateValue): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Formata data como "dd/mm/aaaa" no fuso de Brasília. */
export function toBrasiliaDate(value: DateValue): string {
  return asDate(value).toLocaleDateString("pt-BR", {
    timeZone: BRASILIA_TIME_ZONE,
  });
}

/** Formata data e hora como "dd/mm/aaaa, hh:mm:ss" no fuso de Brasília. */
export function toBrasiliaDateTime(value: DateValue): string {
  return asDate(value).toLocaleString("pt-BR", {
    timeZone: BRASILIA_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** Formata data e hora sem segundos para listas e cartões. */
export function toBrasiliaDateTimeShort(value: DateValue): string {
  return asDate(value).toLocaleString("pt-BR", {
    timeZone: BRASILIA_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Formata mês e ano no fuso de Brasília, para filtros e gráficos. */
export function toBrasiliaMonthYear(value: DateValue): string {
  return asDate(value).toLocaleDateString("pt-BR", {
    timeZone: BRASILIA_TIME_ZONE,
    month: "long",
    year: "numeric",
  });
}

/** Retorna yyyy-mm-dd em Brasília para nomes de arquivos de backup/exportação. */
export function toBrasiliaFileDate(value: DateValue): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRASILIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(asDate(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
