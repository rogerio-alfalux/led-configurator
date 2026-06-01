import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { fetchDrivers, invalidateDriverCache } from "./driverService";
import { fetchAllAlfaluxProducts, invalidateAlfaluxCache } from "./alfaluxApiService";
import {
  addCartItem, getCartItems, removeCartItem, clearCart, updateCartItemQty, updateCartItemData,
  createQuote, addQuoteRevision, listQuotes, getQuoteById, approveQuote,
  updateQuoteStatus, getQuoteStats, deleteQuote, suggestQuoteNumber,
  insertAuditLog, getAuditLogs, listSellers, listAssistants,
} from "./db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { storagePut } from "./storage";

// ─── Admin-only procedure ─────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  led: router({
    drivers: publicProcedure.query(async () => {
      const drivers = await fetchDrivers();
      return drivers;
    }),
    refreshDrivers: publicProcedure.mutation(async () => {
      invalidateDriverCache();
      const drivers = await fetchDrivers();
      return { count: drivers.length, available: drivers.filter(d => d.available).length };
    }),
  }),

  alfalux: router({
    products: publicProcedure.query(async () => {
      const products = await fetchAllAlfaluxProducts();
      return products;
    }),
    refreshProducts: publicProcedure.mutation(async () => {
      try {
        invalidateAlfaluxCache();
        const products = await fetchAllAlfaluxProducts();
        return { count: products.length, error: null };
      } catch (err) {
        console.error("[AlfaluxAPI] Falha ao atualizar produtos:", err);
        return { count: 0, error: "Falha ao conectar com a API Alfalux" };
      }
    }),

    // Produtos de revenda: identificados por SKU começando com 'RV' ou categoria 'REVENDA'
    revendaProducts: publicProcedure.query(async () => {
      const products = await fetchAllAlfaluxProducts();
      return products.filter(p =>
        p.sku.startsWith("RV") ||
        p.categoria?.toUpperCase() === "REVENDA" ||
        p.familia?.toUpperCase().startsWith("RV")
      ).map(p => ({
        sku: p.sku,
        name: p.name,
        familia: p.familia,
        categoria: p.categoria,
        fotoUrl: p.fotoUrl,
        temperaturasCor: p.temperaturasCor,
      }));
    }),
  }),

  cart: router({
    add: protectedProcedure
      .input(z.object({ itemData: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const id = await addCartItem({ userId: ctx.user.id, itemData: input.itemData });
        return { id };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      const items = await getCartItems(ctx.user.id);
      return items.map(item => ({
        id: item.id,
        itemData: item.itemData,
        createdAt: item.createdAt,
      }));
    }),

    remove: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await removeCartItem(input.id, ctx.user.id);
        return { success: true };
      }),

    clear: protectedProcedure.mutation(async ({ ctx }) => {
      await clearCart(ctx.user.id);
      return { success: true };
    }),

    updateQty: protectedProcedure
      .input(z.object({ id: z.number(), qty: z.number().min(1) }))
      .mutation(async ({ ctx, input }) => {
        await updateCartItemQty(input.id, ctx.user.id, input.qty);
        return { success: true };
      }),

    updateItemData: protectedProcedure
      .input(z.object({
        id: z.number(),
        patch: z.record(z.string(), z.unknown()),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateCartItemData(input.id, ctx.user.id, input.patch);
        return { success: true };
      }),
  }),

  // ─── Upload de arquivos ─────────────────────────────────────────────────────────────────────────────────────
  upload: router({
    /** Faz upload de uma foto de item especial e retorna a URL /manus-storage/... */
    specialItemPhoto: protectedProcedure
      .input(z.object({
        /** Conteúdo da imagem em base64 */
        base64: z.string(),
        /** MIME type: "image/jpeg" ou "image/png" */
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
        /** Nome original do arquivo (para gerar chave única) */
        fileName: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const ext = input.mimeType === "image/png" ? "png" : input.mimeType === "image/webp" ? "webp" : "jpg";
        const ts = Date.now();
        const key = `special-items/${ctx.user.id}/${ts}.${ext}`;
        const buffer = Buffer.from(input.base64, "base64");
        const { url } = await storagePut(key, buffer, input.mimeType);
        return { url };
      }),
  }),

  // ─── Orçamentos ────────────────────────────────────────────────────────────
  quotes: router({
    save: protectedProcedure
      .input(z.object({
        quoteNumber: z.string().optional(),
        clientName: z.string().min(1),
        clientContact: z.string().optional(),
        clientPhone: z.string().optional(),
        clientEmail: z.string().optional(),
        projectName: z.string().optional(),
        projectRef: z.string().optional(),
        vendorName: z.string().optional(),
        assistantName: z.string().optional(),
        seller1Id: z.number().optional(),
        seller1Name: z.string().optional(),
        seller2Id: z.number().optional(),
        seller2Name: z.string().optional(),
        assistantId: z.number().optional(),
        rtPercent: z.number().optional(),
        rtDest1: z.string().optional(),
        rtDest1Active: z.boolean().optional(),
        rtDest2: z.string().optional(),
        rtDest2Active: z.boolean().optional(),
        rtDest3: z.string().optional(),
        rtDest3Active: z.boolean().optional(),
        marginPercent: z.number().optional(),
        freteType: z.enum(["free", "paid", "night", "consult"]).optional(),
        freteIsento: z.boolean().optional(),
        freteLocalidade: z.enum(["sp", "other"]).optional(),
        notes: z.string().optional(),
        versionNotes: z.string().optional(),
        totalAmount: z.number(),
        totalFinal: z.number().optional(),
        items: z.array(z.object({ itemNumber: z.number(), itemData: z.string() })),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await createQuote({ ...input, createdByUserId: ctx.user.id });
        await insertAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          userName: ctx.user.name,
          action: "quote_created",
          entityType: "quote",
          entityId: result.quoteId,
          details: JSON.stringify({
            quoteNumber: result.quoteNumber,
            clientName: input.clientName,
            totalAmount: input.totalAmount,
            itemCount: input.items.length,
          }),
        });
        return result;
      }),

    addRevision: protectedProcedure
      .input(z.object({
        quoteId: z.number(),
        clientName: z.string().min(1),
        clientContact: z.string().optional(),
        clientPhone: z.string().optional(),
        clientEmail: z.string().optional(),
        projectName: z.string().optional(),
        projectRef: z.string().optional(),
        vendorName: z.string().optional(),
        assistantName: z.string().optional(),
        seller1Id: z.number().optional(),
        seller1Name: z.string().optional(),
        seller2Id: z.number().optional(),
        seller2Name: z.string().optional(),
        assistantId: z.number().optional(),
        rtPercent: z.number().optional(),
        rtDest1: z.string().optional(),
        rtDest1Active: z.boolean().optional(),
        rtDest2: z.string().optional(),
        rtDest2Active: z.boolean().optional(),
        rtDest3: z.string().optional(),
        rtDest3Active: z.boolean().optional(),
        marginPercent: z.number().optional(),
        freteType: z.enum(["free", "paid", "night", "consult"]).optional(),
        freteIsento: z.boolean().optional(),
        freteLocalidade: z.enum(["sp", "other"]).optional(),
        notes: z.string().optional(),
        versionNotes: z.string().optional(),
        totalAmount: z.number(),
        totalFinal: z.number().optional(),
        items: z.array(z.object({ itemNumber: z.number(), itemData: z.string() })),
      }))
      .mutation(async ({ ctx, input }) => {
        const { quoteId, ...rest } = input;
        const result = await addQuoteRevision(quoteId, { ...rest, createdByUserId: ctx.user.id });
        await insertAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          userName: ctx.user.name,
          action: "quote_revised",
          entityType: "quote",
          entityId: quoteId,
          details: JSON.stringify({
            newVersion: result.version,
            clientName: input.clientName,
            totalAmount: input.totalAmount,
            versionNotes: input.versionNotes,
          }),
        });
        return result;
      }),

    list: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        status: z.enum(["open", "approved", "lost", "cancelled"]).optional(),
        seller1Name: z.string().optional(),
        assistantName: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return listQuotes(input);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const result = await getQuoteById(input.id);
        if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Orçamento não encontrado" });
        return result;
      }),

    approve: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await approveQuote(input.id);
        await insertAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          userName: ctx.user.name,
          action: "quote_status_changed",
          entityType: "quote",
          entityId: input.id,
          details: JSON.stringify({ newStatus: "approved" }),
        });
        return { success: true };
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["open", "approved", "lost", "cancelled"]),
        quoteNumber: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateQuoteStatus(input.id, input.status);
        await insertAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          userName: ctx.user.name,
          action: "quote_status_changed",
          entityType: "quote",
          entityId: input.id,
          details: JSON.stringify({
            newStatus: input.status,
            quoteNumber: input.quoteNumber,
          }),
        });
        return { success: true };
      }),

    stats: protectedProcedure.query(async () => {
      return getQuoteStats();
    }),

    delete: protectedProcedure
      .input(z.object({ id: z.number(), quoteNumber: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await insertAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          userName: ctx.user.name,
          action: "quote_deleted",
          entityType: "quote",
          entityId: input.id,
          details: JSON.stringify({ quoteNumber: input.quoteNumber }),
        });
        await deleteQuote(input.id);
        return { success: true };
      }),

    /** Adiciona novos itens a um orçamento existente criando uma nova revisão */
    appendItems: protectedProcedure
      .input(z.object({
        quoteId: z.number(),
        newItems: z.array(z.object({ itemNumber: z.number(), itemData: z.string() })),
        versionNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getQuoteById(input.quoteId);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Orçamento não encontrado" });
        const { quote, versions, items } = existing;
        const currentVersionId = versions[0]?.id;
        const currentItems = items
          .filter(i => i.quoteVersionId === currentVersionId)
          .map((i, idx) => ({ itemNumber: i.itemNumber, itemData: i.itemData }));
        // Renumerar novos itens após os existentes
        const offset = currentItems.length;
        const newItemsNumbered = input.newItems.map((it, idx) => ({
          itemNumber: offset + idx + 1,
          itemData: it.itemData,
        }));
        const allItems = [...currentItems, ...newItemsNumbered];
        const totalAmount = allItems.reduce((sum, it) => {
          try { const d = JSON.parse(it.itemData); return sum + (d.totalPrice ?? 0); } catch { return sum; }
        }, 0);
        const result = await addQuoteRevision(input.quoteId, {
          clientName: quote.clientName,
          clientContact: quote.clientContact ?? undefined,
          clientPhone: quote.clientPhone ?? undefined,
          clientEmail: quote.clientEmail ?? undefined,
          projectName: quote.projectName ?? undefined,
          projectRef: quote.projectRef ?? undefined,
          vendorName: quote.vendorName ?? undefined,
          assistantName: quote.assistantName ?? undefined,
          notes: quote.notes ?? undefined,
          versionNotes: input.versionNotes ?? `+${input.newItems.length} item(s) adicionado(s)`,
          totalAmount,
          items: allItems,
          createdByUserId: ctx.user.id,
        });
        await insertAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          userName: ctx.user.name,
          action: "quote_revised",
          entityType: "quote",
          entityId: input.quoteId,
          details: JSON.stringify({ newVersion: result.version, addedItems: input.newItems.length }),
        });
        return { ...result, quoteNumber: quote.quoteNumber };
      }),

    suggestNumber: protectedProcedure
      .input(z.object({ sellerId: z.number().optional() }))
      .query(async ({ input }) => {
        const suggested = await suggestQuoteNumber(input.sellerId);
        return { suggested };
      }),

    /** Registra geração de ficha de produção */
    logProductionSheet: protectedProcedure
      .input(z.object({
        quoteId: z.number(),
        quoteNumber: z.string(),
        empresa: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        await insertAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          userName: ctx.user.name,
          action: "production_sheet_generated",
          entityType: "quote",
          entityId: input.quoteId,
          details: JSON.stringify({
            quoteNumber: input.quoteNumber,
            empresa: input.empresa,
          }),
        });
        return { success: true };
      }),
  }),

  // ─── Sellers & Assistants ─────────────────────────────────────────────────
  sellers: router({
    list: protectedProcedure.query(async () => listSellers()),
  }),
  assistants: router({
    list: protectedProcedure.query(async () => listAssistants()),
  }),

  // ─── Painel ADM ────────────────────────────────────────────────────────────
  admin: router({
    getLogs: adminProcedure
      .input(z.object({
        action: z.string().optional(),
        userEmail: z.string().optional(),
        entityType: z.string().optional(),
        limit: z.number().min(1).max(200).optional(),
        offset: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return getAuditLogs(input);
      }),

    getUsers: adminProcedure.query(async () => {
      const { getDb } = await import("./db");
      const { users } = await import("../drizzle/schema");
      const { desc } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];
      return db.select().from(users).orderBy(desc(users.lastSignedIn));
    }),
  }),
});

export type AppRouter = typeof appRouter;
