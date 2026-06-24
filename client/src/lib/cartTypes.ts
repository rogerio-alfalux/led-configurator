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

/**
 * Um equipamento vinculado a um Item Especial (driver, módulo LED, etc.).
 * Selecionado pelo usuário a partir da API de acessórios/componentes.
 */
export interface SpecialEquipment {
  /** Código do componente (ex: "EQ00347", "CP00526") */
  codigo: string;
  /** Descrição completa do componente */
  descricao: string;
  /** Quantidade de unidades deste componente por item especial */
  qty: number;
  /** Preço unitário do componente (null = a definir) */
  unitPrice: number | null;
  /** Família do componente (ex: "DRIVERS", "MÓDULOS LED") */
  familia?: string;
  /** URL da foto do componente */
  fotoUrl?: string | null;
  /** Observações adicionais (ex: referência do fabricante) */
  observacoes?: string | null;
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
   * Temperatura de cor do produto especial (ex: "3000K", "4000K").
   */
  specialColorTemp?: string;
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

  /**
   * Lista de equipamentos do item especial (drivers, módulos LED, etc.).
   * Cada entrada é um componente com código, descrição, quantidade e preço unitário.
   * Aparece na coluna EQUIPAMENTOS da Ficha de Produção.
   * Quando a API de componentes (/api/componentes/all) for publicada, migrar fetchComponentes para ela.
   */
  specialEquipments?: SpecialEquipment[];

  /**
   * Indica se o preço unitário veio da API (true) ou foi definido manualmente (false/undefined).
   * Quando true, o campo de preço é somente leitura no carrinho e no orçamento.
   */
  priceFromApi?: boolean;
  /**
   * Lista de CCTs disponíveis para este produto específico.
   * Quando presente, o seletor de CCT no editor do orçamento exibe apenas estas opções.
   * Quando ausente, o seletor usa a CCT atual como única opção editável.
   * Exemplos: ["2700K", "3000K", "4000K", "5000K"] para a maioria dos produtos;
   *           ["2700K", "3000K", "4000K", "5000K", "A definir"] para Perfis.
   */
  availableCCTs?: string[];
  /**
   * Observação livre por item — editável pelo vendedor/assistente.
   * Para itens de Revenda, preenchida automaticamente com "fabricante ref: XXXX".
   * Aparece no Excel na coluna P (fora da área de impressão).
   */
  itemNote?: string;
  /**
   * Acessórios opcionais vinculados a este item (ex: rabicho, conector, suporte).
   * São montados na própria luminária — não são itens independentes no carrinho.
   * Aparecem indentados abaixo do produto pai no carrinho, orçamento e ficha de produção.
   */
  accessories?: LinkedAccessory[];

  // ─── Campos de v32.24 ─────────────────────────────────────────────────────
  /**
   * Observação livre por item — aparece abaixo do item no Excel quando itemObsShowInExcel=true.
   */
  itemObs?: string;
  /**
   * Se true, exibe itemObs no Excel do orçamento (abaixo da linha do item).
   */
  itemObsShowInExcel?: boolean;
  /**
   * Margem de negociação específica por item (0–100, ex: 10 = 10%).
   * Quando definida, sobrescreve a margem global do orçamento para este item.
   */
  itemMarginPercent?: number;
  /**
   * ID do pavimento/zona ao qual este item pertence.
   * Usado para agrupar itens por pavimento no Excel.
   */
  floorId?: string;
  /**
   * Nome do pavimento/zona (ex: "Térreo", "1º Andar", "Cobertura").
   */
  floorName?: string;
  /**
   * Ambiente do item dentro do pavimento (ex: "Sala", "Cozinha", "Quarto 01").
   * Campo livre para organização interna e agrupamento no Excel.
   */
  ambiente?: string;
  /**
   * Número de sequência editável pelo usuário (ex: 1, 2, 3...).
   * Controla a ordem de exibição no carrinho, orçamento, Excel e Pedido de Fábrica.
   * Quando definido, sobrescreve a ordem de inserção. Dentro de cada pavimento,
   * os itens são ordenados por este campo.
   */
  sequenceOrder?: number;
  /**
   * Comprimento linear total em mm para formas EM L, Quadrado ou Retangular.
   * Soma de todos os lados realizados. Usado na coluna COMPRIMENTO do Excel/Preview.
   */
  shapeTotalLengthMm?: number;
}

/**
 * Acessório opcional vinculado a um item do carrinho.
 * Montado na luminária — não é um item independente.
 */
export interface LinkedAccessory {
  /** Código/SKU do acessório */
  codigo: string;
  /** Descrição do acessório */
  descricao: string;
  /** Quantidade (padrão: 1 por luminária) */
  qty: number;
  /** Preço unitário do acessório (null se não cadastrado) */
  unitPrice: number | null;
  /** URL da foto do acessório */
  fotoUrl?: string | null;
  /** Família/categoria do acessório (ex: "Rabicho", "Conector") */
  familia?: string;
  /** Dimensão do acessório (ex: "1,5m") */
  dimensao?: string;
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
  seller1Phone?: string;
  /** Vendedor 2 (opcional) */
  seller2Id?: number;
  seller2Name?: string;
  seller2Phone?: string;
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
  /** Prazo de entrega em dias úteis (padrão: 20) */
  deliveryDays?: number;
  /** Comissão do vendedor (0–1, ex: 0.05 = 5%). Apenas demonstrativo. */
  commissionPercent?: number;
  /** Condição de pagamento (ex: "30% Sinal e 70% a 28DDF") */
  paymentTerm?: string;
  /** Estado destino para cálculo de DIFAL/FCP (ex: "RJ") */
  destState?: string;
  /** Se true, aplica DIFAL ao total */
  difalEnabled?: boolean;
  /** Alíquota de DIFAL em % (ex: 4.5) */
  difalPercent?: number;
  /** Valor de DIFAL calculado em R$ */
  difalValue?: number;
  /** Se true, aplica FCP ao total */
  fcpEnabled?: boolean;
  /** Alíquota de FCP em % (ex: 2) */
  fcpPercent?: number;
  /** Valor de FCP calculado em R$ */
  fcpValue?: number;
  /** Número do projeto (campo separado do número do orçamento, preenchido manualmente) */
  projectNumber?: string;
  /** Comissão do 2º vendedor (0–1, ex: 0.05 = 5%). Apenas demonstrativo. */
  commissionPercent2?: number;
  /** Valor do frete cotado em R$ (quando freteType = 'paid') */
  freteValue?: number;
  /** UF do estado de entrega (ex: SP, RJ) */
  freteState?: string;
  /**
   * Se true, o valor do frete (freteValue) é diluído proporcionalmente
   * ao totalPrice de cada linha de produto no orçamento.
   * A distribuição é ponderada pelo valor de cada linha (não divisão igualitária).
   */
  freteIncluded?: boolean;
  /** Nome do arquiteto responsável pelo projeto */
  arquiteto?: string;
  /** Nome do light designer responsável pelo projeto */
  lightDesigner?: string;
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
