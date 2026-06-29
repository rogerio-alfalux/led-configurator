import { drizzle } from "drizzle-orm/mysql2";
import { eq, like, or, desc, and, sql, asc } from "drizzle-orm";
import {
  InsertUser, users, cartItems, InsertCartItem, sellers, assistants,
  quotes, quoteVersions, quoteItems, InsertQuote, InsertQuoteVersion, InsertQuoteItem,
  auditLogs, InsertAuditLog,
  factoryOrders, factoryOrderItems, InsertFactoryOrder, InsertFactoryOrderItem,
  salesGoals, InsertSalesGoal
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
  return db.select().from(cartItems).where(eq(cartItems.userId, userId)).orderBy(cartItems.sortOrder, cartItems.id);
}
export async function updateCartItemsSortOrder(userId: number, orderedIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Atualizar sortOrder de cada item em paralelo
  await Promise.all(orderedIds.map((id, idx) =>
    db.update(cartItems).set({ sortOrder: idx }).where(eq(cartItems.id, id))
  ));
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
  const oldQty: number = data.qty ?? 1;
  data.qty = qty;

  // Recalcular driverLines com a nova quantidade
  if (data.driverLines && Array.isArray(data.driverLines) && data.driverLines.length > 0) {
    // Cada driverLine tem driverUnitPrice e driverQty original (para 1 unidade = drvQtyPerUnit)
    // drvQtyPerUnit = driverQty / oldQty
    data.driverLines = data.driverLines.map((dl: any) => {
      const drvQtyPerUnit = oldQty > 0 ? (dl.driverQty ?? 1) / oldQty : (dl.driverQty ?? 1);
      const newDrvQty = Math.round(drvQtyPerUnit * qty);
      const newDrvTotal = Math.round((dl.driverUnitPrice ?? 0) * newDrvQty * 100) / 100;
      return { ...dl, driverQty: newDrvQty, driverTotalPrice: newDrvTotal };
    });
    // Recalcular priceWithoutDriver (unitPriceLuminaria × qty)
    if (data.unitPriceLuminaria != null) {
      data.priceWithoutDriver = Math.round((data.unitPriceLuminaria ?? 0) * qty * 100) / 100;
    }
    // totalPrice = priceWithoutDriver + soma dos driverTotalPrice
    const drvSum = data.driverLines.reduce((s: number, dl: any) => s + (dl.driverTotalPrice ?? 0), 0);
    const lumTotal = data.priceWithoutDriver ?? Math.round((data.unitPriceLuminaria ?? 0) * qty * 100) / 100;
    data.totalPrice = Math.round((lumTotal + drvSum) * 100) / 100;
  } else {
    data.totalPrice = Math.round((data.unitPrice ?? 0) * qty * 100) / 100;
  }

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
  /** Prazo de entrega em dias úteis (padrão: 20) */
  deliveryDays?: number;
  /** Percentual de comissão do vendedor (0-1) */
  commissionPercent?: number;
  /** Condição de pagamento */
  paymentTerm?: string;
  /** Estado destino para DIFAL */
  destState?: string;
  /** Se DIFAL está habilitado */
  difalEnabled?: boolean;
  /** Alíquota DIFAL (%) */
  difalPercent?: number;
  /** Alíquota FCP (%) */
  fcpPercent?: number;
  /** Se FCP está habilitado */
  fcpEnabled?: boolean;
  /** Valor DIFAL calculado */
  difalValue?: number;
  /** Valor FCP calculado */
  fcpValue?: number;
  /** Número interno do projeto (ex: "2025-0042") */
  projectNumber?: string;
  /** Valor do frete cotado em R$ */
  freteValue?: number;
  /** Estado de destino do frete */
  freteState?: string;
  /** Se true, o frete é diluído nos produtos */
  freteIncluded?: boolean;
  /** Comissão do vendedor 2 (0-1) */
  commissionPercent2?: number;
  /** Nome do arquiteto responsável pelo projeto */
  arquiteto?: string;
  /** Nome do light designer responsável pelo projeto */
  lightDesigner?: string;
}

/** Cria um novo orçamento com versão 1 */
export async function createQuote(input: SaveQuoteInput): Promise<{ quoteId: number; quoteNumber: string; versionId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Se o usuário forneceu um número de orçamento, usar esse número.
  // Caso contrário, gerar automaticamente com base no código do vendedor.
  let quoteNumber: string;
  if (input.quoteNumber?.trim()) {
    quoteNumber = input.quoteNumber.trim();
  } else {
    // Busca o sellerCode do seller1Id para gerar o número no formato correto.
    let sellerCodeForNumber: string | null = null;
    if (input.seller1Id) {
      const sellerRows = await db.select({ code: sellers.code }).from(sellers).where(eq(sellers.id, input.seller1Id)).limit(1);
      sellerCodeForNumber = sellerRows[0]?.code ?? null;
    }
    quoteNumber = await generateQuoteNumber(sellerCodeForNumber);
  }
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
    deliveryDays: input.deliveryDays ?? 20,
    commissionPercent: input.commissionPercent != null ? String(input.commissionPercent) : '0.05',
    paymentTerm: input.paymentTerm ?? '30% Sinal e 70% a 28DDF (mediante aprovação de cadastro)',
    destState: input.destState ?? null,
    difalEnabled: input.difalEnabled ?? false,
    difalPercent: input.difalPercent != null ? String(input.difalPercent) : '0',
    fcpPercent: input.fcpPercent != null ? String(input.fcpPercent) : '0',
    fcpEnabled: input.fcpEnabled ?? false,
    difalValue: input.difalValue != null ? String(input.difalValue) : '0',
    fcpValue: input.fcpValue != null ? String(input.fcpValue) : '0',
    projectNumber: input.projectNumber ?? null,
    freteValue: input.freteValue != null ? String(input.freteValue) : '0',
    freteState: input.freteState ?? null,
    freteIncluded: input.freteIncluded ?? false,
    commissionPercent2: input.commissionPercent2 != null ? String(input.commissionPercent2) : '0',
    arquiteto: input.arquiteto ?? null,
    lightDesigner: input.lightDesigner ?? null,
  });
  const quoteId = (qResult as unknown as { insertId: number }[])[0]?.insertId ?? 0;

  // Insert version 0
  const vResult = await db.insert(quoteVersions).values({
    quoteId,
    version: 0,
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
  input: SaveQuoteInput,
  bumpVersion = true
): Promise<{ versionId: number; version: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current version
  const qRows = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  if (!qRows.length) throw new Error("Quote not found");
  const quote = qRows[0];
  // Se bumpVersion=false, mantém a versão atual (atualiza in-place)
  const newVersion = bumpVersion ? quote.currentVersion + 1 : quote.currentVersion;

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

  // Quando bumpVersion=false (ex: appendItems), apenas atualiza totalAmount e updatedAt
  // para não sobrescrever campos de cabeçalho (frete, DIFAL, FCP, projectNumber, etc.)
  if (!bumpVersion) {
    await db.update(quotes).set({
      currentVersion: newVersion,
      totalAmount: String(input.totalAmount),
      totalFinal: input.totalFinal != null ? String(input.totalFinal) : String(input.totalAmount),
      updatedAt: sql`NOW()`,
    }).where(eq(quotes.id, quoteId));
  } else {
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
    seller1Id: input.seller1Id ?? null,
    seller1Name: input.seller1Name ?? null,
    seller2Id: input.seller2Id ?? null,
    seller2Name: input.seller2Name ?? null,
    assistantId: input.assistantId ?? null,
    notes: input.notes ?? null,
    currentVersion: newVersion,
    totalAmount: String(input.totalAmount),
    totalFinal: input.totalFinal != null ? String(input.totalFinal) : String(input.totalAmount),
    rtPercent: input.rtPercent != null ? String(input.rtPercent) : '0',
    // Não incrementa revisionCount quando atualiza in-place
    rtDest1: input.rtDest1 ?? null,
    rtDest1Active: input.rtDest1Active ?? false,
    rtDest2: input.rtDest2 ?? null,
    rtDest2Active: input.rtDest2Active ?? false,
    rtDest3: input.rtDest3 ?? null,
    rtDest3Active: input.rtDest3Active ?? false,
    marginPercent: input.marginPercent != null ? String(input.marginPercent) : '0',
    freteType: input.freteType ?? null,
    freteIsento: input.freteIsento ?? false,
    freteLocalidade: input.freteLocalidade ?? null,
    revisionCount: bumpVersion ? sql`revisionCount + 1` : sql`revisionCount`,
    deliveryDays: input.deliveryDays ?? 20,
    commissionPercent: input.commissionPercent != null ? String(input.commissionPercent) : '0.05',
    paymentTerm: input.paymentTerm ?? '30% Sinal e 70% a 28DDF (mediante aprovação de cadastro)',
    destState: input.destState ?? null,
    difalEnabled: input.difalEnabled ?? false,
    difalPercent: input.difalPercent != null ? String(input.difalPercent) : '0',
    fcpPercent: input.fcpPercent != null ? String(input.fcpPercent) : '0',
    fcpEnabled: input.fcpEnabled ?? false,
    difalValue: input.difalValue != null ? String(input.difalValue) : '0',
    fcpValue: input.fcpValue != null ? String(input.fcpValue) : '0',
    projectNumber: input.projectNumber ?? null,
    freteValue: input.freteValue != null ? String(input.freteValue) : '0',
    freteState: input.freteState ?? null,
    freteIncluded: input.freteIncluded ?? false,
    commissionPercent2: input.commissionPercent2 != null ? String(input.commissionPercent2) : '0',
    arquiteto: input.arquiteto ?? null,
    lightDesigner: input.lightDesigner ?? null,
    // Atualiza o número do orçamento se fornecido
    ...(input.quoteNumber ? { quoteNumber: input.quoteNumber } : {}),
    // Atualiza a data de modificação para a data atual
    updatedAt: sql`NOW()`,
  }).where(eq(quotes.id, quoteId));
  } // fim do else (bumpVersion=true)

  if (!bumpVersion) {
    // Atualiza in-place: busca a versão atual e substitui seus itens
    const vRows = await db.select().from(quoteVersions)
      .where(eq(quoteVersions.quoteId, quoteId))
      .orderBy(desc(quoteVersions.version))
      .limit(1);
    const currentVId = vRows[0]?.id;
    if (currentVId) {
      // Atualiza header da versão
      await db.update(quoteVersions).set({
        headerSnapshot,
        totalAmount: String(input.totalAmount),
        totalFinal: input.totalFinal != null ? String(input.totalFinal) : String(input.totalAmount),
        versionNotes: input.versionNotes ?? vRows[0].versionNotes ?? null,
      }).where(eq(quoteVersions.id, currentVId));
      // Substitui itens
      if (input.items.length > 0) {
        await db.delete(quoteItems).where(eq(quoteItems.quoteVersionId, currentVId));
        await db.insert(quoteItems).values(
          input.items.map((it) => ({
            quoteVersionId: currentVId,
            quoteId,
            itemNumber: it.itemNumber,
            itemData: it.itemData,
          }))
        );
      }
      return { versionId: currentVId, version: newVersion };
    }
  }

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
  status?: "open" | "approved" | "lost" | "cancelled" | "invoiced";
  seller1Name?: string;
  assistantName?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { rows: [], total: 0 };

  const conditions = [];
  if (opts.status) conditions.push(eq(quotes.status, opts.status));
  if (opts.seller1Name) conditions.push(like(quotes.seller1Name, `%${opts.seller1Name}%`));
  if (opts.assistantName) conditions.push(like(quotes.assistantName, `%${opts.assistantName}%`));
  if (opts.dateFrom) conditions.push(sql`DATE(createdAt) >= ${opts.dateFrom}`);
  if (opts.dateTo) conditions.push(sql`DATE(createdAt) <= ${opts.dateTo}`);
  if (opts.search) {
    // Busca case-insensitive: banco usa utf8mb4_bin (case-sensitive), por isso usamos LOWER()
    const sLower = `%${opts.search.toLowerCase()}%`;
    conditions.push(
      or(
        sql`LOWER(${quotes.quoteNumber}) LIKE ${sLower}`,
        sql`LOWER(${quotes.clientName}) LIKE ${sLower}`,
        sql`LOWER(COALESCE(${quotes.vendorName}, '')) LIKE ${sLower}`,
        sql`LOWER(TRIM(COALESCE(${quotes.projectName}, ''))) LIKE ${sLower}`,
        sql`LOWER(COALESCE(${quotes.seller1Name}, '')) LIKE ${sLower}`,
        sql`LOWER(COALESCE(${quotes.seller2Name}, '')) LIKE ${sLower}`,
        sql`LOWER(COALESCE(${quotes.assistantName}, '')) LIKE ${sLower}`
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
export async function updateQuoteStatus(
  id: number,
  status: "open" | "approved" | "lost" | "cancelled" | "invoiced",
  opts?: { orderNumber?: string; billingCompany?: "alfalux" | "primelux" | "decada" | "primelase" | "luminew" }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = { status };
  if (status === "approved") {
    updateData.approvedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    if (opts?.orderNumber) updateData.orderNumber = opts.orderNumber;
    if (opts?.billingCompany) updateData.billingCompany = opts.billingCompany;
  }
  if (status === "invoiced") updateData.invoicedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
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
      invoiced: sql<number>`sum(case when status = 'invoiced' then 1 else 0 end)`,
      invoicedValue: sql<number>`sum(case when status = 'invoiced' then (case when cast(totalFinal as decimal(14,2)) > 0 then cast(totalFinal as decimal(14,2)) else cast(totalAmount as decimal(12,2)) end) else 0 end)`,
        totalAmount: sql<number>`sum(case when cast(totalFinal as decimal(14,2)) > 0 then cast(totalFinal as decimal(14,2)) else cast(totalAmount as decimal(12,2)) end)`,
      approvedAmount: sql<number>`sum(case when status = 'approved' then (case when cast(totalFinal as decimal(14,2)) > 0 then cast(totalFinal as decimal(14,2)) else cast(totalAmount as decimal(12,2)) end) else 0 end)`,
    })
    .from(quotes);
  // Top vendedores
  const topVendors = await db
    .select({
      name: quotes.vendorName,
      count: sql<number>`count(*)`,
      amount: sql<number>`sum(case when cast(totalFinal as decimal(14,2)) > 0 then cast(totalFinal as decimal(14,2)) else cast(totalAmount as decimal(12,2)) end)`,
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
      amount: sql<number>`sum(case when cast(totalFinal as decimal(14,2)) > 0 then cast(totalFinal as decimal(14,2)) else cast(totalAmount as decimal(12,2)) end)`,
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

// ─── Factory Orders ───────────────────────────────────────────────────────────

/** Cria um novo pedido de fábrica (revisão 1) com seus itens */
export async function createFactoryOrder(data: {
  quoteId: number;
  empresa: 'ALFALUX' | 'LUMINEW';
  deliveryDays?: number;
  notes?: string;
  createdByUserId?: number;
  items: { itemNumber: number; itemData: string }[];
}) {
  const db = await getDb();
  if (!db) throw new Error('DB não disponível');
  const [result] = await db.insert(factoryOrders).values({
    quoteId: data.quoteId,
    revision: 1,
    empresa: data.empresa,
    status: 'draft',
    deliveryDays: data.deliveryDays ?? 19,
    notes: data.notes ?? null,
    createdByUserId: data.createdByUserId ?? null,
  });
  const orderId = (result as any).insertId as number;
  if (data.items.length > 0) {
    await db.insert(factoryOrderItems).values(
      data.items.map(i => ({ factoryOrderId: orderId, itemNumber: i.itemNumber, itemData: i.itemData }))
    );
  }
  return orderId;
}

/** Lista todos os pedidos de fábrica de um orçamento (ordenados por revisão desc) */
export async function getFactoryOrdersByQuoteId(quoteId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(factoryOrders)
    .where(eq(factoryOrders.quoteId, quoteId))
    .orderBy(desc(factoryOrders.revision));
}

/** Retorna um pedido de fábrica com seus itens */
export async function getFactoryOrderById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [order] = await db.select().from(factoryOrders).where(eq(factoryOrders.id, id));
  if (!order) return null;
  const items = await db.select().from(factoryOrderItems)
    .where(eq(factoryOrderItems.factoryOrderId, id))
    .orderBy(asc(factoryOrderItems.itemNumber));
  return { ...order, items };
}

/** Atualiza campos do pedido de fábrica (empresa, status, deliveryDays, notes) */
export async function updateFactoryOrder(id: number, data: Partial<{
  orderNumber: string;
  empresa: 'ALFALUX' | 'LUMINEW';
  status: 'draft' | 'sent' | 'in_production' | 'completed';
  deliveryDays: number;
  notes: string;
  approvedAt: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error('DB não disponível');
  await db.update(factoryOrders).set(data).where(eq(factoryOrders.id, id));
}

/** Adiciona um item ao pedido de fábrica */
export async function addFactoryOrderItem(factoryOrderId: number, itemNumber: number, itemData: string) {
  const db = await getDb();
  if (!db) throw new Error('DB não disponível');
  const [result] = await db.insert(factoryOrderItems).values({ factoryOrderId, itemNumber, itemData });
  return (result as any).insertId as number;
}

/** Atualiza o itemData de um item do pedido de fábrica */
export async function updateFactoryOrderItem(itemId: number, itemData: string) {
  const db = await getDb();
  if (!db) throw new Error('DB não disponível');
  await db.update(factoryOrderItems).set({ itemData }).where(eq(factoryOrderItems.id, itemId));
}

/** Remove um item do pedido de fábrica */
export async function deleteFactoryOrderItem(itemId: number) {
  const db = await getDb();
  if (!db) throw new Error('DB não disponível');
  await db.delete(factoryOrderItems).where(eq(factoryOrderItems.id, itemId));
}

/** Cria uma nova revisão clonando o pedido atual */
export async function createFactoryOrderRevision(sourceOrderId: number) {
  const db = await getDb();
  if (!db) throw new Error('DB não disponível');
  const source = await getFactoryOrderById(sourceOrderId);
  if (!source) throw new Error('Pedido não encontrado');
  const [result] = await db.insert(factoryOrders).values({
    quoteId: source.quoteId,
    revision: source.revision + 1,
    empresa: source.empresa,
    status: 'draft',
    deliveryDays: source.deliveryDays,
    notes: source.notes ?? null,
    createdByUserId: source.createdByUserId ?? null,
  });
  const newOrderId = (result as any).insertId as number;
  if (source.items.length > 0) {
    await db.insert(factoryOrderItems).values(
      source.items.map(i => ({ factoryOrderId: newOrderId, itemNumber: i.itemNumber, itemData: i.itemData }))
    );
  }
  return newOrderId;
}

// ─── Metas de Faturamento ─────────────────────────────────────────────────────
/** Retorna todas as metas de um ano */
export async function getSalesGoalsByYear(year: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(salesGoals).where(eq(salesGoals.year, year)).orderBy(asc(salesGoals.month));
}

/** Upsert de meta: cria ou atualiza meta anual (month=null) ou mensal */
export async function upsertSalesGoal(data: { year: number; month: number | null; goalAmount: string; setByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error('DB não disponível');
  // Verificar se já existe
  const existing = await db.select({ id: salesGoals.id })
    .from(salesGoals)
    .where(
      data.month == null
        ? and(eq(salesGoals.year, data.year), sql`month IS NULL`)
        : and(eq(salesGoals.year, data.year), eq(salesGoals.month, data.month))
    )
    .limit(1);
  if (existing.length > 0) {
    await db.update(salesGoals)
      .set({ goalAmount: data.goalAmount, setByUserId: data.setByUserId })
      .where(eq(salesGoals.id, existing[0].id));
    return existing[0].id;
  } else {
    const [result] = await db.insert(salesGoals).values({
      year: data.year,
      month: data.month,
      goalAmount: data.goalAmount,
      setByUserId: data.setByUserId,
    });
    return (result as any).insertId as number;
  }
}

// ─── Dashboard Gerencial ──────────────────────────────────────────────────────
/**
 * Retorna dados completos do dashboard para admins/gerentes.
 * Inclui: comissões por vendedor, ranking RT, metas e progresso.
 */
export async function getManagerDashboard(year: number, month?: number, dateFrom?: string, dateTo?: string) {
  const db = await getDb();
  if (!db) return null;

  // ── Totais gerais do período ──────────────────────────────────────────────────────────────────────────
  const periodCondition = (dateFrom && dateTo)
    ? sql`approvedAt >= ${dateFrom} AND approvedAt <= ${dateTo + ' 23:59:59'} AND status = 'approved'`
    : month
      ? sql`YEAR(approvedAt) = ${year} AND MONTH(approvedAt) = ${month} AND status = 'approved'`
      : sql`YEAR(approvedAt) = ${year} AND status = 'approved'`;

  const [periodTotals] = await db.select({
    approvedCount: sql<number>`count(*)`,
    approvedAmount: sql<number>`sum(cast(totalFinal as decimal(14,2)))`,
  }).from(quotes).where(periodCondition);

  // ── Comissões por vendedor (seller1) ──────────────────────────────────────
  const commissionBySeller = await db.select({
    sellerName: quotes.seller1Name,
    count: sql<number>`count(*)`,
    totalAmount: sql<number>`sum(cast(totalFinal as decimal(14,2)))`,
    totalCommission: sql<number>`sum(cast(totalFinal as decimal(14,2)) * cast(commissionPercent as decimal(5,4)))`,
  })
    .from(quotes)
    .where(and(periodCondition, sql`seller1Name IS NOT NULL`))
    .groupBy(quotes.seller1Name)
    .orderBy(desc(sql`sum(cast(totalFinal as decimal(14,2)) * cast(commissionPercent as decimal(5,4)))`));

  // ── RT: quem mais recebe RT ───────────────────────────────────────────────
  // rtDest1/2/3 são strings com o nome do destinatário
  const rtByDest1 = await db.select({
    dest: quotes.rtDest1,
    count: sql<number>`count(*)`,
    totalRt: sql<number>`sum(cast(totalFinal as decimal(14,2)) * cast(rtPercent as decimal(5,4)))`,
  })
    .from(quotes)
    .where(and(periodCondition, sql`rtDest1 IS NOT NULL AND rtDest1 != '' AND rtDest1Active = 1 AND cast(rtPercent as decimal(5,4)) > 0`))
    .groupBy(quotes.rtDest1)
    .orderBy(desc(sql`sum(cast(totalFinal as decimal(14,2)) * cast(rtPercent as decimal(5,4)))`));

  const rtByDest2 = await db.select({
    dest: quotes.rtDest2,
    count: sql<number>`count(*)`,
    totalRt: sql<number>`sum(cast(totalFinal as decimal(14,2)) * cast(rtPercent as decimal(5,4)))`,
  })
    .from(quotes)
    .where(and(periodCondition, sql`rtDest2 IS NOT NULL AND rtDest2 != '' AND rtDest2Active = 1 AND cast(rtPercent as decimal(5,4)) > 0`))
    .groupBy(quotes.rtDest2)
    .orderBy(desc(sql`sum(cast(totalFinal as decimal(14,2)) * cast(rtPercent as decimal(5,4)))`));

  const rtByDest3 = await db.select({
    dest: quotes.rtDest3,
    count: sql<number>`count(*)`,
    totalRt: sql<number>`sum(cast(totalFinal as decimal(14,2)) * cast(rtPercent as decimal(5,4)))`,
  })
    .from(quotes)
    .where(and(periodCondition, sql`rtDest3 IS NOT NULL AND rtDest3 != '' AND rtDest3Active = 1 AND cast(rtPercent as decimal(5,4)) > 0`))
    .groupBy(quotes.rtDest3)
    .orderBy(desc(sql`sum(cast(totalFinal as decimal(14,2)) * cast(rtPercent as decimal(5,4)))`));

  // Consolidar RT por destinatário
  const rtMap = new Map<string, { count: number; totalRt: number }>();
  for (const row of [...rtByDest1, ...rtByDest2, ...rtByDest3]) {
    if (!row.dest) continue;
    const existing = rtMap.get(row.dest) ?? { count: 0, totalRt: 0 };
    rtMap.set(row.dest, {
      count: existing.count + Number(row.count),
      totalRt: existing.totalRt + Number(row.totalRt),
    });
  }
  const rtRanking = Array.from(rtMap.entries())
    .map(([dest, v]) => ({ dest, count: v.count, totalRt: v.totalRt }))
    .sort((a, b) => b.totalRt - a.totalRt);

  // ── Ranking de vendas (por valor aprovado) ────────────────────────────────
  const salesRanking = await db.select({
    sellerName: quotes.seller1Name,
    count: sql<number>`count(*)`,
    totalAmount: sql<number>`sum(cast(totalFinal as decimal(14,2)))`,
  })
    .from(quotes)
    .where(and(periodCondition, sql`seller1Name IS NOT NULL`))
    .groupBy(quotes.seller1Name)
    .orderBy(desc(sql`sum(cast(totalFinal as decimal(14,2)))`));

  // ── Lucro bruto estimado e margem média (aprovados no período) ─────────────
  const [profitMetrics] = await db.select({
    totalAmount: sql<number>`sum(cast(totalAmount as decimal(14,2)))`,
    totalFinal: sql<number>`sum(cast(totalFinal as decimal(14,2)))`,
    lucroEstimado: sql<number>`sum(cast(totalAmount as decimal(14,2)) * cast(marginPercent as decimal(5,4)))`,
    margemMedia: sql<number>`avg(cast(marginPercent as decimal(5,4)))`,
    totalCount: sql<number>`count(*)`,
  }).from(quotes).where(periodCondition);

  // ── Taxa de conversão (total criado no período vs aprovados) ─────────────────
  const createdCondition = (dateFrom && dateTo)
    ? sql`createdAt >= ${dateFrom} AND createdAt <= ${dateTo + ' 23:59:59'}`
    : month
      ? sql`YEAR(createdAt) = ${year} AND MONTH(createdAt) = ${month}`
      : sql`YEAR(createdAt) = ${year}`;

  const [conversionMetrics] = await db.select({
    totalCreated: sql<number>`count(*)`,
    totalApproved: sql<number>`sum(case when status = 'approved' then 1 else 0 end)`,
    totalLost: sql<number>`sum(case when status = 'lost' then 1 else 0 end)`,
    totalOpen: sql<number>`sum(case when status = 'open' then 1 else 0 end)`,
    totalCancelled: sql<number>`sum(case when status = 'cancelled' then 1 else 0 end)`,
    ticketMedioAprovado: sql<number>`avg(case when status = 'approved' then cast(totalFinal as decimal(14,2)) else null end)`,
  }).from(quotes).where(createdCondition);

  // ── Famílias mais orçadas (por itens aprovados no período) ────────────────────
  // Extrai category do JSON itemData de cada item vinculado a orçamentos aprovados
  const familyRanking = await db.execute(sql`
    SELECT
      JSON_UNQUOTE(JSON_EXTRACT(qi.itemData, '$.category')) AS categoria,
      COUNT(*) AS qtdItens,
      SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(qi.itemData, '$.qty')) AS DECIMAL(10,0))) AS qtdUnidades,
      SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(qi.itemData, '$.totalPrice')) AS DECIMAL(14,2))) AS valorTotal
    FROM quote_items qi
    INNER JOIN quotes q ON q.id = qi.quoteId
    WHERE q.status = 'approved'
      AND ${
        (dateFrom && dateTo)
          ? sql`q.approvedAt >= ${dateFrom} AND q.approvedAt <= ${dateTo + ' 23:59:59'}`
          : month
            ? sql`YEAR(q.approvedAt) = ${year} AND MONTH(q.approvedAt) = ${month}`
            : sql`YEAR(q.approvedAt) = ${year}`
      }
      AND JSON_UNQUOTE(JSON_EXTRACT(qi.itemData, '$.category')) IS NOT NULL
      AND JSON_UNQUOTE(JSON_EXTRACT(qi.itemData, '$.totalPrice')) IS NOT NULL
    GROUP BY JSON_UNQUOTE(JSON_EXTRACT(qi.itemData, '$.category'))
    ORDER BY valorTotal DESC
    LIMIT 10
  `);

  // ── Progresso mensal (todos os meses do ano) ──────────────────────────────
  const monthlyProgress = await db.select({
    month: sql<number>`MONTH(approvedAt)`,
    count: sql<number>`count(*)`,
    amount: sql<number>`sum(cast(totalFinal as decimal(14,2)))`,
  })
    .from(quotes)
    .where(sql`YEAR(approvedAt) = ${year} AND status = 'approved'`)
    .groupBy(sql`MONTH(approvedAt)`)
    .orderBy(sql`MONTH(approvedAt)`);

  // ── Faturamento (invoiced) ────────────────────────────────────────────────
  const invoicedCondition = (dateFrom && dateTo)
    ? sql`invoicedAt >= ${dateFrom} AND invoicedAt <= ${dateTo + ' 23:59:59'} AND status = 'invoiced'`
    : month
      ? sql`YEAR(invoicedAt) = ${year} AND MONTH(invoicedAt) = ${month} AND status = 'invoiced'`
      : sql`YEAR(invoicedAt) = ${year} AND status = 'invoiced'`;

  const [invoicedTotals] = await db.select({
    invoicedCount: sql<number>`count(*)`,
    invoicedAmount: sql<number>`sum(cast(totalFinal as decimal(14,2)))`,
  }).from(quotes).where(invoicedCondition);

  // Progresso mensal de faturamento
  const monthlyInvoiced = await db.select({
    month: sql<number>`MONTH(invoicedAt)`,
    count: sql<number>`count(*)`,
    amount: sql<number>`sum(cast(totalFinal as decimal(14,2)))`,
  })
    .from(quotes)
    .where(sql`YEAR(invoicedAt) = ${year} AND status = 'invoiced'`)
    .groupBy(sql`MONTH(invoicedAt)`)
    .orderBy(sql`MONTH(invoicedAt)`);

  // Faturamento por vendedor
  const invoicedBySeller = await db.select({
    sellerName: quotes.seller1Name,
    count: sql<number>`count(*)`,
    totalAmount: sql<number>`sum(cast(totalFinal as decimal(14,2)))`,
  })
    .from(quotes)
    .where(and(invoicedCondition, sql`seller1Name IS NOT NULL`))
    .groupBy(quotes.seller1Name)
    .orderBy(desc(sql`sum(cast(totalFinal as decimal(14,2)))`));

  // ── Metas ─────────────────────────────────────────────────────────────────
  const goals = await getSalesGoalsByYear(year);

  return {
    periodTotals,
    commissionBySeller,
    rtRanking,
    salesRanking,
    monthlyProgress,
    goals,
    profitMetrics,
    conversionMetrics,
    invoicedTotals,
    monthlyInvoiced,
    invoicedBySeller,
    familyRanking: (familyRanking as any[])[0] as Array<{
      categoria: string;
      qtdItens: number;
      qtdUnidades: number;
      valorTotal: number;
    }>,
  };
}

/**
 * Retorna dados do dashboard para um vendedor específico (apenas seus orçamentos).
 * Filtra por email do vendedor na tabela sellers.
 */
export async function getSellerDashboard(sellerEmail: string, year: number, month?: number, dateFrom?: string, dateTo?: string) {
  const db = await getDb();
  if (!db) return null;

  // Buscar o seller pelo email
  const [seller] = await db.select({ id: sellers.id, name: sellers.name })
    .from(sellers)
    .where(eq(sellers.email, sellerEmail))
    .limit(1);

  if (!seller) return null;

  const sellerFilter = sql`(seller1Id = ${seller.id} OR seller2Id = ${seller.id})`;
  const periodCondition = (dateFrom && dateTo)
    ? and(
        sql`approvedAt >= ${dateFrom} AND approvedAt <= ${dateTo + ' 23:59:59'} AND status = 'approved'`,
        sellerFilter
      )
    : month
      ? and(
          sql`YEAR(approvedAt) = ${year} AND MONTH(approvedAt) = ${month} AND status = 'approved'`,
          sellerFilter
        )
      : and(
          sql`YEAR(approvedAt) = ${year} AND status = 'approved'`,
          sellerFilter
        );

  const [totals] = await db.select({
    approvedCount: sql<number>`count(*)`,
    approvedAmount: sql<number>`sum(cast(totalFinal as decimal(14,2)))`,
    totalCommission: sql<number>`sum(cast(totalFinal as decimal(14,2)) * cast(commissionPercent as decimal(5,4)))`,
  }).from(quotes).where(periodCondition);

  // Progresso mensal do vendedor
  const monthlyProgress = await db.select({
    month: sql<number>`MONTH(approvedAt)`,
    count: sql<number>`count(*)`,
    amount: sql<number>`sum(cast(totalFinal as decimal(14,2)))`,
    commission: sql<number>`sum(cast(totalFinal as decimal(14,2)) * cast(commissionPercent as decimal(5,4)))`,
  })
    .from(quotes)
    .where(
      and(
        sql`YEAR(approvedAt) = ${year} AND status = 'approved'`,
        sql`(seller1Id = ${seller.id} OR seller2Id = ${seller.id})`
      )
    )
    .groupBy(sql`MONTH(approvedAt)`)
    .orderBy(sql`MONTH(approvedAt)`);

  // Metas (visíveis para todos)
  const goals = await getSalesGoalsByYear(year);

  return {
    seller,
    totals,
    monthlyProgress,
    goals,
  };
}

// ─── Relatório Mensal de Vendas ───────────────────────────────────────────────
/**
 * Retorna todos os orçamentos aprovados de um mês/ano com dados de comissão e RT.
 * Usado para gerar o relatório mensal de vendas.
 */
export async function getMonthlyReport(year: number, month: number) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db.select({
    id: quotes.id,
    quoteNumber: quotes.quoteNumber,
    clientName: quotes.clientName,
    projectName: quotes.projectName,
    seller1Name: quotes.seller1Name,
    seller2Name: quotes.seller2Name,
    assistantName: quotes.assistantName,
    totalFinal: quotes.totalFinal,
    commissionPercent: quotes.commissionPercent,
    rtPercent: quotes.rtPercent,
    rtDest1: quotes.rtDest1,
    rtDest1Active: quotes.rtDest1Active,
    rtDest2: quotes.rtDest2,
    rtDest2Active: quotes.rtDest2Active,
    rtDest3: quotes.rtDest3,
    rtDest3Active: quotes.rtDest3Active,
    approvedAt: sql<string>`approvedAt`,
  })
    .from(quotes)
    .where(sql`YEAR(approvedAt) = ${year} AND MONTH(approvedAt) = ${month} AND status = 'approved'`)
    .orderBy(sql`approvedAt`);

  return rows.map(r => ({
    ...r,
    totalFinal: Number(r.totalFinal ?? 0),
    commissionPercent: Number(r.commissionPercent ?? 0),
    rtPercent: Number(r.rtPercent ?? 0),
    commission: Number(r.totalFinal ?? 0) * Number(r.commissionPercent ?? 0),
    rtValue: Number(r.totalFinal ?? 0) * Number(r.rtPercent ?? 0),
  }));
}

/** Duplica um orçamento existente, criando um novo com número próprio e versão 1 */
export async function duplicateQuote(
  sourceQuoteId: number,
  createdByUserId: number,
  newClientName?: string,
  overrideQuoteNumber?: string
): Promise<{ quoteId: number; quoteNumber: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar orçamento original
  const source = await getQuoteById(sourceQuoteId);
  if (!source) throw new Error("Orçamento não encontrado");

  // Buscar itens da versão mais recente
  const vRows = await db.select().from(quoteVersions)
    .where(eq(quoteVersions.quoteId, sourceQuoteId))
    .orderBy(desc(quoteVersions.version))
    .limit(1);
  const currentVersionId = vRows[0]?.id ?? 0;
  const itemRows = await db.select().from(quoteItems)
    .where(and(eq(quoteItems.quoteId, sourceQuoteId), eq(quoteItems.quoteVersionId, currentVersionId)));

  // Usar número fornecido pelo usuário ou gerar automaticamente
  let finalQuoteNumber: string;
  if (overrideQuoteNumber) {
    finalQuoteNumber = overrideQuoteNumber;
  } else {
    let sellerCodeForDup: string | null = null;
    if (source.quote.seller1Id) {
      const sellerRows = await db.select({ code: sellers.code }).from(sellers).where(eq(sellers.id, source.quote.seller1Id)).limit(1);
      sellerCodeForDup = sellerRows[0]?.code ?? null;
    }
    finalQuoteNumber = await generateQuoteNumber(sellerCodeForDup);
  }
  const q = source.quote;

  const qResult = await db.insert(quotes).values({
    quoteNumber: finalQuoteNumber,
    clientName: newClientName ?? q.clientName,
    clientContact: q.clientContact,
    clientPhone: q.clientPhone,
    clientEmail: q.clientEmail,
    projectName: q.projectName,
    projectRef: q.projectRef,
    vendorName: q.vendorName,
    assistantName: q.assistantName,
    seller1Id: q.seller1Id,
    seller1Name: q.seller1Name,
    seller2Id: q.seller2Id,
    seller2Name: q.seller2Name,
    assistantId: q.assistantId,
    rtPercent: q.rtPercent,
    rtDest1: q.rtDest1,
    rtDest1Active: q.rtDest1Active,
    rtDest2: q.rtDest2,
    rtDest2Active: q.rtDest2Active,
    rtDest3: q.rtDest3,
    rtDest3Active: q.rtDest3Active,
    marginPercent: q.marginPercent,
    freteType: q.freteType as "free" | "paid" | "night" | "consult" | null,
    freteIsento: q.freteIsento,
    freteLocalidade: q.freteLocalidade as "sp" | "other" | null,
    createdByUserId,
    status: "open",
    currentVersion: 0,
    revisionCount: 0,
    totalAmount: q.totalAmount,
    totalFinal: q.totalFinal,
    notes: q.notes,
    deliveryDays: q.deliveryDays,
    commissionPercent: q.commissionPercent,
    commissionPercent2: q.commissionPercent2,
    paymentTerm: q.paymentTerm,
    destState: q.destState,
    difalEnabled: q.difalEnabled,
    difalPercent: q.difalPercent,
    fcpPercent: q.fcpPercent,
    fcpEnabled: q.fcpEnabled,
    difalValue: q.difalValue,
    fcpValue: q.fcpValue,
    projectNumber: q.projectNumber,
    freteValue: q.freteValue,
    freteState: q.freteState,
    freteIncluded: q.freteIncluded,
  });
  const newQuoteId = (qResult as unknown as { insertId: number }[])[0]?.insertId ?? 0;

  // Inserir versão 1
  const headerSnapshot = JSON.stringify({
    clientName: newClientName ?? q.clientName,
    clientContact: q.clientContact,
    projectName: q.projectName,
    projectRef: q.projectRef,
    vendorName: q.vendorName,
    assistantName: q.assistantName,
    notes: q.notes,
  });
  const vResult = await db.insert(quoteVersions).values({
    quoteId: newQuoteId,
    version: 0,
    headerSnapshot,
    totalAmount: q.totalAmount ?? '0',
    totalFinal: q.totalFinal ?? q.totalAmount ?? '0',
    createdByUserId,
    assistantName: q.assistantName,
    vendorName: q.vendorName,
    versionNotes: `Duplicado do orçamento ${q.quoteNumber}`,
  });
  const newVersionId = (vResult as unknown as { insertId: number }[])[0]?.insertId ?? 0;

  // Copiar itens
  if (itemRows.length > 0) {
    await db.insert(quoteItems).values(
      itemRows.map(item => ({
        quoteId: newQuoteId,
        quoteVersionId: newVersionId,
        itemNumber: item.itemNumber,
        itemData: item.itemData,
      }))
    );
  }

  return { quoteId: newQuoteId, quoteNumber: finalQuoteNumber };
}

/**
 * Verifica se já existe um orçamento com o mesmo nome de obra nos últimos 6 meses.
 * Retorna o orçamento mais recente encontrado, ou null se não houver duplicata.
 * A comparação ignora espaços iniciais/finais (TRIM) e é case-insensitive.
 */
export async function checkDuplicateProject(projectName: string, excludeQuoteId?: number): Promise<{ quoteNumber: string; clientName: string; createdAt: string } | null> {
  if (!projectName || !projectName.trim()) return null;
  const db = await getDb();
  if (!db) return null;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const sixMonthsAgoTs = sixMonthsAgo.getTime();

  const conditions = [
    sql`TRIM(LOWER(${quotes.projectName})) = TRIM(LOWER(${projectName}))`,
    sql`${quotes.createdAt} >= ${sixMonthsAgoTs}`,
  ];
  if (excludeQuoteId) {
    conditions.push(sql`${quotes.id} != ${excludeQuoteId}`);
  }

  const rows = await db
    .select({ quoteNumber: quotes.quoteNumber, clientName: quotes.clientName, createdAt: quotes.createdAt })
    .from(quotes)
    .where(and(...conditions))
    .orderBy(desc(quotes.createdAt))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Reordena os itens da versão mais recente de um orçamento sem criar nova revisão.
 * Recebe um array de IDs de quoteItems na nova ordem desejada e atualiza o itemNumber
 * de cada um em sequência (1, 2, 3, ...).
 * Valida que todos os IDs pertencem ao quoteId informado antes de atualizar.
 */
export async function reorderQuoteItems(
  quoteId: number,
  orderedItemIds: number[]
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Busca todos os itens do quoteId para validar pertencimento
  const existingItems = await db
    .select({ id: quoteItems.id })
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, quoteId));

  const existingIds = new Set(existingItems.map(i => i.id));

  // Valida que todos os IDs enviados pertencem a este orçamento
  for (const itemId of orderedItemIds) {
    if (!existingIds.has(itemId)) {
      throw new Error(`Item ${itemId} não pertence ao orçamento ${quoteId}`);
    }
  }

  // Atualiza itemNumber de cada item na nova ordem
  for (let i = 0; i < orderedItemIds.length; i++) {
    await db
      .update(quoteItems)
      .set({ itemNumber: i + 1 })
      .where(eq(quoteItems.id, orderedItemIds[i]));
  }
}

/**
 * Verifica se um número de orçamento já está em uso.
 * Retorna o orçamento existente se encontrado, ou null se disponível.
 * @param quoteNumber - Número a verificar
 * @param excludeQuoteId - ID do orçamento atual (para não conflitar consigo mesmo em edições)
 */
export async function checkDuplicateQuoteNumber(
  quoteNumber: string,
  excludeQuoteId?: number
): Promise<{ id: number; quoteNumber: string; clientName: string; createdAt: string } | null> {
  if (!quoteNumber?.trim()) return null;
  const db = await getDb();
  if (!db) return null;

  const conditions: ReturnType<typeof eq>[] = [
    eq(quotes.quoteNumber, quoteNumber.trim()) as ReturnType<typeof eq>,
  ];
  if (excludeQuoteId) {
    conditions.push(sql`${quotes.id} != ${excludeQuoteId}` as unknown as ReturnType<typeof eq>);
  }

  const rows = await db
    .select({ id: quotes.id, quoteNumber: quotes.quoteNumber, clientName: quotes.clientName, createdAt: quotes.createdAt })
    .from(quotes)
    .where(and(...conditions))
    .limit(1);

  return rows[0] ?? null;
}

/** Retorna os itens de uma revisão específica (quoteVersionId) */
export async function getRevisionItems(versionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(quoteItems)
    .where(eq(quoteItems.quoteVersionId, versionId))
    .orderBy(quoteItems.itemNumber);
}
