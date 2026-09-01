/** A tabela comercial oficial possui 12 colunas, de Item em Planta a Preço Total. */
export const QUOTE_PREVIEW_COLUMN_COUNT = 12;

/**
 * Proporções da tabela comercial no preview HTML.
 * A foto ocupa 9% e usa imagem de 56px centralizada. O espaço recuperado,
 * junto de parte da coluna de modelo, prioriza Comprimento e Potência para que
 * seus cabeçalhos não invadam células adjacentes.
 */
export const QUOTE_PREVIEW_COLUMN_WIDTHS = [5, 9, 20, 9, 7, 6, 6, 8, 8, 4, 9, 9] as const;

/** Sublinhas ocupam as três primeiras células e as três comerciais finais. */
export const QUOTE_PREVIEW_SUBITEM_BLANK_COLUMN_COUNT = QUOTE_PREVIEW_COLUMN_COUNT - 6;
