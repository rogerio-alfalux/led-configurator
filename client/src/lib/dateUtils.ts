/**
 * Utilitários de data com fuso horário de Brasília (America/Sao_Paulo).
 * Todos os timestamps do banco são UTC — usar estas funções para exibição.
 */

const TZ = "America/Sao_Paulo";

/** Formata data como "dd/mm/aaaa" no fuso de Brasília */
export function toBrasiliaDate(value: Date | string | number): string {
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: TZ });
}

/** Formata data e hora como "dd/mm/aaaa, hh:mm:ss" no fuso de Brasília */
export function toBrasiliaDateTime(value: Date | string | number): string {
  return new Date(value).toLocaleString("pt-BR", { timeZone: TZ });
}
