import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, text, decimal, index, mysqlEnum, tinyint, boolean, unique } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const assistants = mysqlTable("assistants", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 128 }).notNull(),
	email: varchar({ length: 320 }),
	active: boolean().default(true).notNull(),
	/** Se preenchido, este assistente só pode ver/editar orçamentos do vendedor vinculado */
	allowedSellerId: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const auditLogs = mysqlTable("audit_logs", {
	id: int().autoincrement().notNull(),
	userId: int(),
	userEmail: varchar({ length: 320 }),
	userName: varchar({ length: 256 }),
	action: varchar({ length: 64 }).notNull(),
	entityType: varchar({ length: 64 }),
	entityId: int(),
	details: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const cartItems = mysqlTable("cart_items", {
  id: int().autoincrement().notNull(),
  userId: int().notNull(),
  itemData: text().notNull(),
  sortOrder: int().default(0).notNull(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

// ─── Solicitações de orçamento de LD Convidado ────────────────────────────────
// Guarda uma fotografia do carrinho configurado, sem expor valores ao convidado.
export const guestQuoteRequests = mysqlTable("guest_quote_requests", {
  id: int().autoincrement().notNull(),
  guestUserId: int().notNull(),
  guestName: varchar({ length: 256 }).notNull(),
  guestEmail: varchar({ length: 320 }),
  officeName: varchar({ length: 256 }).notNull(),
  finalClientName: varchar({ length: 256 }).notNull(),
  constructorName: varchar({ length: 256 }),
  itemsData: text().notNull(),
  status: mysqlEnum(['pending', 'in_review', 'quote_ready', 'cancelled']).default('pending').notNull(),
  adminQuoteId: int(),
  reviewedByUserId: int(),
  validatedPdfUrl: text(),
  submittedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  convertedAt: timestamp({ mode: 'string' }),
  pdfSentAt: timestamp({ mode: 'string' }),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
  (table) => [
    index("guest_quote_requests_guest_idx").on(table.guestUserId),
    index("guest_quote_requests_status_idx").on(table.status),
    index("guest_quote_requests_quote_idx").on(table.adminQuoteId),
  ],
);

export const quoteItems = mysqlTable("quote_items", {
	id: int().autoincrement().notNull(),
	quoteVersionId: int().notNull(),
	quoteId: int().notNull(),
	itemNumber: int().notNull(),
	itemData: text().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const quoteVersions = mysqlTable("quote_versions", {
	id: int().autoincrement().notNull(),
	quoteId: int().notNull(),
	version: int().notNull(),
	headerSnapshot: text().notNull(),
	totalAmount: decimal({ precision: 12, scale: 2 }).default('0'),
	createdByUserId: int().notNull(),
	/** Rascunho reúne alterações ainda não exportadas; publicada é uma revisão arquivada. */
	status: mysqlEnum(['draft','published']).default('published').notNull(),
	assistantName: varchar({ length: 128 }),
	vendorName: varchar({ length: 128 }),
	versionNotes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	totalFinal: decimal({ precision: 12, scale: 2 }).default('0'),
});

export const quotes = mysqlTable("quotes", {
	id: int().autoincrement().notNull(),
	quoteNumber: varchar({ length: 32 }).notNull(),
	clientName: varchar({ length: 256 }).notNull(),
	clientContact: varchar({ length: 128 }),
	clientPhone: varchar({ length: 64 }),
	clientEmail: varchar({ length: 320 }),
	projectName: varchar({ length: 256 }),
	projectRef: varchar({ length: 128 }),
	vendorName: varchar({ length: 128 }),
	assistantName: varchar({ length: 128 }),
	createdByUserId: int().notNull(),
	status: mysqlEnum(['open','approved','lost','cancelled','invoiced','sample']).default('open').notNull(),
	currentVersion: int().default(1).notNull(),
	totalAmount: decimal({ precision: 12, scale: 2 }).default('0'),
	approvedAt: timestamp({ mode: 'string' }),
	invoicedAt: timestamp({ mode: 'string' }),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	seller1Id: int(),
	seller1Name: varchar({ length: 128 }),
	seller2Id: int(),
	seller2Name: varchar({ length: 128 }),
	assistantId: int(),
	rtPercent: decimal({ precision: 5, scale: 4 }).default('0'),
	rtDest1: varchar({ length: 256 }),
	rtDest1Active: boolean().default(true).notNull(),
	rtDest2: varchar({ length: 256 }),
	rtDest2Active: boolean().default(false).notNull(),
	rtDest3: varchar({ length: 256 }),
	rtDest3Active: boolean().default(false).notNull(),
	marginPercent: decimal({ precision: 5, scale: 4 }).default('0.10'),
	freteType: mysqlEnum(['free','paid','night','consult','pickup']).default('free'),
	freteIsento: boolean().default(false).notNull(),
	freteLocalidade: mysqlEnum(['sp','other']).default('sp'),
	totalFinal: decimal({ precision: 12, scale: 2 }).default('0'),
	/** Número de revisões do orçamento (0 = RV0, 1 = RV1, ...). Incrementa a cada edição/salvamento. */
	revisionCount: int().default(0).notNull(),
	/** Prazo de entrega em dias úteis (padrão: 20) */
	deliveryDays: int().default(20).notNull(),
	/** Percentual de comissão do vendedor (padrão: 5%) */
	commissionPercent: decimal({ precision: 5, scale: 4 }).default('0.05').notNull(),
	/** Comissão do vendedor 2 (0–1, ex: 0.05 = 5%) — quando há dois vendedores, cada um pode ter % diferente */
	commissionPercent2: decimal({ precision: 5, scale: 4 }).default('0'),
	/** Condição de pagamento */
	paymentTerm: varchar({ length: 256 }).default('30% Sinal e 70% a 28DDF (mediante aprovação de cadastro)'),
	/** Estado destino para cálculo de DIFAL (sigla UF) */
	destState: varchar({ length: 2 }),
	/** Se DIFAL está habilitado para este orçamento */
	difalEnabled: boolean().default(false).notNull(),
	/** Alíquota DIFAL calculada (%) */
	difalPercent: decimal({ precision: 5, scale: 2 }).default('0'),
	/** Alíquota FCP (%) */
	fcpPercent: decimal({ precision: 5, scale: 2 }).default('0'),
	/** Se FCP está habilitado para este orçamento */
	fcpEnabled: boolean().default(false).notNull(),
	/** Valor total de DIFAL calculado */
	difalValue: decimal({ precision: 12, scale: 2 }).default('0'),
	/** Valor total de FCP calculado */
	fcpValue: decimal({ precision: 12, scale: 2 }).default('0'),
	/** Número interno do projeto (ex: "2025-0042") — pesquisável, independente do número do orçamento */
	projectNumber: varchar({ length: 64 }),
	/** Valor do frete cotado em R$ (0 = não cotado) */
	freteValue: decimal({ precision: 10, scale: 2 }).default('0'),
	/** Estado de destino do frete (sigla UF, ex: "RJ") — pode ser preenchido automaticamente pelo destState */
	freteState: varchar({ length: 2 }),
	/** Cidade de destino do frete (nome completo, ex: "Rio de Janeiro") */
	freteCity: varchar({ length: 128 }),
	/** Se true, o frete é diluído nos produtos e sai zerado/"incluso" no Excel */
	freteIncluded: boolean().default(false).notNull(),
	/** Nome do arquiteto responsável pelo projeto */
	arquiteto: varchar({ length: 256 }),
	/** Nome do light designer responsável pelo projeto */
	lightDesigner: varchar({ length: 256 }),
	/** Número do pedido de venda (6 dígitos, ex: 102030) — obrigatório ao fechar o orçamento */
	orderNumber: varchar({ length: 6 }),
	/** Empresa do grupo Alfalux que irá faturar este pedido */
	billingCompany: mysqlEnum(['alfalux','primelux','decada','primelase','luminew']),
	/** Valor a ser diluído proporcionalmente nos produtos (uso interno — não aparece no preview/Excel) */
	diluicaoValor: decimal({ precision: 12, scale: 2 }).default('0'),
	/** Descrição interna da diluição (ex: "Saldo devedor ORC 04.0123-25") — não aparece no preview/Excel */
	diluicaoDescricao: varchar({ length: 256 }),
	/** Percentual de desconto global (0–1, ex: 0.10 = 10%). Aplicado após margem. */
	discountPercent: decimal({ precision: 5, scale: 4 }).default('0'),
	/** Se true, exibe desconto nos documentos (Excel, PDF, Preview) para o cliente */
	showDiscount: boolean().default(false),
	/** Prospecção de lighting designer: acompanha separadamente a carteira comercial. */
	isProspecting: boolean().default(false).notNull(),
},
(table) => [
	index("quotes_quoteNumber_unique").on(table.quoteNumber),
]);

export const sellers = mysqlTable("sellers", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 32 }).notNull(),
	name: varchar({ length: 128 }).notNull(),
	phone: varchar({ length: 32 }),
	email: varchar({ length: 320 }),
	active: boolean().default(true).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("sellers_code_unique").on(table.code),
]);

export const apiKeys = mysqlTable("api_keys", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 128 }).notNull(),
	keyHash: varchar({ length: 64 }).notNull(),
	keyPrefix: varchar({ length: 8 }).notNull(),
	createdByUserId: int().notNull(),
	active: boolean().default(true).notNull(),
	lastUsedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("api_keys_keyHash_unique").on(table.keyHash),
]);

export const users = mysqlTable("users", {
	id: int().autoincrement().notNull(),
	openId: varchar({ length: 64 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	loginMethod: varchar({ length: 64 }),
	role: mysqlEnum(['user','admin','gerente','vendedor','assistente','convidado']).default('user').notNull(),
	passwordHash: varchar({ length: 255 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("users_openId_unique").on(table.openId),
]);

// ─── Convites de Usuário ──────────────────────────────────────────────────────
export const invites = mysqlTable("invites", {
	id: int().autoincrement().notNull(),
	email: varchar({ length: 320 }).notNull(),
	token: varchar({ length: 128 }).notNull(),
	role: mysqlEnum(['user','convidado','vendedor','assistente','gerente']).default('convidado').notNull(),
	message: text(),
	invitedByUserId: int(),
	status: mysqlEnum(['pending','accepted','expired','revoked']).default('pending').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	acceptedAt: timestamp({ mode: 'string' }),
	expiresAt: timestamp({ mode: 'string' }),
});

// ─── Permissões Granulares por Usuário ────────────────────────────────────────
export const userPermissions = mysqlTable("user_permissions", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	permission: varchar({ length: 64 }).notNull(),
	grantedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("user_permissions_userId_idx").on(table.userId),
]);

// ─── Pedidos de Fábrica ─────────────────────────────────────────────────────
export const factoryOrders = mysqlTable("factory_orders", {
	id: int().autoincrement().notNull(),
	quoteId: int().notNull(),
	orderNumber: varchar({ length: 20 }),
	revision: int().default(0).notNull(),
	empresa: mysqlEnum(['ALFALUX','LUMINEW']).default('ALFALUX').notNull(),
	status: mysqlEnum(['draft','sent','in_production','completed']).default('draft').notNull(),
	deliveryDays: int().default(19),
	approvedAt: timestamp({ mode: 'string' }),
	notes: text(),
	/** ID do pedido pai (null = pedido principal, preenchido = subpedido) */
	parentOrderId: int(),
	/** Índice do subpedido (1, 2, 3...) — null para pedido principal sem divisão */
	subOrderIndex: int(),
	createdByUserId: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("factory_orders_quoteId_idx").on(table.quoteId),
	index("factory_orders_parentId_idx").on(table.parentOrderId),
]);

export const factoryOrderExcels = mysqlTable("factory_order_excels", {
	id: int().autoincrement().notNull(),
	factoryOrderId: int().notNull(),
	orderNumber: varchar({ length: 20 }).notNull(),
	revision: int().notNull(),
	excelKey: text().notNull(),
	excelUrl: text().notNull(),
	generatedByUserId: int(),
	generatedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("factory_order_excels_orderId_idx").on(table.factoryOrderId),
]);

export const factoryOrderItems = mysqlTable("factory_order_items", {
	id: int().autoincrement().notNull(),
	factoryOrderId: int().notNull(),
	itemNumber: int().default(1).notNull(),
	itemData: text().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("factory_order_items_orderId_idx").on(table.factoryOrderId),
]);

// ─── Tipos inferidos para Insert/Select ──────────────────────────────────────
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type User = InferSelectModel<typeof users>;
export type InsertUser = InferInsertModel<typeof users>;

export type CartItem = InferSelectModel<typeof cartItems>;
export type InsertCartItem = InferInsertModel<typeof cartItems>;

export type Quote = InferSelectModel<typeof quotes>;
export type InsertQuote = InferInsertModel<typeof quotes>;

export type QuoteVersion = InferSelectModel<typeof quoteVersions>;
export type InsertQuoteVersion = InferInsertModel<typeof quoteVersions>;

export type QuoteItem = InferSelectModel<typeof quoteItems>;
export type InsertQuoteItem = InferInsertModel<typeof quoteItems>;

export type AuditLog = InferSelectModel<typeof auditLogs>;
export type InsertAuditLog = InferInsertModel<typeof auditLogs>;

export type Seller = InferSelectModel<typeof sellers>;
export type InsertSeller = InferInsertModel<typeof sellers>;

export type Assistant = InferSelectModel<typeof assistants>;
export type InsertAssistant = InferInsertModel<typeof assistants>;

export type ApiKey = InferSelectModel<typeof apiKeys>;
export type InsertApiKey = InferInsertModel<typeof apiKeys>;
// Tabela de controle de sequência de numeração de orçamentos por vendedor/ano
export const quoteNumberSequences = mysqlTable("quote_number_sequences", {
	id: int().autoincrement().notNull().primaryKey(),
	vendorPrefix: varchar({ length: 10 }).notNull(), // ex: "33"
	year: varchar({ length: 4 }).notNull(),           // ex: "26"
	nextSeq: int().notNull().default(1),              // próximo número a usar
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
	unique("uq_vendor_year").on(table.vendorPrefix, table.year),
]);

export type QuoteNumberSequence = InferSelectModel<typeof quoteNumberSequences>;

export type FactoryOrder = InferSelectModel<typeof factoryOrders>;
export type InsertFactoryOrder = InferInsertModel<typeof factoryOrders>;
export type FactoryOrderItem = InferSelectModel<typeof factoryOrderItems>;
export type InsertFactoryOrderItem = InferInsertModel<typeof factoryOrderItems>;
export type FactoryOrderExcel = InferSelectModel<typeof factoryOrderExcels>;
export type InsertFactoryOrderExcel = InferInsertModel<typeof factoryOrderExcels>;
// ─── Backups Automáticos ─────────────────────────────────────────────────────
export const backups = mysqlTable("backups", {
	id: int().autoincrement().notNull(),
	/** Tipo do backup: 'sql' ou 'excel' */
	type: mysqlEnum(['sql', 'excel']).notNull(),
	/** Nome do arquivo gerado */
	fileName: varchar({ length: 256 }).notNull(),
	/** URL de acesso ao arquivo no S3 */
	fileUrl: text().notNull(),
	/** Chave S3 do arquivo */
	fileKey: varchar({ length: 512 }).notNull(),
	/** Tamanho em bytes */
	fileSizeBytes: int().default(0).notNull(),
	/** Status do backup */
	status: mysqlEnum(['success', 'error']).default('success').notNull(),
	/** Mensagem de erro (se houver) */
	errorMessage: text(),
	/** Contagem de registros exportados (JSON) */
	recordCounts: text(),
	/** ID da tarefa cron que gerou este backup */
	cronTaskUid: varchar({ length: 65 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});
export type Backup = InferSelectModel<typeof backups>;
export type InsertBackup = InferInsertModel<typeof backups>;

// ─── Overrides de Preço de Driver ─────────────────────────────────────────────
export const driverPriceOverrides = mysqlTable("driver_price_overrides", {
	id: int().autoincrement().notNull().primaryKey(),
	/** Código EQ do driver (ex: "EQ00346") */
	driverCode: varchar({ length: 20 }).notNull(),
	/** Modelo do driver para exibição (ex: "LED DRIVER XITANIUM 19W") */
	driverModel: varchar({ length: 256 }),
	/** Custo unitário customizado (substitui o valor da API) */
	customCusto: decimal({ precision: 10, scale: 2 }).notNull(),
	/** Usuário que fez a alteração */
	updatedByUserId: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
	unique("uq_driver_code").on(table.driverCode),
]);
export type DriverPriceOverride = InferSelectModel<typeof driverPriceOverrides>;
export type InsertDriverPriceOverride = InferInsertModel<typeof driverPriceOverrides>;

// ─── Metas de Faturamento ─────────────────────────────────────────────────────
export const salesGoals = mysqlTable("sales_goals", {
	id: int().autoincrement().notNull(),
	/** Ano da meta (ex: 2025) */
	year: int().notNull(),
	/** Mês da meta (1-12). NULL = meta anual */
	month: int(),
	/** Valor da meta em R$ */
	goalAmount: decimal({ precision: 14, scale: 2 }).notNull(),
	/** Usuário que definiu a meta */
	setByUserId: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});
export type SalesGoal = InferSelectModel<typeof salesGoals>;
export type InsertSalesGoal = InferInsertModel<typeof salesGoals>;

/** Faturamento efetivamente realizado, informado pelo gestor para cada mês. */
export const monthlyBillings = mysqlTable("monthly_billings", {
	id: int().autoincrement().notNull(),
	year: int().notNull(),
	month: int().notNull(),
	amount: decimal({ precision: 14, scale: 2 }).notNull(),
	setByUserId: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
	index("monthly_billings_year_month_idx").on(table.year, table.month),
]);
export type MonthlyBilling = InferSelectModel<typeof monthlyBillings>;
export type InsertMonthlyBilling = InferInsertModel<typeof monthlyBillings>;

// ─── Custos Adicionais por Orçamento ─────────────────────────────────────────
export const quoteAdditionalCosts = mysqlTable("quote_additional_costs", {
	id: int().autoincrement().notNull().primaryKey(),
	/** ID do orçamento ao qual este custo está vinculado */
	quoteId: int().notNull(),
	/** Descrição do custo adicional (ex: "Frete especial", "Instalação") */
	descricao: varchar({ length: 256 }).notNull(),
	/** Valor do custo adicional em R$ */
	valor: decimal({ precision: 12, scale: 2 }).notNull(),
	/** Usuário que criou este custo */
	createdByUserId: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
}, (table) => [
	index("quote_additional_costs_quoteId_idx").on(table.quoteId),
]);
export type QuoteAdditionalCost = InferSelectModel<typeof quoteAdditionalCosts>;
export type InsertQuoteAdditionalCost = InferInsertModel<typeof quoteAdditionalCosts>;

/**
 * Pedidos de Amostras — orçamentos convertidos em pedidos sem cobrança.
 * Registra o custo para a empresa e permite vinculação futura a pedidos pagos.
 */
export const sampleOrders = mysqlTable("sample_orders", {
	id: int().autoincrement().notNull(),
	/** ID do orçamento original que foi convertido em amostra */
	quoteId: int().notNull(),
	/** Nome do cliente (desnormalizado para facilitar filtros) */
	clientName: varchar({ length: 256 }).notNull(),
	/** Nome da obra (desnormalizado para facilitar filtros) */
	projectName: varchar({ length: 256 }),
  /** Custo total da amostra para a empresa (totalAmount do orçamento no momento da conversão) */
  costAmount: decimal({ precision: 12, scale: 2 }).notNull(),
  /** Valor comercial original preservado para restaurar o orçamento caso o pedido seja cancelado. */
  originalTotalAmount: decimal({ precision: 14, scale: 2 }),
  /** Total final original preservado para restaurar o orçamento caso o pedido seja cancelado. */
  originalTotalFinal: decimal({ precision: 14, scale: 2 }),
  /** Status do pedido de amostra */
	status: varchar({ length: 32 }).notNull().default('active'),
	/** Natureza do pedido sem cobrança: amostra comercial ou manutenção em garantia. */
	kind: mysqlEnum(['sample', 'maintenance']).default('sample').notNull(),
	/** Observações sobre a amostra */
	notes: text(),
	/** Vendedor responsável (desnormalizado) */
	sellerName: varchar({ length: 256 }),
	/** ID do vendedor */
	sellerId: int(),
	/** Usuário que converteu em amostra */
	createdByUserId: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
}, (table) => [
	index("sample_orders_quoteId_idx").on(table.quoteId),
	index("sample_orders_clientName_idx").on(table.clientName),
	index("sample_orders_status_idx").on(table.status),
]);
export type SampleOrder = InferSelectModel<typeof sampleOrders>;
export type InsertSampleOrder = InferInsertModel<typeof sampleOrders>;

/**
 * Vinculação de pedidos de amostras a pedidos futuros.
 * Permite rastrear se a amostra gerou venda e se o custo foi recuperado.
 */
export const sampleLinks = mysqlTable("sample_links", {
	id: int().autoincrement().notNull(),
	/** ID do pedido de amostra */
	sampleOrderId: int().notNull(),
	/** ID do orçamento futuro vinculado */
	linkedQuoteId: int().notNull(),
	/** Tipo de vinculação: 'cobrar' = cobrar o valor, 'diluir' = diluir no pedido, 'associar' = apenas associar sem cobrar */
	linkType: varchar({ length: 32 }).notNull().default('associar'),
	/** Observações sobre a vinculação */
	notes: text(),
	/** Receita comercial transferida para o orçamento de destino ao cobrar ou diluir. */
	transferredRevenue: decimal({ precision: 14, scale: 2 }),
	/** Custo do pedido sem cobrança transferido para o orçamento de destino. */
	transferredCost: decimal({ precision: 14, scale: 2 }),
	/** Momento em que a transferência financeira foi efetivada. Nulo em vínculo simples. */
	financialTransferredAt: timestamp({ mode: 'string' }),
	/** Usuário que criou a vinculação */
	createdByUserId: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
}, (table) => [
	index("sample_links_sampleOrderId_idx").on(table.sampleOrderId),
	index("sample_links_linkedQuoteId_idx").on(table.linkedQuoteId),
]);
export type SampleLink = InferSelectModel<typeof sampleLinks>;
export type InsertSampleLink = InferInsertModel<typeof sampleLinks>;
