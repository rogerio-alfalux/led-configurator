/** A tabela comercial oficial possui 12 colunas, de Item em Planta a Preço Total. */
export const QUOTE_PREVIEW_COLUMN_COUNT = 12;

/**
 * Proporções da tabela comercial oficial no preview/PDF.
 * A coluna de foto recebe 8% para acomodar a imagem de 64px e as células
 * de preço recebem 9% cada, evitando quebra de valor sem invadir a foto.
 */
export const QUOTE_PREVIEW_COLUMN_WIDTHS = [5, 8, 24, 7, 6, 6, 6, 8, 8, 4, 9, 9] as const;

/** Sublinhas ocupam as três primeiras células e as três comerciais finais. */
export const QUOTE_PREVIEW_SUBITEM_BLANK_COLUMN_COUNT = QUOTE_PREVIEW_COLUMN_COUNT - 6;
