/** A tabela comercial oficial possui 12 colunas, de Item em Planta a Preço Total. */
export const QUOTE_PREVIEW_COLUMN_COUNT = 12;

/**
 * Proporções da tabela comercial no preview HTML.
 * A foto ocupa 9% e usa imagem de 56px centralizada. O espaço recuperado,
 * junto de parte da coluna de modelo, prioriza Comprimento e Potência para que
 * seus cabeçalhos não invadam células adjacentes.
 */
export const QUOTE_PREVIEW_COLUMN_WIDTHS = [5, 9, 20, 9, 7, 6, 6, 8, 8, 4, 9, 9] as const;

/** Proporções A4 quando a coluna C/ IPI é exibida entre Unitário e Total. */
export const QUOTE_PREVIEW_IPI_COLUMN_WIDTHS = [4.5, 8, 18.5, 8.5, 6.5, 5.5, 5.5, 7, 7, 4, 8, 8, 8] as const;

export function getQuotePreviewColumnWidths(showIpi: boolean): readonly number[] {
  return showIpi ? QUOTE_PREVIEW_IPI_COLUMN_WIDTHS : QUOTE_PREVIEW_COLUMN_WIDTHS;
}

export function getQuotePreviewColumnCount(showIpi: boolean): number {
  return showIpi ? QUOTE_PREVIEW_COLUMN_COUNT + 1 : QUOTE_PREVIEW_COLUMN_COUNT;
}

/** Sublinhas ocupam as três primeiras células e as três comerciais finais. */
export const QUOTE_PREVIEW_SUBITEM_BLANK_COLUMN_COUNT = QUOTE_PREVIEW_COLUMN_COUNT - 6;
