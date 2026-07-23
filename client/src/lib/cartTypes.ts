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
  /** Código EQ do módulo LED (fita) — usado para requisição de materiais */
  moduloLedCode?: string | null;
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
   * Custo unitário do item especial (preenchido manualmente por usuários privilegiados).
   * Usado para calcular margem de lucro: precoVenda = custoUnitario × markup.
   */
  specialCustoUnitario?: number | null;
  /**
   * Markup (multiplicador) do item especial.
   * precoVenda = custoUnitario × markup. Se preço preenchido primeiro, markup = precoVenda / custoUnitario.
   */
  specialMarkup?: number | null;

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

  // 4. moduloLed — normalizar descrição usando moduloLedCode + descMap
  // Pular normalização quando moduloLed contém múltiplos componentes (separados por " + ")
  // pois nesses casos a string já foi construída com todos os EQs embutidos.
  let newModuloLed = item.moduloLed;
  if (item.moduloLedCode && !(item.moduloLed ?? "").includes(" + ")) {
    const canonical = descMap.get(item.moduloLedCode);
    if (canonical) {
      // Preservar prefixo de quantidade (ex: "2x ") se existir
      const prefixMatch = (item.moduloLed ?? "").match(/^(\d+[xX]\s+)/);
      const prefix = prefixMatch ? prefixMatch[1] : "";
      const expectedModuloLed = `${prefix}${canonical} (${item.moduloLedCode})`;
      if (item.moduloLed !== expectedModuloLed) {
        newModuloLed = expectedModuloLed;
        changed = true;
      }
    }
  }

  // 5. drivers (string legada) — normalizar descrição usando código EQ embutido
  let newDrivers = item.drivers;
  if (item.drivers && item.drivers.trim() !== "") {
    const drvCodeMatch = item.drivers.match(/\(([A-Z]{2}\d+)\)/);
    if (drvCodeMatch) {
      const drvCode = drvCodeMatch[1];
      const canonical = descMap.get(drvCode);
      if (canonical) {
        const drvPrefixMatch = item.drivers.match(/^(\d+[xX]\s+)/);
        const drvPrefix = drvPrefixMatch ? drvPrefixMatch[1] : "";
        const expectedDrivers = `${drvPrefix}${canonical} (${drvCode})`;
        if (item.drivers !== expectedDrivers) {
          newDrivers = expectedDrivers;
          changed = true;
        }
      }
    }
  }



  if (!changed) return item;
  return {
    ...item,
    driverLines: newDriverLines,
    profileSegments: newProfileSegments,
    ledBarDriverModel: newLedBarDriverModel,
    moduloLed: newModuloLed,
    drivers: newDrivers,
  };
}

/**
 * Tipo mínimo de produto da API necessário para o fallback de driver na Migração 3
 * e resolução de ledModuleCode na Migração 4.
 */
export interface ApiProductDriverInfo {
  sku: string;
  driver220: { model: string; code: string | null } | null;
  driverBivolt: { model: string; code: string | null } | null;
  driverQtd220: number | null;
  driverQtdBivolt: number | null;
  /** Código EQ do módulo LED por CCT — para Migração 4 */
  ledModuleEq2700?: string | null;
  ledModuleEq3000?: string | null;
  ledModuleEq4000?: string | null;
  ledModuleEq5000?: string | null;
  /** Código EQ genérico (fallback para RGBW/legados) */
  ledModuleEq?: string | null;
  /** Nome do produto na API (para extractPowerLabelFromName) */
  name?: string;
}

/**
 * Converte power+stripMethod para o label de potência usado como chave composta no productSkuMap.
 * Padrão: "18W", "26W", "36W SF" (Stripflex dupla), "36W SL" (Stripline única).
 */
export function toPowerLabel(power: number | undefined, stripMethod?: string | null): string {
  if (power === 26) return "26W";
  if (power === 36) {
    if (stripMethod === "STRIPLINE") return "36W SL";
    return "36W SF"; // STRIPFLEX dupla
  }
  return "18W"; // default
}

/**
 * Extrai o powerLabel do nome do produto da API.
 * Ex: "BLAZE E IF 6B 3395MM 18W 36W SL" → "36W SL"
 */
export function extractPowerLabelFromName(name: string): string {
  if (/36W\s*SL/i.test(name)) return "36W SL";
  if (/36W\s*SF/i.test(name)) return "36W SF";
  if (/26W/i.test(name)) return "26W";
  return "18W";
}

/**
 * Aplica as Migrações 1, 2, 3 e 6 em um CartItemData bruto (sem driverLines),
 * retornando um novo objeto com driverLines preenchidas quando possível.
 *
 * - Migração 1: itens com profileSegments+driverCode
 * - Migração 2: itens com accessories contendo drivers (EQ*)
 * - Migração 3: itens com campo `drivers` (string legada), com fallback via API de produtos
 *   Preferência: driver220 primeiro, se null usa driverBivolt
 * - Migração 6: enriquecer corrente em driverLines e profileSegments existentes via correnteMap
 *
 * Também aplica normalizeDriverModels (descrição canônica da API de componentes).
 */
export function migrateItemDrivers(
  item: CartItemData,
  priceMap: Map<string, number>,
  descMap: Map<string, string>,
  productSkuMap: Map<string, ApiProductDriverInfo>,
  correnteMap?: Map<string, string | null>,
  reverseDescMap?: Map<string, string>,
): CartItemData {
  // ── Migração 4: Corrigir ledModuleCode nos profileSegments ──
  // Busca o produto correto da API pelo SKU do perfil + potência + stripMethod
  // e sobrescreve o ledModuleCode com o EQ correto para a CCT do item.
  // Funciona mesmo quando CCT é "A definir" (usa ledModuleEq genérico).
  if (item.profileSegments && item.profileSegments.length > 0 && item.power) {
    const powerNum = parseInt(item.power, 10);
    const powerLabel = toPowerLabel(isNaN(powerNum) ? undefined : powerNum, item.stripMethod);
    const cctKey = (item.cct ?? "").replace("K", "") as "2700" | "3000" | "4000" | "5000";
    const hasCctKey = ["2700", "3000", "4000", "5000"].includes(cctKey);
    let anyChanged = false;
    // Extrair código-base do perfil do item (ex: LLP-6060 de LLP-6060.C90.00)
    const itemSkuBase = (item.sku ?? "").match(/^([A-Z]{2,3}-\d{4})/i)?.[1]?.toUpperCase() ?? "";
    const newSegments = item.profileSegments.map(seg => {
      // Extrair código-base do segmento (ex: LLP-6060 de LLP-6060.C90.00)
      const segSkuBase = seg.sku.match(/^([A-Z]{2,3}-\d{4})/i)?.[1]?.toUpperCase() ?? "";
      // Buscar produto: 1) sku|powerLabel, 2) sku simples, 3) base|powerLabel, 4) base simples
      const product =
        productSkuMap.get(`${seg.sku}|${powerLabel}`) ??
        productSkuMap.get(seg.sku) ??
        (segSkuBase ? productSkuMap.get(`${segSkuBase}|${powerLabel}`) : undefined) ??
        (segSkuBase ? productSkuMap.get(segSkuBase) : undefined) ??
        // Fallback: usar código-base do item (para cantos que não têm entrada própria)
        (itemSkuBase ? productSkuMap.get(`${itemSkuBase}|${powerLabel}`) : undefined) ??
        (itemSkuBase ? productSkuMap.get(itemSkuBase) : undefined);
      if (!product) return seg;
      let correctEq: string | null = null;
      if (hasCctKey) {
        const eqField = `ledModuleEq${cctKey}` as keyof ApiProductDriverInfo;
        correctEq = (product[eqField] as string | null | undefined) ?? product.ledModuleEq ?? null;
      } else {
        // CCT "A definir" ou inválida: usar EQ genérico
        correctEq = product.ledModuleEq ?? product.ledModuleEq3000 ?? product.ledModuleEq4000 ?? null;
      }
      // SEMPRE sobrescrever com o EQ correto da API (baseado na potência real do item)
      if (correctEq && correctEq !== seg.ledModuleCode) {
        anyChanged = true;
        return { ...seg, ledModuleCode: correctEq };
      }
      return seg;
    });
    if (anyChanged) {
      item = { ...item, profileSegments: newSegments };
    }
  }

  // Normalização 0 + Migração 6: itens que já têm driverLines
  // Normalizar driverModel E enriquecer corrente via correnteMap quando ausente
  if (item.driverLines && item.driverLines.length > 0) {
    let enriched = item;
    if (correnteMap && correnteMap.size > 0) {
      const needsEnrich = item.driverLines.some(
        dl => dl.driverCode && (dl.corrente == null || dl.corrente === "") && correnteMap.has(dl.driverCode)
      );
      if (needsEnrich) {
        const newLines = item.driverLines.map(dl => {
          if (!dl.driverCode || (dl.corrente != null && dl.corrente !== "")) return dl;
          const corrente = correnteMap.get(dl.driverCode);
          if (corrente == null) return dl;
          return { ...dl, corrente };
        });
        enriched = { ...item, driverLines: newLines };
      }
    }
    // Também enriquecer corrente nos profileSegments quando driverLines já existem
    if (correnteMap && correnteMap.size > 0 && enriched.profileSegments && enriched.profileSegments.length > 0) {
      const needsSegEnrich = enriched.profileSegments.some(
        seg => seg.driverCode && (seg.corrente == null || seg.corrente === "") && correnteMap.has(seg.driverCode)
      );
      if (needsSegEnrich) {
        const newSegs = enriched.profileSegments.map(seg => {
          if (!seg.driverCode || (seg.corrente != null && seg.corrente !== "")) return seg;
          const corrente = correnteMap.get(seg.driverCode);
          if (corrente == null) return seg;
          return { ...seg, corrente };
        });
        enriched = { ...enriched, profileSegments: newSegs };
      }
    }
    return normalizeDriverModels(enriched, descMap);
  }

  // Migração 1: profileSegments com driverCode
  if (item.profileSegments && item.profileSegments.length > 0 &&
      item.profileSegments.some(seg => seg.driverCode)) {
    const itemQty = item.qty ?? 1;
    const drvMap = new Map<string, { driverCode: string; driverModel: string; qtyPerLuminaria: number }>();
    for (const seg of item.profileSegments) {
      if (!seg.driverCode) continue;
      const key = seg.driverCode;
      const qtyPerSeg = (seg.driverQtyPerPiece ?? 1) * (seg.qty ?? 1);
      if (drvMap.has(key)) {
        drvMap.get(key)!.qtyPerLuminaria += qtyPerSeg;
      } else {
        drvMap.set(key, { driverCode: seg.driverCode, driverModel: seg.driverModel ?? seg.driverCode, qtyPerLuminaria: qtyPerSeg });
      }
    }
    const driverEntries = Array.from(drvMap.values());
    let totalDriverCost = 0;
    const driverLines: DriverLine[] = driverEntries.map(drv => {
      const totalQty = drv.qtyPerLuminaria * itemQty;
      const unitPrice = priceMap.get(drv.driverCode) ?? null;
      const totalPrice = unitPrice != null ? unitPrice * totalQty : null;
      if (totalPrice != null) totalDriverCost += totalPrice;
      const corrente = correnteMap?.get(drv.driverCode) ?? null;
      return { driverCode: drv.driverCode, driverModel: descMap.get(drv.driverCode) ?? drv.driverModel, driverQty: totalQty, driverUnitPrice: unitPrice, driverTotalPrice: totalPrice, ...(corrente ? { corrente } : {}) };
    });
    const totalPrice = item.totalPrice ?? 0;
    const priceWithoutDriver = totalDriverCost > 0
      ? totalPrice - totalDriverCost
      : (item.priceWithoutDriver ?? (totalPrice > 0 ? totalPrice - driverLines.reduce((s, dl) => s + (dl.driverTotalPrice ?? 0), 0) : null));
    const unitPriceLuminaria = priceWithoutDriver != null && itemQty > 0 ? priceWithoutDriver / itemQty : (item.unitPriceLuminaria ?? null);
    return normalizeDriverModels({
      ...item,
      driverLines,
      priceWithoutDriver: priceWithoutDriver ?? item.priceWithoutDriver,
      unitPriceLuminaria: unitPriceLuminaria ?? item.unitPriceLuminaria,
      luminariaHasApiPrice: totalDriverCost > 0 || (item.unitPriceLuminaria != null),
    }, descMap);
  }

  // Migração 2: accessories com drivers (EQ*) sem preço unitário
  const accessories = (item.accessories as LinkedAccessory[] | undefined) ?? [];
  const driverAccessories = accessories.filter(acc =>
    acc.codigo && (acc.unitPrice == null || acc.unitPrice === 0) &&
    priceMap.has(acc.codigo)
  );
  if (driverAccessories.length > 0) {
    const itemQty = item.qty ?? 1;
    const driverLines: DriverLine[] = driverAccessories.map(acc => {
      const unitPrice = priceMap.get(acc.codigo)!;
      const totalQty = (acc.qty ?? 1) * itemQty;
      const totalPrice = unitPrice * totalQty;
      const corrente = correnteMap?.get(acc.codigo) ?? null;
      return {
        driverCode: acc.codigo,
        driverModel: descMap.get(acc.codigo) ?? acc.descricao,
        driverQty: totalQty,
        driverUnitPrice: unitPrice,
        driverTotalPrice: totalPrice,
        ...(corrente ? { corrente } : {}),
      };
    });
    const totalDriverCost = driverLines.reduce((s, dl) => s + (dl.driverTotalPrice ?? 0), 0);
    const totalPrice = item.totalPrice ?? 0;
    const priceWithoutDriver = totalPrice > 0 ? totalPrice - totalDriverCost : null;
    const unitPriceLuminaria = priceWithoutDriver != null && itemQty > 0 ? priceWithoutDriver / itemQty : (item.unitPriceLuminaria ?? null);
    return normalizeDriverModels({
      ...item,
      driverLines,
      priceWithoutDriver: priceWithoutDriver ?? item.priceWithoutDriver,
      unitPriceLuminaria: unitPriceLuminaria ?? item.unitPriceLuminaria,
      luminariaHasApiPrice: true,
    }, descMap);
  }

  // Migração 3: campo `drivers` (string legada)
  // Formatos: "Nx DRIVER MODELO (EQxxxxx)" ou "DRIVER MODELO (EQxxxxx)" ou "1x DRIVER" (genérico)
  if (item.drivers && item.drivers.trim().length > 0) {
    const driversStr = item.drivers.trim();
    const eqMatch = driversStr.match(/\(([A-Z]{2}\d{4,})\)/i);
    const eqCode = eqMatch ? eqMatch[1].toUpperCase() : null;
    const qtyMatch = driversStr.match(/^(\d+)x?\s/i);
    const drvQtyPerUnit = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
    let driverModel = driversStr
      .replace(/^\d+x?\s*/i, '')
      .replace(/\s*\([A-Z]{2}\d{4,}\)\s*$/i, '')
      .replace(/^DRIVER\s*/i, '')
      .trim();
    if (!driverModel && eqCode) driverModel = eqCode;
    if (eqCode && descMap.has(eqCode)) driverModel = descMap.get(eqCode)!;

    // Fallback: sem EQ extraível → buscar da API pelo SKU
    // Preferir driver220; se null, usar driverBivolt (conforme instrução do usuário)
    const resolvedEqCode = eqCode ?? (() => {
      const apiProd = item.sku ? productSkuMap.get(item.sku) : null;
      if (!apiProd) return null;
      const drvInfo = apiProd.driver220 ?? apiProd.driverBivolt;
      return drvInfo?.code ?? null;
    })();
    const resolvedDrvQtyPerUnit = eqCode ? drvQtyPerUnit : (() => {
      const apiProd = item.sku ? productSkuMap.get(item.sku) : null;
      if (!apiProd) return 1;
      return apiProd.driverQtd220 ?? apiProd.driverQtdBivolt ?? 1;
    })();
    const resolvedDriverModel = eqCode ? driverModel : (() => {
      const apiProd = item.sku ? productSkuMap.get(item.sku) : null;
      if (!apiProd) return driverModel;
      const drvInfo = apiProd.driver220 ?? apiProd.driverBivolt;
      if (!drvInfo) return driverModel;
      const code = drvInfo.code;
      if (code && descMap.has(code)) return descMap.get(code)!;
      return drvInfo.model ?? driverModel;
    })();

    if (resolvedEqCode) {
      const itemQty = item.qty ?? 1;
      const totalQty = resolvedDrvQtyPerUnit * itemQty;
      const unitPrice = priceMap.get(resolvedEqCode) ?? null;
      const totalPrice = unitPrice != null ? unitPrice * totalQty : null;
      const corrente3 = correnteMap?.get(resolvedEqCode) ?? null;
      const driverLines: DriverLine[] = [{
        driverCode: resolvedEqCode,
        driverModel: resolvedDriverModel,
        driverQty: totalQty,
        driverUnitPrice: unitPrice,
        driverTotalPrice: totalPrice,
        ...(corrente3 ? { corrente: corrente3 } : {}),
      }];
      const totalDriverCost = totalPrice ?? 0;
      const totalPriceItem = item.totalPrice ?? 0;
      const priceWithoutDriver = totalDriverCost > 0 && totalPriceItem > 0
        ? totalPriceItem - totalDriverCost
        : (item.priceWithoutDriver ?? null);
      const unitPriceLuminaria = priceWithoutDriver != null && itemQty > 0
        ? priceWithoutDriver / itemQty
        : (item.unitPriceLuminaria ?? null);
      return {
        ...item,
        driverLines,
        priceWithoutDriver: priceWithoutDriver ?? item.priceWithoutDriver,
        unitPriceLuminaria: unitPriceLuminaria ?? item.unitPriceLuminaria,
        luminariaHasApiPrice: unitPrice != null,
      };
    }
  }

  // ── Migração 5: Resolver moduloLedCode para itens LED BAR sem código EQ da fita ──
  // Itens LED BAR antigos não têm moduloLedCode. Resolver via productSkuMap.
  if (item.category === "LED BAR" && item.moduloLed && !item.moduloLedCode) {
    const cctKey = (item.cct ?? "").replace("K", "") as "2700" | "3000" | "4000" | "5000";
    // Buscar por sku|potencia (ex: "LED BAR U DA|5W/m") para pegar o produto correto
    const powerField = item.power ?? "";
    const compositeKey = `${item.sku}|${powerField}`;
    const apiProd = item.sku
      ? (productSkuMap.get(compositeKey) ?? productSkuMap.get(item.sku))
      : null;
    if (apiProd) {
      const eqByCct = (apiProd as any)[`ledModuleEq${cctKey}`] as string | null | undefined;
      const resolvedEq = eqByCct ?? apiProd.ledModuleEq ?? null;
      if (resolvedEq) {
        return { ...normalizeDriverModels(item, descMap), moduloLedCode: resolvedEq };
      }
    }
  }

  // ── Migração 7: Resolver moduloLedCode para itens com driverLines sem código EQ do módulo LED ──
  // Itens antigos de downlight, spot, painel, arandela e área externa não têm moduloLedCode.
  // Resolver via reverseDescMap (busca reversa por descrição do componente).
  if (
    item.driverLines &&
    item.driverLines.length > 0 &&
    item.moduloLed &&
    !item.moduloLedCode
  ) {
    // Extrair apenas o nome do módulo sem o código EQ entre parênteses
    // ex: "LÚCIO ROUND Ø120MM 54L 3000K (EQ00123)" → "LÚCIO ROUND Ø120MM 54L 3000K"
    const moduloBase = item.moduloLed.replace(/\s*\([^)]*\)\s*/g, " ").trim();
    const resolvedEq =
      reverseDescMap?.get(moduloBase.toUpperCase()) ??
      reverseDescMap?.get(item.moduloLed.toUpperCase().trim()) ??
      null;
    if (resolvedEq) {
      return { ...normalizeDriverModels(item, descMap), moduloLedCode: resolvedEq };
    }
  }

  // Nenhuma migração aplicável — apenas normalizar descrições existentes
  return normalizeDriverModels(item, descMap);
}
