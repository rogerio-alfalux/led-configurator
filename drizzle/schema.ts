import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
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

// ─── VENDEDORES ──────────────────────────────────────────────────────────────

/**
 * Cadastro de vendedores da Alfalux.
 * O campo code é o prefixo do número do orçamento (ex: "04.0XXX-26").
 */
export const sellers = mysqlTable("sellers", {
  id: int("id").autoincrement().primaryKey(),
  /** Código do orçamento (ex: "04.0XXX-26") */
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Seller = typeof sellers.$inferSelect;
export type InsertSeller = typeof sellers.$inferInsert;

// ─── ASSISTENTES COMERCIAIS ──────────────────────────────────────────────────

/**
 * Cadastro de assistentes comerciais.
 * Assistentes podem inserir orçamentos mas não aparecem como vendedores.
 */
export const assistants = mysqlTable("assistants", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  email: varchar("email", { length: 320 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Assistant = typeof assistants.$inferSelect;
export type InsertAssistant = typeof assistants.$inferInsert;

// ─── CARRINHO ────────────────────────────────────────────────────────────────

export const cartItems = mysqlTable("cart_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  itemData: text("itemData").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = typeof cartItems.$inferInsert;

// ─── MÓDULO DE ORÇAMENTOS ────────────────────────────────────────────────────

export const quotes = mysqlTable("quotes", {
  id: int("id").autoincrement().primaryKey(),
  quoteNumber: varchar("quoteNumber", { length: 32 }).notNull().unique(),
  /** Dados do cliente */
  clientName: varchar("clientName", { length: 256 }).notNull(),
  clientContact: varchar("clientContact", { length: 128 }),
  clientPhone: varchar("clientPhone", { length: 64 }),
  clientEmail: varchar("clientEmail", { length: 320 }),
  /** Dados da obra/projeto */
  projectName: varchar("projectName", { length: 256 }),
  projectRef: varchar("projectRef", { length: 128 }),
  /** Vendedor 1 (obrigatório) */
  seller1Id: int("seller1Id"),
  seller1Name: varchar("seller1Name", { length: 128 }),
  /** Vendedor 2 (opcional) */
  seller2Id: int("seller2Id"),
  seller2Name: varchar("seller2Name", { length: 128 }),
  /** Assistente comercial (obrigatório) */
  assistantId: int("assistantId"),
  assistantName: varchar("assistantName", { length: 128 }),
  /** Campos legados mantidos para compatibilidade */
  vendorName: varchar("vendorName", { length: 128 }),
  /** Reserva Técnica — percentual (ex: 0.10 = 10%) */
  rtPercent: decimal("rtPercent", { precision: 5, scale: 4 }).default("0"),
  /** Destinos da RT (até 3); null = não aplicável */
  rtDest1: varchar("rtDest1", { length: 256 }),
  rtDest1Active: boolean("rtDest1Active").default(true).notNull(),
  rtDest2: varchar("rtDest2", { length: 256 }),
  rtDest2Active: boolean("rtDest2Active").default(false).notNull(),
  rtDest3: varchar("rtDest3", { length: 256 }),
  rtDest3Active: boolean("rtDest3Active").default(false).notNull(),
  /** Margem de negociação — percentual (ex: 0.10 = 10%) */
  marginPercent: decimal("marginPercent", { precision: 5, scale: 4 }).default("0.10"),
  /** Frete */
  freteType: mysqlEnum("freteType", ["free", "paid", "night", "consult"]).default("free"),
  freteIsento: boolean("freteIsento").default(false).notNull(),
  freteLocalidade: mysqlEnum("freteLocalidade", ["sp", "other"]).default("sp"),
  /** Usuário que criou o orçamento */
  createdByUserId: int("createdByUserId").notNull(),
  status: mysqlEnum("status", ["open", "approved", "lost", "cancelled"]).default("open").notNull(),
  currentVersion: int("currentVersion").default(1).notNull(),
  /** Valor total dos produtos (sem RT, sem margem, sem frete) */
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).default("0"),
  /** Valor total final (com RT + margem + frete) */
  totalFinal: decimal("totalFinal", { precision: 12, scale: 2 }).default("0"),
  approvedAt: timestamp("approvedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = typeof quotes.$inferInsert;

export const quoteVersions = mysqlTable("quote_versions", {
  id: int("id").autoincrement().primaryKey(),
  quoteId: int("quoteId").notNull(),
  version: int("version").notNull(),
  headerSnapshot: text("headerSnapshot").notNull(),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).default("0"),
  totalFinal: decimal("totalFinal", { precision: 12, scale: 2 }).default("0"),
  createdByUserId: int("createdByUserId").notNull(),
  assistantName: varchar("assistantName", { length: 128 }),
  vendorName: varchar("vendorName", { length: 128 }),
  versionNotes: text("versionNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuoteVersion = typeof quoteVersions.$inferSelect;
export type InsertQuoteVersion = typeof quoteVersions.$inferInsert;

export const quoteItems = mysqlTable("quote_items", {
  id: int("id").autoincrement().primaryKey(),
  quoteVersionId: int("quoteVersionId").notNull(),
  quoteId: int("quoteId").notNull(),
  itemNumber: int("itemNumber").notNull(),
  itemData: text("itemData").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuoteItem = typeof quoteItems.$inferSelect;
export type InsertQuoteItem = typeof quoteItems.$inferInsert;

// ─── LOG DE AUDITORIA ────────────────────────────────────────────────────────

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  userEmail: varchar("userEmail", { length: 320 }),
  userName: varchar("userName", { length: 256 }),
  action: varchar("action", { length: 64 }).notNull(),
  entityType: varchar("entityType", { length: 64 }),
  entityId: int("entityId"),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
