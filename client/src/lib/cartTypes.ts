/**
 * Dados serializados de um item do carrinho de orçamento.
 * Armazenado como JSON na coluna itemData da tabela cart_items.
 */

/**
 * Segmento individual de uma composição de perfil.
 * Cada SKU diferente na composição é um segmento separado.
 */
export interface ProfileSegment {
  /** SKU do módulo (ex: "LLE-2810.3IF.18F") */
  sku: string;
  /** Quantidade de peças deste SKU */
  qty: number;
  /** Comprimento em mm de cada peça */
  lengthMm: number;
  /** Quantidade de barras de LED por peça (para calcular Fonte de Luz) */
  barsPerPiece: number;
  /** Quantidade de drivers por peça */
  driverQtyPerPiece: number;
  /** Nome do driver (ex: "PHILIPS XITANIUM 44W 350MA") */
  driverModel: string;
  /** Código do driver (ex: "EQ00347") */
  driverCode: string;
}

export interface CartItemData {
  /** Categoria do produto: perfil, downlight, painel, spot, arandela, ledbar, bageo */
  category: string;
  /** SKU / código do produto */
  sku: string;
  /** Descrição completa do produto */
  description: string;
  /** Potência em W (ex: "18W", "26W", "36W"). Opcional para itens especiais. */
  power?: string;
  /** Temperatura de cor (ex: "3000K"). Opcional para itens especiais. */
  cct?: string;
  /** Quantidade de unidades */
  qty: number;
  /** Preço unitário em reais (null se não cadastrado) */
  unitPrice: number | null;
  /** Preço total = unitPrice × qty (null se unitPrice for null) */
  totalPrice: number | null;
  /** URL da foto do produto (pode ser null) */
  photoUrl: string | null;
  /** Texto completo do resumo para pedido. Opcional para itens especiais. */
  orderSummary?: string;
  /** Texto completo do resumo para orçamento. Opcional para itens especiais. */
  quoteSummary?: string;
  /** Cor da peça selecionada (ex: "Branco Fosco Micro", "A Definir") */
  corPeca?: string;
  /** Módulo LED (fonte de luz) para ficha de produção — usado por produtos não-perfil */
  moduloLed?: string;
  /** Drivers (equipamentos) para ficha de produção — usado por produtos não-perfil */
  drivers?: string;
  /**
   * Segmentos da composição de perfil (apenas para categoria "Perfis").
   * Quando presente, a Ficha Técnica de Produção usa este campo para gerar
   * SKU, FONTE DE LUZ e EQUIPAMENTOS no formato multi-linha por segmento.
   */
  profileSegments?: ProfileSegment[];
  /**
   * Método de barra para perfis 36W: "STRIPFLEX" (fileira dupla) ou "STRIPLINE" (fileira única).
   * Determina qual nome usar na coluna FONTE DE LUZ da Ficha de Produção.
   */
  stripMethod?: "STRIPFLEX" | "STRIPLINE";
  /**
   * Identificação do item na planta (ex: "L1", "L2") — aparece na coluna ETIQUETA da Ficha de Produção
   * e no campo correspondente do orçamento.
   */
  itemEmPlanta?: string;

  // ─── Campos específicos do LED BAR U ──────────────────────────────────────
  /**
   * Número de cortes/trechos do LED BAR U (1 = sem corte, ≥2 = dividido em trechos).
   * Usado na coluna FONTE DE LUZ da Ficha de Produção.
   */
  ledBarNCortes?: number;
  /**
   * Comprimento de cada trecho em mm (comprimento total / nCortes).
   * Usado na coluna FONTE DE LUZ da Ficha de Produção.
   */
  ledBarComprimentoPorTrechoMm?: number;
  /**
   * Comprimento total do LED BAR U em mm.
   */
  ledBarComprimentoTotalMm?: number;
  /**
   * Modelo do driver do LED BAR U com código (ex: "FONTE 60W 24V (EQ00112)").
   * Usado na coluna EQUIPAMENTOS da Ficha de Produção.
   */
  ledBarDriverModel?: string;
  /**
   * Código do driver do LED BAR U (ex: "EQ00112").
   */
  ledBarDriverCode?: string;

  // ─── Campos específicos de Item Especial ──────────────────────────────────
  /**
   * Indica que este item é um Item Especial (não está no catálogo).
   */
  isSpecialItem?: boolean;
  /**
   * Descrição do produto especial (preenchida pelo usuário).
   */
  specialDescription?: string;
  /**
   * Dimensões do produto especial (ex: "620 x 620 x 100mm").
   */
  specialDimensions?: string;
  /**
   * Potência do produto especial (ex: "36W").
   */
  specialPower?: string;
  /**
   * Tipo de acionamento/DIM do produto especial (ex: "ON/OFF", "DALI", "DIM").
   */
  specialDim?: string;
  /**
   * Tensão do produto especial (ex: "BIVOLT", "220V").
   */
  specialVoltage?: string;
  /**
   * Cor da peça do produto especial.
   */
  specialColor?: string;
  /**
   * Valor unitário do produto especial (preenchido pelo usuário no formulário).
   */
  specialUnitPrice?: number;
  /**
   * URL da foto do produto especial (armazenada via storagePut).
   */
  specialPhotoUrl?: string;
  /**
   * Observação interna do item especial — NÃO aparece no orçamento para o cliente.
   * Aparece no Excel fora da área de impressão, na mesma linha do item.
   */
  specialInternalNotes?: string;
}

export interface QuoteFormData {
  cliente: string;
  contato: string;
  tel: string;
  email: string;
  obra: string;
  referencia: string;
  numero: string;
  data: string;
  /** Vendedor 1 (obrigatório) */
  seller1Id?: number;
  seller1Name?: string;
  /** Vendedor 2 (opcional) */
  seller2Id?: number;
  seller2Name?: string;
  /** Assistente comercial (obrigatório) */
  assistantId?: number;
  assistantName?: string;
  /** Reserva Técnica (0–1, ex: 0.10 = 10%) */
  rtPercent?: number;
  rtDest1?: string;
  rtDest1Active?: boolean;
  rtDest2?: string;
  rtDest2Active?: boolean;
  rtDest3?: string;
  rtDest3Active?: boolean;
  /** Margem de negociação (0–1, ex: 0.10 = 10%) */
  marginPercent?: number;
  /** Frete */
  freteType?: "free" | "paid" | "night" | "consult";
  freteIsento?: boolean;
  freteLocalidade?: "sp" | "other";
  freteCity?: string;
  /** Número de revisões do orçamento (0 = sem revisões, 1 = primeira revisão, etc.) */
  revisionCount?: number;
}

export function parseCartItemData(json: string): CartItemData | null {
  try {
    return JSON.parse(json) as CartItemData;
  } catch {
    return null;
  }
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
