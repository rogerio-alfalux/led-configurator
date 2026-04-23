/**
 * shared/driverRestrictions.ts
 * Tipos e funções de restrições de drivers compartilhados entre server e client.
 * Extraídas da coluna OBSERVAÇÕES da planilha Google Sheets.
 */

/**
 * Restrições de uso do driver, extraídas da coluna OBSERVAÇÕES.
 * Todas as propriedades são opcionais — ausência = sem restrição.
 */
export interface DriverRestrictions {
  /** Se definido, o driver só pode ser usado com esta potência (W) */
  onlyPowerW?: number;
  /** Se definido, o driver só pode ser usado com esta tensão de entrada */
  onlyVoltage?: "220V" | "BIVOLT";
  /** Se definido, o driver só pode ser usado com este método de barra */
  onlyStripMethod?: "STRIPFLEX" | "STRIPLINE";
  /** Faixa de barras para uso preferencial (prioridade) */
  preferredMinBars?: number;
  preferredMaxBars?: number;
  /** Número máximo de barras permitido */
  maxBars?: number;
  /** Se true, não usar no perfil BLAZE H (LLP-6060) */
  notBlazeH?: boolean;
  /** Se true, apenas para Embutir ou driver remoto */
  onlyEmbutirOrRemote?: boolean;
}

/**
 * Parseia a coluna OBSERVAÇÕES e extrai restrições de uso do driver.
 *
 * Padrões reconhecidos:
 *   "PRIORIDADE 18W DE N ATÉ M BARRAS" → onlyPowerW=18, preferredMinBars=N, preferredMaxBars=M
 *   "SÓ USAR EM CASOS DE 26W" → onlyPowerW=26
 *   "LIGA APENAS 1 BARRA 26W" → maxBars=1
 *   "NÃO USAR NO BLAZE H" → notBlazeH=true
 *   "USAR EM PERFIS DE EMBUTIR OU CASOS DE PONTO REMOTO" → onlyEmbutirOrRemote=true
 *   "SÓ USAR EM CASO DE BIVOLT" → onlyVoltage=BIVOLT
 *   "BFILEIRA SIMPLES" ou "BARRA DUPLA" → onlyStripMethod=STRIPFLEX (não usar para 26W)
 */
export function parseObservations(obs: string): DriverRestrictions {
  if (!obs || !obs.trim()) return {};

  const upper = obs.toUpperCase();
  const restrictions: DriverRestrictions = {};

  // "PRIORIDADE 18W DE N ATÉ M BARRAS"
  const priorityMatch = upper.match(/PRIORIDADE\s+(\d+)W\s+DE\s+(\d+)\s+AT[EÉ]\s+(\d+)\s+BARRAS/);
  if (priorityMatch) {
    restrictions.onlyPowerW = parseInt(priorityMatch[1]);
    restrictions.preferredMinBars = parseInt(priorityMatch[2]);
    restrictions.preferredMaxBars = parseInt(priorityMatch[3]);
  }

  // "SÓ USAR EM CASOS DE 26W" ou "SÓ USAR EM CASO DE 26W"
  if (upper.includes("SÓ USAR EM CASO") && upper.includes("26W") && !upper.includes("BIVOLT")) {
    restrictions.onlyPowerW = 26;
  }

  // "LIGA APENAS 1 BARRA 26W"
  const maxBarsMatch = upper.match(/LIGA\s+APENAS\s+(\d+)\s+BARRA/);
  if (maxBarsMatch) {
    restrictions.maxBars = parseInt(maxBarsMatch[1]);
  }

  // "NÃO USAR NO BLAZE H"
  if (upper.includes("NÃO USAR NO BLAZE H")) {
    restrictions.notBlazeH = true;
  }

  // "USAR EM PERFIS DE EMBUTIR OU CASOS DE PONTO REMOTO"
  if (upper.includes("EMBUTIR") || upper.includes("PONTO REMOTO")) {
    restrictions.onlyEmbutirOrRemote = true;
  }

  // "SÓ USAR EM CASO DE BIVOLT"
  if (upper.includes("BIVOLT")) {
    restrictions.onlyVoltage = "BIVOLT";
  }

  // "BFILEIRA SIMPLES" ou "BARRA DUPLA" — driver bivolt para 18W fileira simples ou 36W barra dupla
  // Significa: NÃO usar para 26W Bivolt
  if (upper.includes("BFILEIRA SIMPLES") || upper.includes("BARRA DUPLA")) {
    restrictions.onlyStripMethod = "STRIPFLEX";
  }

  return restrictions;
}
