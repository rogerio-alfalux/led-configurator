import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Cart items for quote generation.
 * Each item stores the full configuration as JSON so it can be rendered in the PDF.
 */
export const cartItems = mysqlTable("cart_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** Full serialized item data (category, description, power, cct, qty, unitPrice, totalPrice, photoUrl, sku) */
  itemData: text("itemData").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = typeof cartItems.$inferInsert;

// ─── MÓDULO DE ORÇAMENTOS ────────────────────────────────────────────────────

/**
 * Orçamentos — cabeçalho principal.
 * Cada orçamento tem um número sequencial único e mantém o status atual.
 * O versionamento completo fica em quote_versions.
 */
export const quotes = mysqlTable("quotes", {
  id: int("id").autoincrement().primaryKey(),
  /** Número do orçamento (ex: ORC-2026-0001) */
  quoteNumber: varchar("quoteNumber", { length: 32 }).notNull().unique(),
  /** Dados do cliente */
  clientName: varchar("clientName", { length: 256 }).notNull(),
  clientContact: varchar("clientContact", { length: 128 }),
  clientPhone: varchar("clientPhone", { length: 64 }),
  clientEmail: varchar("clientEmail", { length: 320 }),
  /** Dados da obra/projeto */
  projectName: varchar("projectName", { length: 256 }),
  projectRef: varchar("projectRef", { length: 128 }),
  /** Identificação interna */
  vendorName: varchar("vendorName", { length: 128 }),
  assistantName: varchar("assistantName", { length: 128 }),
  /** Usuário que criou o orçamento */
  createdByUserId: int("createdByUserId").notNull(),
  /** Status do orçamento */
  status: mysqlEnum("status", ["open", "approved", "lost", "cancelled"]).default("open").notNull(),
  /** Versão atual (incrementa a cada revisão) */
  currentVersion: int("currentVersion").default(1).notNull(),
  /** Valor total da versão atual */
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).default("0"),
  /** Data de aprovação pelo cliente */
  approvedAt: timestamp("approvedAt"),
  /** Observações gerais */
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = typeof quotes.$inferInsert;

/**
 * Versões de orçamento — cada revisão gera um novo registro aqui.
 * Permite consultar o histórico completo de alterações.
 */
export const quoteVersions = mysqlTable("quote_versions", {
  id: int("id").autoincrement().primaryKey(),
  quoteId: int("quoteId").notNull(),
  /** Número da revisão (1, 2, 3...) */
  version: int("version").notNull(),
  /** Snapshot dos dados do cabeçalho nesta revisão */
  headerSnapshot: text("headerSnapshot").notNull(),
  /** Valor total desta versão */
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).default("0"),
  /** Quem gerou esta revisão */
  createdByUserId: int("createdByUserId").notNull(),
  assistantName: varchar("assistantName", { length: 128 }),
  vendorName: varchar("vendorName", { length: 128 }),
  /** Observações desta revisão */
  versionNotes: text("versionNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuoteVersion = typeof quoteVersions.$inferSelect;
export type InsertQuoteVersion = typeof quoteVersions.$inferInsert;

/**
 * Itens de cada versão do orçamento.
 * Cada item armazena os dados completos do produto configurado.
 */
export const quoteItems = mysqlTable("quote_items", {
  id: int("id").autoincrement().primaryKey(),
  quoteVersionId: int("quoteVersionId").notNull(),
  quoteId: int("quoteId").notNull(),
  /** Número sequencial do item (1, 2, 3...) */
  itemNumber: int("itemNumber").notNull(),
  /** Dados completos do item (JSON serializado) */
  itemData: text("itemData").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuoteItem = typeof quoteItems.$inferSelect;
export type InsertQuoteItem = typeof quoteItems.$inferInsert;
