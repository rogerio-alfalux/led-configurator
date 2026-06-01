import { drizzle } from "drizzle-orm/mysql2";
import { eq, like, or, desc, and, sql, asc } from "drizzle-orm";
import {
  InsertUser, users, cartItems, InsertCartItem, sellers, assistants,
  quotes, quoteVersions, quoteItems, InsertQuote, InsertQuoteVersion, InsertQuoteItem,
  auditLogs, InsertAuditLog
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

// ─── Cart helpers ────────────────────────────────────────────────────────────

export async function addCartItem(data: InsertCartItem): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(cartItems).values(data);
  return (result as unknown as { insertId: number }[])[0]?.insertId ?? 0;
}

export async function getCartItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cartItems).where(eq(cartItems.userId, userId));
}

export async function removeCartItem(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(cartItems).where(eq(cartItems.id, id));
}

export async function clearCart(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(cartItems).where(eq(cartItems.userId, userId));
}

export async function updateCartItemQty(id: number, userId: number, qty: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Fetch the item, update qty in JSON, and save back
  const rows = await db.select().from(cartItems).where(eq(cartItems.id, id)).limit(1);
  if (!rows.length) throw new Error("Item not found");
  const item = rows[0];
  if (item.userId !== userId) throw new Error("Forbidden");
  const data = JSON.parse(item.itemData);
  data.qty = qty;
  data.totalPrice = (data.unitPrice ?? 0) * qty;
  await db.update(cartItems).set({ itemData: JSON.stringify(data) }).where(eq(cartItems.id, id));
}

/** Atualiza campos arbitrários do itemData de um item do carrinho */
export async function updateCartItemData(id: number, userId: number, patch: Record<string, unknown>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(cartItems).where(eq(cartItems.id, id)).limit(1);
  if (!rows.length) throw new Error("Item not found");
  const item = rows[0];
  if (item.userId !== userId) throw new Error("Forbidden");
  const data = JSON.parse(item.itemData);
  Object.assign(data, patch);
  await db.update(cartItems).set({ itemData: JSON.stringify(data) }).where(eq(cartItems.id, id));
}

// ─── Quote helpers ────────────────────────────────────────────────────────────

/** Gera o próximo número de orçamento no formato XX.NNNN-AA (código vendedor + sequencial anual + ano) */
export async function generateQuoteNumber(sellerCode?: string | null): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const year = new Date().getFullYear().toString().slice(-2); // ex: "26"

  // Formato final: "XX.NNNN-AA"
  // XX   = código do vendedor (2 dígitos, ex: "33")
  // NNNN = sequencial 4 dígitos com zero à esquerda, zera a cada virada de ano
  // AA   = ano vigente 2 dígitos (ex: "26")
  //
  // O campo code do vendedor pode ser "33.0XXX-26" ou "33.0XXX" —
  // extraimos apenas os dígitos antes do ponto como código do vendedor.

  let vendorCode: string | null = null;
  if (sellerCode) {
    // Extrai os dígitos antes do primeiro ponto: "33.0XXX-26" → "33"
    const m = sellerCode.match(/^(\d+)/);
    if (m) vendorCode = m[1];
  }

  if (vendorCode) {
    // Padrão do ano vigente: "33.XXXX-26"
    const pattern = `${vendorCode}.%-${year}`;
    const rows = await db
      .select({ quoteNumber: quotes.quoteNumber })
      .from(quotes)
      .where(like(quotes.quoteNumber, pattern))
      .orderBy(desc(quotes.quoteNumber))
      .limit(100);

    // Extrai o sequencial de cada número no formato "XX.NNNN-AA"
    let maxSeq = 0;
    const re = new RegExp(`^${vendorCode}\\.(\\d{4})-${year}$`);
    for (const r of rows) {
      const m2 = r.quoteNumber.match(re);
      if (m2) {
        const n = parseInt(m2[1], 10);
        if (n > maxSeq) maxSeq = n;
      }
    }
    const nextSeq = maxSeq + 1;
    return `${vendorCode}.${String(nextSeq).padStart(4, "0")}-${year}`;
  }

  // Fallback sem vendedor: formato ORC-YY-NNNN
  const prefix = `ORC-${year}-`;
  const rows = await db
    .select({ quoteNumber: quotes.quoteNumber })
    .from(quotes)
    .where(like(quotes.quoteNumber, `${prefix}%`))
    .orderBy(desc(quotes.quoteNumber))
    .limit(1);
  if (!rows.length) return `${prefix}0001`;
  const last = rows[0].quoteNumber;
  const seq = parseInt(last.replace(prefix, ""), 10) + 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export interface SaveQuoteInput {
  quoteNumber?: string;
  clientName: string;
  clientContact?: string;
  clientPhone?: string;
  clientEmail?: string;
  projectName?: string;
  projectRef?: string;
  vendorName?: string;
  assistantName?: string;
  seller1Id?: number;
  seller1Name?: string;
  seller2Id?: number;
  seller2Name?: string;
  assistantId?: number;
  rtPercent?: number;
  rtDest1?: string;
  rtDest1Active?: boolean;
  rtDest2?: string;
  rtDest2Active?: boolean;
  rtDest3?: string;
  rtDest3Active?: boolean;
  marginPercent?: number;
  freteType?: "free" | "paid" | "night" | "consult";
  freteIsento?: boolean;
  freteLocalidade?: "sp" | "other";
  notes?: string;
  versionNotes?: string;
  totalAmount: number;
  totalFinal?: number;
  items: Array<{ itemNumber: number; itemData: string }>;
  createdByUserId: number;
}

/** Cria um novo orçamento com versão 1 */
export async function createQuote(input: SaveQuoteInput): Promise<{ quoteId: number; quoteNumber: string; versionId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const quoteNumber = input.quoteNumber?.trim() || await generateQuoteNumber();
  const headerSnapshot = JSON.stringify({
    clientName: input.clientName,
    clientContact: input.clientContact,
    clientPhone: input.clientPhone,
    clientEmail: input.clientEmail,
    projectName: input.projectName,
    projectRef: input.projectRef,
    vendorName: input.vendorName,
    assistantName: input.assistantName,
    notes: input.notes,
  });

  // Insert quote
  const qResult = await db.insert(quotes).values({
    quoteNumber,
    clientName: input.clientName,
    clientContact: input.clientContact ?? null,
    clientPhone: input.clientPhone ?? null,
    clientEmail: input.clientEmail ?? null,
    projectName: input.projectName ?? null,
    projectRef: input.projectRef ?? null,
    vendorName: input.vendorName ?? null,
    assistantName: input.assistantName ?? null,
    seller1Id: input.seller1Id ?? null,
    seller1Name: input.seller1Name ?? null,
    seller2Id: input.seller2Id ?? null,
    seller2Name: input.seller2Name ?? null,
    assistantId: input.assistantId ?? null,
    rtPercent: input.rtPercent != null ? String(input.rtPercent) : null,
    rtDest1: input.rtDest1 ?? null,
    rtDest1Active: input.rtDest1Active ?? false,
    rtDest2: input.rtDest2 ?? null,
    rtDest2Active: input.rtDest2Active ?? false,
    rtDest3: input.rtDest3 ?? null,
    rtDest3Active: input.rtDest3Active ?? false,
    marginPercent: input.marginPercent != null ? String(input.marginPercent) : null,
    freteType: input.freteType ?? null,
    freteIsento: input.freteIsento ?? false,
    freteLocalidade: input.freteLocalidade ?? null,
    createdByUserId: input.createdByUserId,
    status: "open",
    currentVersion: 1,
    revisionCount: 0,
    totalAmount: String(input.totalAmount),
    totalFinal: input.totalFinal != null ? String(input.totalFinal) : null,
    notes: input.notes ?? null,
  });
  const quoteId = (qResult as unknown as { insertId: number }[])[0]?.insertId ?? 0;

  // Insert version 1
  const vResult = await db.insert(quoteVersions).values({
    quoteId,
    version: 1,
    headerSnapshot,
    totalAmount: String(input.totalAmount),
    totalFinal: input.totalFinal != null ? String(input.totalFinal) : String(input.totalAmount),
    createdByUserId: input.createdByUserId,
    assistantName: input.assistantName ?? null,
    vendorName: input.vendorName ?? null,
    versionNotes: input.versionNotes ?? null,
  });
  const versionId = (vResult as unknown as { insertId: number }[])[0]?.insertId ?? 0;

  // Insert items
  if (input.items.length > 0) {
    await db.insert(quoteItems).values(
      input.items.map((it) => ({
        quoteVersionId: versionId,
        quoteId,
        itemNumber: it.itemNumber,
        itemData: it.itemData,
      }))
    );
  }

  return { quoteId, quoteNumber, versionId };
}

/** Adiciona uma nova revisão a um orçamento existente */
export async function addQuoteRevision(
  quoteId: number,
  input: SaveQuoteInput
): Promise<{ versionId: number; version: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current version
  const qRows = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  if (!qRows.length) throw new Error("Quote not found");
  const quote = qRows[0];
  const newVersion = quote.currentVersion + 1;

  const headerSnapshot = JSON.stringify({
    clientName: input.clientName,
    clientContact: input.clientContact,
    clientPhone: input.clientPhone,
    clientEmail: input.clientEmail,
    projectName: input.projectName,
    projectRef: input.projectRef,
    vendorName: input.vendorName,
    assistantName: input.assistantName,
    notes: input.notes,
  });

  // Update quote header — incrementa revisionCount a cada edição/salvamento
  await db.update(quotes).set({
    clientName: input.clientName,
    clientContact: input.clientContact ?? null,
    clientPhone: input.clientPhone ?? null,
    clientEmail: input.clientEmail ?? null,
    projectName: input.projectName ?? null,
    projectRef: input.projectRef ?? null,
    vendorName: input.vendorName ?? null,
    assistantName: input.assistantName ?? null,
    notes: input.notes ?? null,
    currentVersion: newVersion,
    totalAmount: String(input.totalAmount),
    totalFinal: input.totalFinal != null ? String(input.totalFinal) : String(input.totalAmount),
    rtPercent: input.rtPercent != null ? String(input.rtPercent) : '0',
    marginPercent: input.marginPercent != null ? String(input.marginPercent) : '0',
    revisionCount: sql`revisionCount + 1`,
  }).where(eq(quotes.id, quoteId));

  // Insert new version
  const vResult = await db.insert(quoteVersions).values({
    quoteId,
    version: newVersion,
    headerSnapshot,
    totalAmount: String(input.totalAmount),
    totalFinal: input.totalFinal != null ? String(input.totalFinal) : String(input.totalAmount),
    createdByUserId: input.createdByUserId,
    assistantName: input.assistantName ?? null,
    vendorName: input.vendorName ?? null,
    versionNotes: input.versionNotes ?? null,
  });
  const versionId = (vResult as unknown as { insertId: number }[])[0]?.insertId ?? 0;

  // Insert items for new version
  if (input.items.length > 0) {
    await db.insert(quoteItems).values(
      input.items.map((it) => ({
        quoteVersionId: versionId,
        quoteId,
        itemNumber: it.itemNumber,
        itemData: it.itemData,
      }))
    );
  }

  return { versionId, version: newVersion };
}

/** Lista orçamentos com busca e paginação */
export async function listQuotes(opts: {
  search?: string;
  status?: "open" | "approved" | "lost" | "cancelled";
  seller1Name?: string;
  assistantName?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { rows: [], total: 0 };

  const conditions = [];
  if (opts.status) conditions.push(eq(quotes.status, opts.status));
  if (opts.seller1Name) conditions.push(like(quotes.seller1Name, `%${opts.seller1Name}%`));
  if (opts.assistantName) conditions.push(like(quotes.assistantName, `%${opts.assistantName}%`));
  if (opts.search) {
    const s = `%${opts.search}%`;
    conditions.push(
      or(
        like(quotes.quoteNumber, s),
        like(quotes.clientName, s),
        like(quotes.vendorName, s),
        like(quotes.projectName, s)
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;

  const rows = await db
    .select()
    .from(quotes)
    .where(where)
    .orderBy(desc(quotes.createdAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(quotes)
    .where(where);

  return { rows, total: Number(countResult[0]?.count ?? 0) };
}

/** Busca um orçamento completo com todas as versões e itens */
export async function getQuoteById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const qRows = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  if (!qRows.length) return null;

  const versions = await db
    .select()
    .from(quoteVersions)
    .where(eq(quoteVersions.quoteId, id))
    .orderBy(desc(quoteVersions.version));

  const items = await db
    .select()
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, id))
    .orderBy(quoteItems.itemNumber);

  return { quote: qRows[0], versions, items };
}

/** Aprova um orçamento */
export async function approveQuote(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(quotes).set({
    status: "approved",
    approvedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
  }).where(eq(quotes.id, id));
}

/** Atualiza o status de um orçamento */
export async function updateQuoteStatus(id: number, status: "open" | "approved" | "lost" | "cancelled") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = { status };
  if (status === "approved") updateData.approvedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await db.update(quotes).set(updateData).where(eq(quotes.id, id));
}

/** Estatísticas para o dashboard */
export async function getQuoteStats() {
  const db = await getDb();
  if (!db) return null;

  const [totals] = await db
    .select({
      total: sql<number>`count(*)`,
      open: sql<number>`sum(case when status = 'open' then 1 else 0 end)`,
      approved: sql<number>`sum(case when status = 'approved' then 1 else 0 end)`,
      lost: sql<number>`sum(case when status = 'lost' then 1 else 0 end)`,
      cancelled: sql<number>`sum(case when status = 'cancelled' then 1 else 0 end)`,
      totalAmount: sql<number>`sum(cast(totalAmount as decimal(12,2)))`,
      approvedAmount: sql<number>`sum(case when status = 'approved' then cast(totalAmount as decimal(12,2)) else 0 end)`,
    })
    .from(quotes);

  // Top vendedores
  const topVendors = await db
    .select({
      name: quotes.vendorName,
      count: sql<number>`count(*)`,
      amount: sql<number>`sum(cast(totalAmount as decimal(12,2)))`,
    })
    .from(quotes)
    .groupBy(quotes.vendorName)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  // Top assistentes
  const topAssistants = await db
    .select({
      name: quotes.assistantName,
      count: sql<number>`count(*)`,
    })
    .from(quotes)
    .groupBy(quotes.assistantName)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  // Orçamentos por mês (últimos 12 meses)
  const byMonth = await db
    .select({
      month: sql<string>`DATE_FORMAT(createdAt, '%Y-%m')`,
      count: sql<number>`count(*)`,
      amount: sql<number>`sum(cast(totalAmount as decimal(12,2)))`,
    })
    .from(quotes)
    .where(sql`createdAt >= DATE_SUB(NOW(), INTERVAL 12 MONTH)`)
    .groupBy(sql`DATE_FORMAT(createdAt, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(createdAt, '%Y-%m')`);

  return { totals, topVendors, topAssistants, byMonth };
}

/** Exclui um orçamento e todas as suas versões e itens */
export async function deleteQuote(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete items first (FK constraint)
  await db.delete(quoteItems).where(eq(quoteItems.quoteId, id));
  // Delete versions
  await db.delete(quoteVersions).where(eq(quoteVersions.quoteId, id));
  // Delete quote
  await db.delete(quotes).where(eq(quotes.id, id));
}

/** Gera sugestão de próximo número de orçamento sem criar nada no banco */
export async function suggestQuoteNumber(sellerId?: number | null): Promise<string> {
  if (sellerId) {
    const db = await getDb();
    if (db) {
      const sellerRows = await db.select().from(sellers).where(eq(sellers.id, sellerId)).limit(1);
      const sellerCode = sellerRows[0]?.code ?? null;
      return generateQuoteNumber(sellerCode);
    }
  }
  return generateQuoteNumber();
}

// ─── Auditoria ────────────────────────────────────────────────────────────────
// (auditLogs e InsertAuditLog já importados acima)

/**
 * E-mails dos administradores do sistema.
 * Esses usuários têm acesso total, incluindo logs de auditoria.
 */
export const ADMIN_EMAILS = [
  "rogeriojohnwayne@gmail.com",
  "rogerio@grupoalfalux.com.br",
];

/**
 * Domínio permitido para acesso ao sistema.
 * Usuários com e-mail fora desse domínio serão bloqueados (exceto ADMINs).
 */
export const ALLOWED_DOMAIN = "grupoalfalux";

/**
 * Verifica se um e-mail tem permissão para acessar o sistema.
 * Permite: ADMINs explícitos + qualquer e-mail @grupoalfalux.*
 */
export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  if (ADMIN_EMAILS.includes(lower)) return true;
  // Aceita qualquer subdomínio de grupoalfalux (ex: @grupoalfalux.com.br, @grupoalfalux.com)
  return /@grupoalfalux\b/.test(lower);
}

/**
 * Verifica se um e-mail pertence a um administrador do sistema.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Insere um registro de auditoria no banco.
 * Falha silenciosamente para não interromper o fluxo principal.
 */
export async function insertAuditLog(entry: Omit<InsertAuditLog, "id" | "createdAt">): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(auditLogs).values({
      userId: entry.userId ?? null,
      userEmail: entry.userEmail ?? null,
      userName: entry.userName ?? null,
      action: entry.action,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      details: entry.details ?? null,
    });
  } catch (err) {
    console.error("[AuditLog] Failed to insert log:", err);
  }
}

/**
 * Lista logs de auditoria com paginação e filtros.
 * Somente para administradores.
 */
export async function getAuditLogs(opts: {
  action?: string;
  userEmail?: string;
  entityType?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { rows: [], total: 0 };

  const conditions = [];
  if (opts.action) conditions.push(eq(auditLogs.action, opts.action));
  if (opts.userEmail) conditions.push(like(auditLogs.userEmail, `%${opts.userEmail}%`));
  if (opts.entityType) conditions.push(eq(auditLogs.entityType, opts.entityType));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  const rows = await db
    .select()
    .from(auditLogs)
    .where(where)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(where);

  return { rows, total: Number(countResult[0]?.count ?? 0) };
}

// ─── Sellers & Assistants ─────────────────────────────────────────────────────

/** Lista todos os vendedores ativos */
export async function listSellers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sellers).where(eq(sellers.active, true)).orderBy(asc(sellers.name));
}

/** Lista todos os assistentes ativos */
export async function listAssistants() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(assistants).where(eq(assistants.active, true)).orderBy(asc(assistants.name));
}
