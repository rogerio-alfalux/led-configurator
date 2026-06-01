/**
 * API REST v1 — somente leitura, autenticada por API Key.
 *
 * Endpoints:
 *   GET /api/v1/quotes              → lista paginada de orçamentos
 *   GET /api/v1/quotes/:id          → detalhes completos de um orçamento
 *   GET /api/v1/sellers             → lista de vendedores ativos
 */
import { Router } from "express";
import { apiKeyAuth } from "./apiAuth";
import { getDb } from "./db";
import { quotes, quoteVersions, quoteItems, sellers } from "../drizzle/schema";
import { desc, eq, and, like, gte, lte } from "drizzle-orm";

const router = Router();

// Todas as rotas exigem API Key válida
router.use(apiKeyAuth);

// ─── GET /api/v1/quotes ──────────────────────────────────────────────────────
router.get("/quotes", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) { res.status(503).json({ error: "Database unavailable" }); return; }

    const page    = Math.max(1, parseInt(String(req.query.page  ?? "1")));
    const perPage = Math.min(100, Math.max(1, parseInt(String(req.query.per_page ?? "50"))));
    const offset  = (page - 1) * perPage;

    // Filtros opcionais
    const status    = req.query.status    as string | undefined;
    const seller    = req.query.seller    as string | undefined;
    const client    = req.query.client    as string | undefined;
    const dateFrom  = req.query.date_from as string | undefined;
    const dateTo    = req.query.date_to   as string | undefined;

    const conditions: any[] = [];
    if (status)   conditions.push(eq(quotes.status, status as any));
    if (seller)   conditions.push(like(quotes.seller1Name, `%${seller}%`));
    if (client)   conditions.push(like(quotes.clientName,  `%${client}%`));
    if (dateFrom) conditions.push(gte(quotes.createdAt, dateFrom));
    if (dateTo)   conditions.push(lte(quotes.createdAt, dateTo + " 23:59:59"));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id:              quotes.id,
        quoteNumber:     quotes.quoteNumber,
        clientName:      quotes.clientName,
        clientContact:   quotes.clientContact,
        clientPhone:     quotes.clientPhone,
        clientEmail:     quotes.clientEmail,
        projectName:     quotes.projectName,
        projectRef:      quotes.projectRef,
        seller1Name:     quotes.seller1Name,
        seller2Name:     quotes.seller2Name,
        assistantName:   quotes.assistantName,
        status:          quotes.status,
        currentVersion:  quotes.currentVersion,
        totalAmount:     quotes.totalAmount,
        totalFinal:      quotes.totalFinal,
        rtPercent:       quotes.rtPercent,
        marginPercent:   quotes.marginPercent,
        freteType:       quotes.freteType,
        revisionCount:   quotes.revisionCount,
        createdAt:       quotes.createdAt,
        updatedAt:       quotes.updatedAt,
        approvedAt:      quotes.approvedAt,
      })
      .from(quotes)
      .where(where)
      .orderBy(desc(quotes.updatedAt))
      .limit(perPage)
      .offset(offset);

    // Total count
    const countRows = await db
      .select({ id: quotes.id })
      .from(quotes)
      .where(where);

    res.json({
      data: rows,
      meta: {
        page,
        per_page: perPage,
        total: countRows.length,
        total_pages: Math.ceil(countRows.length / perPage),
      },
    });
  } catch (err) {
    console.error("[API v1] GET /quotes error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── GET /api/v1/quotes/:id ──────────────────────────────────────────────────
router.get("/quotes/:id", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) { res.status(503).json({ error: "Database unavailable" }); return; }

    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const quoteRows = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, id))
      .limit(1);

    if (quoteRows.length === 0) {
      res.status(404).json({ error: "Quote not found" });
      return;
    }

    const quote = quoteRows[0];

    // Versões
    const versions = await db
      .select()
      .from(quoteVersions)
      .where(eq(quoteVersions.quoteId, id))
      .orderBy(desc(quoteVersions.version));

    // Itens da versão atual
    const items = await db
      .select()
      .from(quoteItems)
      .where(and(
        eq(quoteItems.quoteId, id),
        eq(quoteItems.quoteVersionId,
          versions.find(v => v.version === quote.currentVersion)?.id ?? 0
        )
      ))
      .orderBy(quoteItems.itemNumber);

    // Parse itemData JSON
    const parsedItems = items.map(item => ({
      ...item,
      itemData: (() => {
        try { return JSON.parse(item.itemData); }
        catch { return item.itemData; }
      })(),
    }));

    res.json({
      ...quote,
      versions: versions.map(v => ({
        ...v,
        headerSnapshot: (() => {
          try { return JSON.parse(v.headerSnapshot); }
          catch { return v.headerSnapshot; }
        })(),
      })),
      items: parsedItems,
    });
  } catch (err) {
    console.error("[API v1] GET /quotes/:id error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── GET /api/v1/sellers ─────────────────────────────────────────────────────
router.get("/sellers", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) { res.status(503).json({ error: "Database unavailable" }); return; }

    const rows = await db
      .select({
        id:     sellers.id,
        code:   sellers.code,
        name:   sellers.name,
        email:  sellers.email,
        active: sellers.active,
      })
      .from(sellers)
      .where(eq(sellers.active, true))
      .orderBy(sellers.name);

    res.json({ data: rows });
  } catch (err) {
    console.error("[API v1] GET /sellers error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
