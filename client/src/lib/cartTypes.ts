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
  /** Corrente de programação do driver (ex: "350MA", "700MA"). null se não disponível. */
  corrente?: string | null;
  /** Código EQ do módulo LED/Stripflex/Stripline (ex: "EQ00123"). null se não disponível. */
  ledModuleCode?: string | null;
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

  // ─── Campos de desmembramento de driver (a partir da versão que introduziu este campo) ─
  /**
   * Linhas de driver desmembradas para exibição separada no Excel e na pré-visualização.
   * Apenas itens criados a partir desta versão terão este campo populado.
   * Itens antigos (sem o campo) continuam funcionando normalmente sem desmembramento.
   */
  driverLines?: DriverLine[];

  /**
   * Preço total da luminaria sem os drivers (null se não calculado).
   * Usado para calcular os totais "com driver" e "sem driver" no Excel/preview.
   */
  priceWithoutDriver?: number | null;

  /**
   * Preço unitário da luminária (corpo) sem o driver, por unidade.
   * null quando a API não retorna custo do corpo (usuário deve preencher manualmente).
   * Apenas para itens com driverLines populado.
   */
  unitPriceLuminaria?: number | null;

  /**
   * Preço unitário do driver, por unidade de driver.
   * null quando a API não retorna custo do driver.
   * Apenas para itens com driverLines populado.
   */
  unitPriceDriver?: number | null;

  /**
   * Se true, a API retornou custo do corpo da luminária e o preço de luminária foi calculado.
   * Se false/undefined, o usuário deve informar manualmente o preço da luminária.
   * Apenas para itens com driverLines populado.
   */
  luminariaHasApiPrice?: boolean;
  /**
   * Custo base do corpo da luminária (sem markup), vindo da API.
   * Usado para recalcular o preço quando o markup é alterado manualmente.
   * Apenas para itens com preço calculado via custo×markup.
   */
  custoCorpoBase?: number | null;
  /**
   * Custo base do driver (sem markup), vindo da API.
   * Usado para recalcular o preço do driver quando o markup é alterado.
   */
  custoDriverBase?: number | null;
  /**
   * Markup padrão da luminaria para o controle/tensão selecionados, vindo da API.
   */
  markupPadraoApi?: number | null;
  /**
   * Markup mínimo da luminaria para o controle/tensão selecionados, vindo da API.
   */
  markupMinimoApi?: number | null;
  /**
   * Markup mínimo do driver, vindo da API.
   */
  markupMinimoDriverApi?: number | null;
  /**
   * Markup customizado aplicado pelo usuário (Vivian/Dennis) neste item.
   * Quando definido, sobrescreve o markupPadraoApi para cálculo do preço.
   */
  mkpCustom?: number | null;
  /**
   * Quantidade de drivers por luminaria (para recalcular preço do driver ao mudar mkp).
   */
  driverQtyPerUnit?: number | null;
}

/**
 * Linha de driver desmembrada de um item do carrinho.
 * Armazena os dados do driver para exibição separada no Excel e na pré-visualização.
 * ATENÇÃO: apenas itens criados a partir da versão que introduziu este campo terão
 * driverLines populado. Itens antigos (sem o campo) continuam funcionando normalmente.
 */
export interface DriverLine {
  /** Modelo do driver (ex: "LIFUD 13W 350MA BIVOLT") */
  driverModel: string;
  /** Código do driver (ex: "EQ00236") */
  driverCode: string;
  /** Quantidade total de drivers para este item (qty_item × drivers_por_luminaria) */
  driverQty: number;
  /** Preço unitário do driver (null se não disponível na API) */
  driverUnitPrice: number | null;
  /** Preço total dos drivers = driverUnitPrice × driverQty (null se unitPrice for null) */
  driverTotalPrice: number | null;
  /** Corrente de programação do driver (ex: "350MA", "700MA"). null se não disponível. */
  corrente?: string | null;
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
  freteType?: "free" | "paid" | "night" | "consult" | "pickup";
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
  /** Valor a ser diluído proporcionalmente nos produtos (uso interno, não aparece no Excel) */
  diluicaoValor?: number;
  /** Descrição interna da diluição */
  diluicaoDescricao?: string;
  /**
   * Data de criação do orçamento (ISO string, ex: "2026-07-17T00:00:00.000Z").
   * Usado para distinguir orçamentos antigos (antes de 17/07/2026) dos novos,
   * garantindo compatibilidade retroativa no cálculo do DIFAL.
   */
  quoteCreatedAt?: string;
}

/**
 * REGRA INEGOCIÁVEL: Para itens de perfil (com profileSegments), o driverQty salvo
 * no banco pode estar errado (só por luminária, sem multiplicar por qty total).
 * Esta função corrige automaticamente ao parsear, garantindo que TODOS os locais
 * que usam parseCartItemData recebam valores corretos de driverQty e driverTotalPrice.
 * NÃO alterar esta lógica sem revisar todos os impactos.
 */
export function parseCartItemData(json: string): CartItemData | null {
  try {
    const data = JSON.parse(json) as CartItemData;
    // Corrigir driverQty para itens de perfil com profileSegments
    if (data.driverLines && data.driverLines.length > 0 &&
        data.profileSegments && data.profileSegments.length > 0) {
      const itemQty = data.qty ?? 1;
      // Calcular total de drivers por luminária a partir de profileSegments
      const drvPerLumMap = new Map<string, number>();
      for (const seg of data.profileSegments) {
        if (!seg.driverCode) continue;
        const qtyPerSeg = (seg.driverQtyPerPiece ?? 1) * (seg.qty ?? 1);
        drvPerLumMap.set(seg.driverCode, (drvPerLumMap.get(seg.driverCode) ?? 0) + qtyPerSeg);
      }
      if (drvPerLumMap.size > 0) {
        data.driverLines = data.driverLines.map(dl => {
          const drvPerLum = drvPerLumMap.get(dl.driverCode ?? '') ?? null;
          if (drvPerLum == null) return dl;
          const correctTotal = drvPerLum * itemQty;
          if (dl.driverQty === correctTotal) return dl; // já correto
          // Recalcular: derivar preço unitário do valor salvo e multiplicar pelo total correto
          const unitPrice = dl.driverUnitPrice ??
            (dl.driverTotalPrice != null && dl.driverQty ? dl.driverTotalPrice / dl.driverQty : null);
          return {
            ...dl,
            driverQty: correctTotal,
            driverTotalPrice: unitPrice != null
              ? Math.round(unitPrice * correctTotal * 100) / 100
              : dl.driverTotalPrice,
          };
        });
      }
    }
    return data;
  } catch {
    return null;
  }
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Normaliza o driverModel de todos os campos de um CartItemData usando a descrição
 * canônica da API de componentes (mapa código EQ → descrição).
 *
 * Aplica-se a:
 *  - driverLines[].driverModel
 *  - profileSegments[].driverModel
 *  - ledBarDriverModel
 *
 * Retorna o mesmo objeto se nenhuma alteração for necessária (referência estável).
 */
export function normalizeDriverModels(
  item: CartItemData,
  descMap: Map<string, string>
): CartItemData {
  if (descMap.size === 0) return item;

  let changed = false;

  // 1. driverLines
  let newDriverLines = item.driverLines;
  if (item.driverLines && item.driverLines.length > 0) {
    let dlChanged = false;
    const normalized = item.driverLines.map(dl => {
      if (!dl.driverCode) return dl;
      const canonical = descMap.get(dl.driverCode);
      if (!canonical || canonical === dl.driverModel) return dl;
      dlChanged = true;
      return { ...dl, driverModel: canonical };
    });
    if (dlChanged) { newDriverLines = normalized; changed = true; }
  }

  // 2. profileSegments
  let newProfileSegments = item.profileSegments;
  if (item.profileSegments && item.profileSegments.length > 0) {
    let segChanged = false;
    const normalized = item.profileSegments.map(seg => {
      if (!seg.driverCode) return seg;
      const canonical = descMap.get(seg.driverCode);
      if (!canonical || canonical === seg.driverModel) return seg;
      segChanged = true;
      return { ...seg, driverModel: canonical };
    });
    if (segChanged) { newProfileSegments = normalized; changed = true; }
  }

  // 3. ledBarDriverModel
  let newLedBarDriverModel = item.ledBarDriverModel;
  if (item.ledBarDriverCode) {
    const canonical = descMap.get(item.ledBarDriverCode);
    if (canonical && canonical !== item.ledBarDriverModel) {
      newLedBarDriverModel = canonical;
      changed = true;
    }
  }

  if (!changed) return item;
  return {
    ...item,
    driverLines: newDriverLines,
    profileSegments: newProfileSegments,
    ledBarDriverModel: newLedBarDriverModel,
  };
}
