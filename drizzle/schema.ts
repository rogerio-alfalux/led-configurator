import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, text, decimal, index, mysqlEnum, tinyint, boolean } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const assistants = mysqlTable("assistants", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 128 }).notNull(),
	email: varchar({ length: 320 }),
	active: boolean().default(true).notNull(),
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
	status: mysqlEnum(['open','approved','lost','cancelled','invoiced']).default('open').notNull(),
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
	freteType: mysqlEnum(['free','paid','night','consult']).default('free'),
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
	/** Se true, o frete é diluído nos produtos e sai zerado/"incluso" no Excel */
	freteIncluded: boolean().default(false).notNull(),
	/** Nome do arquiteto responsável pelo projeto */
	arquiteto: varchar({ length: 256 }),
	/** Nome do light designer responsável pelo projeto */
	lightDesigner: varchar({ length: 256 }),
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
	role: mysqlEnum(['user','admin','gerente','vendedor','assistente']).default('user').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("users_openId_unique").on(table.openId),
]);

// ─── Pedidos de Fábrica ─────────────────────────────────────────────────────
export const factoryOrders = mysqlTable("factory_orders", {
	id: int().autoincrement().notNull(),
	quoteId: int().notNull(),
	orderNumber: varchar({ length: 100 }),
	revision: int().default(1).notNull(),
	empresa: mysqlEnum(['ALFALUX','LUMINEW']).default('ALFALUX').notNull(),
	status: mysqlEnum(['draft','sent','in_production','completed']).default('draft').notNull(),
	deliveryDays: int().default(19),
	approvedAt: timestamp({ mode: 'string' }),
	notes: text(),
	createdByUserId: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("factory_orders_quoteId_idx").on(table.quoteId),
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
export type FactoryOrder = InferSelectModel<typeof factoryOrders>;
export type InsertFactoryOrder = InferInsertModel<typeof factoryOrders>;
export type FactoryOrderItem = InferSelectModel<typeof factoryOrderItems>;
export type InsertFactoryOrderItem = InferInsertModel<typeof factoryOrderItems>;
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
