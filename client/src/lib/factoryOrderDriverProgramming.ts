export interface ProgrammableDriver {
  corrente?: string | null;
  programacaoManual?: boolean;
}

/**
 * Atualiza a programação apenas dos segmentos pertencentes ao grupo de driver
 * editado. O campo permanece disponível mesmo quando a API não informou uma
 * corrente inicial, permitindo o ajuste manual no gerenciamento da ficha.
 */
export function updateSegmentDriverProgramming<T extends ProgrammableDriver>(
  segments: T[],
  segmentIndexes: readonly number[],
  corrente: string,
): T[] {
  const selected = new Set(segmentIndexes);
  return segments.map((segment, index) => selected.has(index)
    ? { ...segment, corrente, programacaoManual: true }
    : segment,
  );
}

/** Atualiza a programação de uma única linha de driver de luminária. */
export function updateDriverLineProgramming<T extends ProgrammableDriver>(
  lines: T[],
  lineIndex: number,
  corrente: string,
): T[] {
  return lines.map((line, index) => index === lineIndex
    ? { ...line, corrente, programacaoManual: true }
    : line,
  );
}
