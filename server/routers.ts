import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { fetchDrivers, invalidateDriverCache } from "./driverService";
import {
  fetchAllAlfaluxProducts,
  invalidateAlfaluxCache,
  fetchRevendaProducts,
  fetchAcessoriosProducts,
  fetchCustomizadosProducts,
  fetchComponentes,
} from "./alfaluxApiService";
import {
  addCartItem, getCartItems, removeCartItem, clearCart, updateCartItemQty, updateCartItemData, updateCartItemsSortOrder, createQuote, addQuoteRevision, listQuotes, getQuoteById, approveQuote, getRevisionItems,
  updateQuoteStatus, getQuoteStats, deleteQuote, suggestQuoteNumber,
  insertAuditLog, getAuditLogs, listSellers, listAssistants,
  createFactoryOrder, getFactoryOrdersByQuoteId, getFactoryOrderById,
  updateFactoryOrder, addFactoryOrderItem, updateFactoryOrderItem,
  deleteFactoryOrderItem, createFactoryOrderRevision,
  createFactoryOrderExcel, listFactoryOrderExcels,
  getManagerDashboard, getSellerDashboard, getSalesGoalsByYear, upsertSalesGoal,
  getMonthlyReport,
  duplicateQuote,
  checkDuplicateProject,
  checkDuplicateQuoteNumber,
  reorderQuoteItems,
  nowBrasiliaStr,
  bumpQuoteRevision,
  setQuoteRevisionCount,
} from "./db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { storagePut } from "./storage";
import { getDb } from "./db";
import { sellers, assistants } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Controle de acesso a orçamentos ─────────────────────────────────────────
/** Emails dos gestores com acesso irrestrito a todos os orçamentos */
const MANAGER_EMAILS = [
  "daniel@grupoalfalux.com.br",   // DANIEL PUGLIESE
  "dennis@grupoalfalux.com.br",   // DENNIS PUGLIESI
  "vivian@grupoalfalux.com.br",   // VIVIAN FRANCESCHINELLI
];

/**
 * Verifica se o usuário logado pode editar/excluir um orçamento.
 * Gestores (MANAGER_EMAILS) têm acesso irrestrito.
 * Demais usuários só podem editar orçamentos onde seu email está vinculado
 * como seller1, seller2 ou assistente.
 */
async function canEditQuote(
  userEmail: string | null | undefined,
  quote: { seller1Id?: number | null; seller2Id?: number | null; assistantId?: number | null; createdByUserId?: number | null },
  userRole?: string | null,
  userId?: number | null
): Promise<boolean> {
  if (!userEmail && !userId) return false;
  // Admins têm acesso total
  if (userRole === "admin") return true;
  // Gestores têm acesso total
  if (userEmail && MANAGER_EMAILS.map(e => e.toLowerCase()).includes(userEmail.toLowerCase().trim())) return true;
  // Quem criou o orçamento sempre pode editá-lo (independente de ser seller/assistente)
  if (userId && quote.createdByUserId && userId === quote.createdByUserId) return true;
  if (!userEmail) return false;
  const email = userEmail.toLowerCase().trim();
  const db = await getDb();
  if (!db) return false;
  // Verificar se o email corresponde a algum seller vinculado ao orçamento
  if (quote.seller1Id) {
    const s1 = await db.select({ email: sellers.email }).from(sellers).where(eq(sellers.id, quote.seller1Id)).limit(1);
    if (s1[0]?.email?.toLowerCase() === email) return true;
  }
  // Checar seller2
  if (quote.seller2Id) {
    const s2 = await db.select({ email: sellers.email }).from(sellers).where(eq(sellers.id, quote.seller2Id)).limit(1);
    if (s2[0]?.email?.toLowerCase() === email) return true;
  }
  // Verificar se o email corresponde ao assistente vinculado
  if (quote.assistantId) {
    const a = await db.select({ email: assistants.email }).from(assistants).where(eq(assistants.id, quote.assistantId)).limit(1);
    if (a[0]?.email?.toLowerCase() === email) return true;
  }
  return false;
}

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
      const products = await fetchRevendaProducts();
      return products.map(p => ({
        sku: p.codigo,
        name: p.descricao,
        referencia: p.referencia,
        fornecedor: p.fornecedor,
        fotoUrl: p.fotoUrl,
        precoVenda: p.precoVenda,
      }));
    }),

    // Produtos Customizados: produtos não-catálogo para clientes específicos
    customizadosProducts: publicProcedure.query(async () => {
      const products = await fetchCustomizadosProducts();
      return products.map(p => ({
        sku: p.sku,
        name: p.name,
        descricao: p.descricao,
        familia: p.familia,
        fotoUrl: p.fotoUrl,
        precoVenda: p.precoVenda,
        clienteEspecifico: p.clienteEspecifico,
        observacoes: p.observacoes,
      }));
    }),

    // Acessórios: trilhos, conectores e acessórios CNTRAC
    acessoriosProducts: publicProcedure.query(async () => {
      const items = await fetchAcessoriosProducts();
      return items.map(p => ({
        id: p.id,
        codigo: p.codigo,
        sku: p.sku,
        produto: p.produto,
        familia: p.familia,
        dimensao: p.dimensao,
        precoVenda: p.precoVenda,
        fotoUrl: p.fotoUrl,
        source: p.source ?? null,
        observacoes: p.observacoes ?? null,
      }));
    }),

    /**
     * Componentes para Item Especial: drivers, módulos LED, ópticas, holders, dissipadores.
     * Fonte: /api/componentes/all da API Alfalux (publicado em Jun/2026).
     */
    componentes: publicProcedure.query(async () => {
      const { items, tipos } = await fetchComponentes();
      return {
        tipos,
        items: items.map(p => ({
          codigo: p.codigo ?? "",
          descricao: p.descricao,
          tipo: p.tipo,
          familia: p.familia ?? null,
          potencia: p.potencia ?? null,
          tensaoEntrada: p.tensaoEntrada ?? null,
          corrente: p.corrente ?? null,
          custoDriver: p.custoDriver ?? null,
          mkpPadrao: p.mkpPadrao ?? null,
          precoVenda: p.precoVenda ?? null,
          fotoUrl: p.fotoUrl ?? null,
          observacoes: p.observacoes ?? null,
          disponivel: p.disponivel,
        })),
      };
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

    reorder: protectedProcedure
      .input(z.object({ orderedIds: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        await updateCartItemsSortOrder(ctx.user.id, input.orderedIds);
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
        freteType: z.enum(["free", "paid", "night", "consult", "pickup"]).optional(),
        freteIsento: z.boolean().optional(),
        freteLocalidade: z.enum(["sp", "other"]).optional(),
        notes: z.string().optional(),
        versionNotes: z.string().optional(),
        totalAmount: z.number(),
        totalFinal: z.number().optional(),
        items: z.array(z.object({ itemNumber: z.number(), itemData: z.string() })),
        deliveryDays: z.number().int().min(1).optional(),
        commissionPercent: z.number().min(0).max(100).optional(),
        paymentTerm: z.string().optional(),
        destState: z.string().max(2).optional(),
        difalEnabled: z.boolean().optional(),
        difalPercent: z.number().min(0).optional(),
        fcpPercent: z.number().min(0).optional(),
        fcpEnabled: z.boolean().optional(),
        difalValue: z.number().min(0).optional(),
        fcpValue: z.number().min(0).optional(),
        projectNumber: z.string().max(64).optional(),
        freteValue: z.number().min(0).optional(),
        freteState: z.string().max(2).optional(),
        freteCity: z.string().max(128).optional(),
        freteIncluded: z.boolean().optional(),
        commissionPercent2: z.number().min(0).max(1).optional(),
        arquiteto: z.string().optional(),
        lightDesigner: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verificar obra duplicada — BLOQUEIA a criação se já existir obra com mesmo nome
        if (input.projectName?.trim()) {
          const dup = await checkDuplicateProject(input.projectName.trim());
          if (dup) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `Já existe um orçamento com esta obra: ${dup.quoteNumber} (${dup.clientName}). Verifique antes de continuar.`,
            });
          }
        }
        // Verificar cap de comissão (máx 5% total) — gestores e admins ficam isentos
        const userEmail = ctx.user.email?.toLowerCase().trim() ?? "";
        const isManagerUser = ctx.user.role === "admin" || MANAGER_EMAILS.map(e => e.toLowerCase()).includes(userEmail);
        if (!isManagerUser) {
          const comm1 = input.commissionPercent ?? 0;
          const comm2 = input.commissionPercent2 ?? 0;
          // commissionPercent vem como valor 0-100 (%), commissionPercent2 como 0-1
          const comm1Pct = comm1 > 1 ? comm1 / 100 : comm1;
          const comm2Pct = comm2;
          if (comm1Pct + comm2Pct > 0.05 + 0.0001) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `A soma das comissões não pode ultrapassar 5% (atual: ${((comm1Pct + comm2Pct) * 100).toFixed(1)}%).`,
            });
          }
        }
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
        rtPercent: z.number().min(0).max(0.99).optional(),
        rtDest1: z.string().optional(),
        rtDest1Active: z.boolean().optional(),
        rtDest2: z.string().optional(),
        rtDest2Active: z.boolean().optional(),
        rtDest3: z.string().optional(),
        rtDest3Active: z.boolean().optional(),
        marginPercent: z.number().min(0).max(0.99).optional(),
        freteType: z.enum(["free", "paid", "night", "consult", "pickup"]).optional(),
        freteIsento: z.boolean().optional(),
        freteLocalidade: z.enum(["sp", "other"]).optional(),
        notes: z.string().optional(),
        versionNotes: z.string().optional(),
        totalAmount: z.number(),
        totalFinal: z.number().optional(),
        items: z.array(z.object({ itemNumber: z.number(), itemData: z.string() })),
        bumpVersion: z.boolean().optional().default(false),
        deliveryDays: z.number().int().min(1).optional(),
        commissionPercent: z.number().min(0).max(100).optional(),
        paymentTerm: z.string().optional(),
        destState: z.string().max(2).optional(),
        difalEnabled: z.boolean().optional(),
        difalPercent: z.number().min(0).optional(),
        fcpPercent: z.number().min(0).optional(),
        fcpEnabled: z.boolean().optional(),
        difalValue: z.number().min(0).optional(),
        fcpValue: z.number().min(0).optional(),
        projectNumber: z.string().max(64).optional(),
        freteValue: z.number().min(0).optional(),
        freteState: z.string().max(2).optional(),
        freteCity: z.string().max(128).optional(),
        freteIncluded: z.boolean().optional(),
        commissionPercent2: z.number().min(0).max(1).optional(),
        arquiteto: z.string().optional(),
        lightDesigner: z.string().optional(),
        quoteNumber: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { quoteId, bumpVersion, ...rest } = input;
        // Verificar permissão de edição
        const existingForRevision = await getQuoteById(quoteId);
        if (!existingForRevision) throw new TRPCError({ code: "NOT_FOUND", message: "Orçamento não encontrado" });
        const hasPermission = await canEditQuote(ctx.user.email, existingForRevision.quote, ctx.user.role, ctx.user.id);
        if (!hasPermission) throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem permissão para editar este orçamento." });
        // Verificar cap de comissão (máx 5% total) — gestores e admins ficam isentos
        const userEmailRev = ctx.user.email?.toLowerCase().trim() ?? "";
        const isManagerRev = ctx.user.role === "admin" || MANAGER_EMAILS.map(e => e.toLowerCase()).includes(userEmailRev);
        if (!isManagerRev) {
          const comm1 = input.commissionPercent ?? 0;
          const comm2 = input.commissionPercent2 ?? 0;
          const comm1Pct = comm1 > 1 ? comm1 / 100 : comm1;
          const comm2Pct = comm2;
          if (comm1Pct + comm2Pct > 0.05 + 0.0001) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `A soma das comissões não pode ultrapassar 5% (atual: ${((comm1Pct + comm2Pct) * 100).toFixed(1)}%).`,
            });
          }
        }
        // Garantir que 0 seja passado explicitamente (não undefined) para limpar RT/Margem
        const result = await addQuoteRevision(quoteId, {
          ...rest,
          rtPercent: input.rtPercent ?? 0,
          marginPercent: input.marginPercent ?? 0,
          createdByUserId: ctx.user.id,
        }, bumpVersion ?? false);
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
        status: z.enum(["open", "approved", "lost", "cancelled", "invoiced"]).optional(),
        seller1Name: z.string().optional(),
        assistantName: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return listQuotes(input);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const result = await getQuoteById(input.id);
        if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Orçamento não encontrado" });
        const canEdit = await canEditQuote(ctx.user.email, result.quote, ctx.user.role, ctx.user.id);
        // Permissão de comissão:
        // - Admin ou MANAGER_EMAILS: vê e edita
        // - Vendedor que é seller1 ou seller2 do orçamento: vê (somente leitura)
        // - Demais (assistente, user, etc.): não vê
        const userEmail = (ctx.user.email ?? "").toLowerCase().trim();
        const isAdminOrManager = ctx.user.role === "admin" || MANAGER_EMAILS.map(e => e.toLowerCase()).includes(userEmail);
        let canSeeCommission = isAdminOrManager;
        let canEditCommission = isAdminOrManager;
        if (!isAdminOrManager && ctx.user.role === "vendedor") {
          // Verificar se o vendedor logado é seller1 ou seller2
          const db = await getDb();
          if (db) {
            const checkSeller = async (sellerId: number | null | undefined) => {
              if (!sellerId) return false;
              const s = await db.select({ email: sellers.email }).from(sellers).where(eq(sellers.id, sellerId)).limit(1);
              return s[0]?.email?.toLowerCase() === userEmail;
            };
            const isSeller1 = await checkSeller(result.quote.seller1Id);
            const isSeller2 = await checkSeller(result.quote.seller2Id);
            if (isSeller1 || isSeller2) {
              canSeeCommission = true;
              canEditCommission = false; // somente leitura
            }
          }
        }
        // Ocultar dados de comissão se não tem permissão
        const quoteData = canSeeCommission ? result.quote : {
          ...result.quote,
          commissionPercent: null,
          commissionPercent2: null,
        };
        return { ...result, quote: quoteData, canEdit, canSeeCommission, canEditCommission };
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

    duplicate: protectedProcedure
      .input(z.object({
        id: z.number(),
        newClientName: z.string().optional(),
        newQuoteNumber: z.string().optional(),
        newClientContact: z.string().optional(),
        newClientPhone: z.string().optional(),
        newClientEmail: z.string().optional(),
        newSellerId: z.number().optional(),
        newAssistantId: z.number().optional(),
        newAssistantName: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Validar unicidade do número personalizado antes de duplicar
        if (input.newQuoteNumber) {
          const dup = await checkDuplicateQuoteNumber(input.newQuoteNumber);
          if (dup) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `O número "${input.newQuoteNumber}" já está em uso pelo orçamento do cliente "${dup.clientName}". Por favor, escolha outro número.`,
            });
          }
        }
        const result = await duplicateQuote(
          input.id,
          ctx.user.id,
          input.newClientName,
          input.newQuoteNumber,
          input.newClientContact,
          input.newClientPhone,
          input.newClientEmail,
          input.newSellerId,
          input.newAssistantId,
          input.newAssistantName,
        );
        await insertAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          userName: ctx.user.name,
          action: "quote_duplicated",
          entityType: "quote",
          entityId: input.id,
          details: JSON.stringify({ newQuoteNumber: result.quoteNumber }),
        });
        return result;
      }),
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["open", "approved", "lost", "cancelled", "invoiced"]),
        quoteNumber: z.string().optional(),
        orderNumber: z.string().regex(/^\d{6}$/, "Número do pedido deve ter exatamente 6 dígitos").optional(),
        billingCompany: z.enum(["alfalux", "primelux", "decada", "primelase", "luminew"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const qForStatus = await getQuoteById(input.id);
        if (!qForStatus) throw new TRPCError({ code: "NOT_FOUND", message: "Orçamento não encontrado" });
        const canEditStatus = await canEditQuote(ctx.user.email, qForStatus.quote, ctx.user.role, ctx.user.id);
        if (!canEditStatus) throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem permissão para alterar o status deste orçamento." });
        // Número de pedido e empresa faturadora são solicitados apenas ao gerar o Pedido de Fábrica, não ao aprovar
        // Faturado só pode ser acionado a partir de um pedido fechado (approved)
        if (input.status === "invoiced" && qForStatus.quote.status !== "approved") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "O status 'Faturado' só pode ser definido a partir de um pedido fechado (Aprovado)." });
        }
        await updateQuoteStatus(input.id, input.status, {
          orderNumber: input.orderNumber,
          billingCompany: input.billingCompany,
        });
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
            orderNumber: input.orderNumber,
            billingCompany: input.billingCompany,
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
        const qForDelete = await getQuoteById(input.id);
        if (!qForDelete) throw new TRPCError({ code: "NOT_FOUND", message: "Orçamento não encontrado" });
        const canDelete = await canEditQuote(ctx.user.email, qForDelete.quote, ctx.user.role, ctx.user.id);
        if (!canDelete) throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem permissão para excluir este orçamento." });
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
        const canAppend = await canEditQuote(ctx.user.email, existing.quote, ctx.user.role, ctx.user.id);
        if (!canAppend) throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem permissão para adicionar itens a este orçamento." });
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
          seller1Id: quote.seller1Id ?? undefined,
          seller1Name: quote.seller1Name ?? undefined,
          seller2Id: quote.seller2Id ?? undefined,
          seller2Name: quote.seller2Name ?? undefined,
          assistantId: quote.assistantId ?? undefined,
          rtPercent: quote.rtPercent != null ? Number(quote.rtPercent) : 0,
          rtDest1: quote.rtDest1 ?? undefined,
          rtDest1Active: quote.rtDest1Active ?? false,
          rtDest2: quote.rtDest2 ?? undefined,
          rtDest2Active: quote.rtDest2Active ?? false,
          rtDest3: quote.rtDest3 ?? undefined,
          rtDest3Active: quote.rtDest3Active ?? false,
          marginPercent: quote.marginPercent != null ? Number(quote.marginPercent) : 0,
          freteType: (quote.freteType as "free" | "paid" | "night" | "consult" | "pickup") ?? undefined,
          freteIsento: quote.freteIsento ?? false,
          freteLocalidade: (quote.freteLocalidade as "sp" | "other") ?? undefined,
          deliveryDays: quote.deliveryDays ?? 20,
          commissionPercent: quote.commissionPercent != null ? Number(quote.commissionPercent) : 0.05,
          commissionPercent2: quote.commissionPercent2 != null ? Number(quote.commissionPercent2) : 0,
          paymentTerm: quote.paymentTerm ?? undefined,
          destState: quote.destState ?? undefined,
          difalEnabled: quote.difalEnabled ?? false,
          difalPercent: quote.difalPercent != null ? Number(quote.difalPercent) : 0,
          fcpPercent: quote.fcpPercent != null ? Number(quote.fcpPercent) : 0,
          fcpEnabled: quote.fcpEnabled ?? false,
          difalValue: quote.difalValue != null ? Number(quote.difalValue) : 0,
          fcpValue: quote.fcpValue != null ? Number(quote.fcpValue) : 0,
          projectNumber: quote.projectNumber ?? undefined,
          freteValue: quote.freteValue != null ? Number(quote.freteValue) : 0,
          freteState: quote.freteState ?? undefined,
          freteIncluded: quote.freteIncluded ?? false,
          arquiteto: quote.arquiteto ?? undefined,
          lightDesigner: quote.lightDesigner ?? undefined,
          notes: quote.notes ?? undefined,
          versionNotes: input.versionNotes ?? `+${input.newItems.length} item(s) adicionado(s)`,
          totalAmount,
          items: allItems,
          createdByUserId: ctx.user.id,
        }, false /* bumpVersion=false: adicionar itens não gera nova revisão */);
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

    /** Verifica se um número de orçamento já está em uso */
    checkNumber: protectedProcedure
      .input(z.object({
        quoteNumber: z.string(),
        excludeQuoteId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const dup = await checkDuplicateQuoteNumber(input.quoteNumber, input.excludeQuoteId);
        return { exists: !!dup, existingQuote: dup ?? null };
      }),

    /** Reordena os itens da versão atual sem criar nova revisão */
    reorderItems: protectedProcedure
      .input(z.object({
        quoteId: z.number(),
        orderedItemIds: z.array(z.number()),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getQuoteById(input.quoteId);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Orçamento não encontrado" });
        const canEdit = await canEditQuote(ctx.user.email, existing.quote, ctx.user.role, ctx.user.id);
        if (!canEdit) throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem permissão para editar este orçamento." });
        await reorderQuoteItems(input.quoteId, input.orderedItemIds);
        return { success: true };
      }),

    /** Retorna os itens de uma revisão específica */
    getRevisionItems: protectedProcedure
      .input(z.object({
        quoteId: z.number(),
        versionId: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        const existing = await getQuoteById(input.quoteId);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Orçamento não encontrado" });
        const canEdit = await canEditQuote(ctx.user.email, existing.quote, ctx.user.role, ctx.user.id);
        if (!canEdit) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
        // Verificar que a versão pertence ao orçamento
        const version = existing.versions.find(v => v.id === input.versionId);
        if (!version) throw new TRPCError({ code: "NOT_FOUND", message: "Revisão não encontrada" });
        const revItems = await getRevisionItems(input.versionId);
        return { version, items: revItems };
      }),
    /** Incrementa revisionCount ao baixar Excel (chamado pelo frontend) */
    bumpRevision: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const q = await getQuoteById(input.id);
        if (!q) throw new TRPCError({ code: "NOT_FOUND", message: "Orçamento não encontrado" });
        const canBump = await canEditQuote(ctx.user.email, q.quote, ctx.user.role, ctx.user.id);
        if (!canBump) throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão" });
        const result = await bumpQuoteRevision(input.id);
        await insertAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          userName: ctx.user.name,
          action: "quote_revision_bumped",
          entityType: "quote",
          entityId: input.id,
          details: JSON.stringify({ newRevisionCount: result.revisionCount }),
        });
        return result;
      }),

    /** Define manualmente o revisionCount (somente gestores) */
    setRevision: protectedProcedure
      .input(z.object({ id: z.number(), revisionCount: z.number().int().min(0) }))
      .mutation(async ({ ctx, input }) => {
        const userEmail = ctx.user.email?.toLowerCase().trim() ?? "";
        const isManager = ctx.user.role === "admin" || ctx.user.role === "gerente" || MANAGER_EMAILS.map(e => e.toLowerCase()).includes(userEmail);
        if (!isManager) throw new TRPCError({ code: "FORBIDDEN", message: "Somente gestores podem alterar a revisão manualmente." });
        await setQuoteRevisionCount(input.id, input.revisionCount);
        await insertAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          userName: ctx.user.name,
          action: "quote_revision_set",
          entityType: "quote",
          entityId: input.id,
          details: JSON.stringify({ revisionCount: input.revisionCount }),
        });
        return { success: true };
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

  // ─── API Keys (somente admin) ────────────────────────────────────────────
  apiKeys: router({
    list: adminProcedure.query(async () => {
      const { apiKeys } = await import("../drizzle/schema");
      const { desc } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];
      return db.select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        active: apiKeys.active,
        lastUsedAt: apiKeys.lastUsedAt,
        createdAt: apiKeys.createdAt,
      }).from(apiKeys).orderBy(desc(apiKeys.createdAt));
    }),

    create: adminProcedure
      .input(z.object({ name: z.string().min(1).max(128) }))
      .mutation(async ({ input }) => {
        const { generateApiKey, hashApiKey } = await import("./apiAuth");
        const { apiKeys } = await import("../drizzle/schema");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const raw = generateApiKey();
        const hash = hashApiKey(raw);
        const prefix = raw.slice(0, 8); // "alf_XXXX"
        await db.insert(apiKeys).values({
          name: input.name,
          keyHash: hash,
          keyPrefix: prefix,
          createdByUserId: 1,
          active: true,
        });
        // Retorna a chave bruta UMA ÚNICA VEZ — não é armazenada
        return { key: raw, prefix };
      }),

    revoke: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { apiKeys } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(apiKeys).set({ active: false }).where(eq(apiKeys.id, input.id));
        return { success: true };
      }),
  }),

  // ─── Pedidos de Fábrica ──────────────────────────────────────────────────────
  factoryOrders: router({
    /** Cria um novo pedido de fábrica a partir do orçamento aprovado */
    create: protectedProcedure
      .input(z.object({
        quoteId: z.number(),
        empresa: z.enum(['ALFALUX', 'LUMINEW']).default('ALFALUX'),
        deliveryDays: z.number().optional(),
        notes: z.string().optional(),
        items: z.array(z.object({
          itemNumber: z.number(),
          itemData: z.string(), // CartItemData serializado como JSON
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const orderId = await createFactoryOrder({
          quoteId: input.quoteId,
          empresa: input.empresa,
          deliveryDays: input.deliveryDays,
          notes: input.notes,
          createdByUserId: ctx.user.id,
          items: input.items,
        });
        return { id: orderId };
      }),

    /** Lista todos os pedidos de fábrica de um orçamento */
    list: protectedProcedure
      .input(z.object({ quoteId: z.number() }))
      .query(async ({ input }) => {
        return getFactoryOrdersByQuoteId(input.quoteId);
      }),

    /** Retorna um pedido de fábrica com seus itens */
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const order = await getFactoryOrderById(input.id);
        if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Pedido não encontrado' });
        return order;
      }),

    /** Atualiza campos do pedido (empresa, status, deliveryDays, notes, orderNumber) */
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        orderNumber: z.string().optional(),
        empresa: z.enum(['ALFALUX', 'LUMINEW']).optional(),
        status: z.enum(['draft', 'sent', 'in_production', 'completed']).optional(),
        deliveryDays: z.number().optional(),
        notes: z.string().optional(),
        approvedAt: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateFactoryOrder(id, data);
        return { success: true };
      }),

    /** Adiciona um item ao pedido */
    addItem: protectedProcedure
      .input(z.object({
        factoryOrderId: z.number(),
        itemNumber: z.number(),
        itemData: z.string(),
      }))
      .mutation(async ({ input }) => {
        const itemId = await addFactoryOrderItem(input.factoryOrderId, input.itemNumber, input.itemData);
        return { id: itemId };
      }),

    /** Atualiza o itemData de um item */
    updateItem: protectedProcedure
      .input(z.object({
        itemId: z.number(),
        itemData: z.string(),
      }))
      .mutation(async ({ input }) => {
        await updateFactoryOrderItem(input.itemId, input.itemData);
        return { success: true };
      }),

    /** Remove um item do pedido */
    removeItem: protectedProcedure
      .input(z.object({ itemId: z.number() }))
      .mutation(async ({ input }) => {
        await deleteFactoryOrderItem(input.itemId);
        return { success: true };
      }),

    /** Cria nova revisão clonando o pedido atual */
    createRevision: protectedProcedure
      .input(z.object({ sourceOrderId: z.number() }))
      .mutation(async ({ input }) => {
        const newOrderId = await createFactoryOrderRevision(input.sourceOrderId);
        return { id: newOrderId };
      }),

    /** Salva um Excel gerado no S3 e registra no histórico */
    saveExcel: protectedProcedure
      .input(z.object({
        factoryOrderId: z.number(),
        orderNumber: z.string().regex(/^\d{6}$/, 'Número do pedido deve ter exatamente 6 dígitos numéricos'),
        revision: z.number(),
        excelBase64: z.string(), // ArrayBuffer serializado como base64
        fileName: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const buffer = Buffer.from(input.excelBase64, 'base64');
        const key = `factory-orders/${input.factoryOrderId}/rev${input.revision}/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(key, buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        const id = await createFactoryOrderExcel({
          factoryOrderId: input.factoryOrderId,
          orderNumber: input.orderNumber,
          revision: input.revision,
          excelKey: key,
          excelUrl: url,
          generatedByUserId: ctx.user.id,
        });
        return { id, url };
      }),

    /** Lista os Excels gerados para um pedido de fábrica */
    listExcels: protectedProcedure
      .input(z.object({ factoryOrderId: z.number() }))
      .query(async ({ input }) => {
        return listFactoryOrderExcels(input.factoryOrderId);
      }),
  }),

   // ─── Dashboard Gerencial ────────────────────────────────────────────────────
  dashboard: router({
    /** Dados completos para admin/gerente */
    managerData: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const email = ctx.user.email?.toLowerCase() ?? '';
        const isManager = ctx.user.role === 'admin' ||
          ctx.user.role === 'gerente' ||
          MANAGER_EMAILS.map(e => e.toLowerCase()).includes(email);
        if (!isManager) throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito a gerentes e administradores.' });
        return getManagerDashboard(input.year, input.month, input.dateFrom, input.dateTo);
      }),
    /** Dados do próprio vendedor */
    sellerData: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const role = ctx.user.role;
        if (role === 'assistente') throw new TRPCError({ code: 'FORBIDDEN', message: 'Assistentes não têm acesso ao dashboard.' });
        const email = ctx.user.email ?? '';
        return getSellerDashboard(email, input.year, input.month, input.dateFrom, input.dateTo);
      }),
    /** Metas do ano (visível para todos exceto assistentes) */
    goals: protectedProcedure
      .input(z.object({ year: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role === 'assistente') throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado.' });
        return getSalesGoalsByYear(input.year);
      }),
    /** Upsert de meta (somente admin) */
    upsertGoal: adminProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().nullable(),
        goalAmount: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await upsertSalesGoal({
          year: input.year,
          month: input.month,
          goalAmount: input.goalAmount,
          setByUserId: ctx.user.id,
        });
        return { id };
      }),
    /** Atualiza role de um usuário (somente admin) */
    updateUserRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(['user', 'admin', 'gerente', 'vendedor', 'assistente']),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { users } = await import('../drizzle/schema');
        await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
        return { success: true };
      }),
    /** Relatório mensal de vendas com comissões (somente admin/gerente) */
    monthlyReport: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ ctx, input }) => {
        const email = ctx.user.email?.toLowerCase() ?? '';
        const isManager = ctx.user.role === 'admin' ||
          ctx.user.role === 'gerente' ||
          MANAGER_EMAILS.map(e => e.toLowerCase()).includes(email);
        if (!isManager) throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito a gerentes e administradores.' });
        return getMonthlyReport(input.year, input.month);
      }),
    /** Lista usuários com seus roles (somente admin) */
    listUsers: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const { users } = await import('../drizzle/schema');
      const { desc } = await import('drizzle-orm');
      return db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        lastSignedIn: users.lastSignedIn,
      }).from(users).orderBy(desc(users.lastSignedIn));
    }),
  }),
  // ─── Backup / Exportação ──────────────────────────────────────────────────
  backup: router({
    // Listar histórico de backups automáticos
    list: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
      const { backups } = await import("../drizzle/schema");
      const { desc } = await import("drizzle-orm");
      const rows = await db.select().from(backups).orderBy(desc(backups.createdAt)).limit(100);
      return rows;
    }),

    exportSQL: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
      const { quotes, quoteVersions, quoteItems, sellers, assistants, users, salesGoals, factoryOrders, factoryOrderItems } = await import("../drizzle/schema");
      const allQuotes = await db.select().from(quotes);
      const allVersions = await db.select().from(quoteVersions);
      const allItems = await db.select().from(quoteItems);
      const allSellers = await db.select().from(sellers);
      const allAssistants = await db.select().from(assistants);
      const allUsers = await db.select().from(users);
      const allGoals = await db.select().from(salesGoals);
      const allOrders = await db.select().from(factoryOrders);
      const allOrderItems = await db.select().from(factoryOrderItems);

      const escape = (v: unknown): string => {
        if (v === null || v === undefined) return "NULL";
        if (typeof v === "number" || typeof v === "bigint") return String(v);
        if (typeof v === "boolean") return v ? "1" : "0";
        return `'${String(v).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r")}'`;
      };

      const tableToSQL = (tableName: string, rows: Record<string, unknown>[]): string => {
        if (!rows.length) return `-- ${tableName}: sem dados\n`;
        const cols = Object.keys(rows[0]);
        const header = `-- Tabela: ${tableName} (${rows.length} registros)\nINSERT INTO \`${tableName}\` (${cols.map(c => `\`${c}\``).join(", ")}) VALUES\n`;
        const values = rows.map(row => `  (${cols.map(c => escape(row[c])).join(", ")})`).join(",\n");
        return header + values + ";\n\n";
      };

      const now = nowBrasiliaStr();
      let sql = `-- Backup completo do Sistema Luna\n-- Gerado em: ${now}\n-- Grupo Alfalux Iluminação\n\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n\n`;
      sql += tableToSQL("quotes", allQuotes as Record<string, unknown>[]);
      sql += tableToSQL("quote_versions", allVersions as Record<string, unknown>[]);
      sql += tableToSQL("quote_items", allItems as Record<string, unknown>[]);
      sql += tableToSQL("sellers", allSellers as Record<string, unknown>[]);
      sql += tableToSQL("assistants", allAssistants as Record<string, unknown>[]);
      sql += tableToSQL("users", allUsers as Record<string, unknown>[]);
      sql += tableToSQL("sales_goals", allGoals as Record<string, unknown>[]);
      sql += tableToSQL("factory_orders", allOrders as Record<string, unknown>[]);
      sql += tableToSQL("factory_order_items", allOrderItems as Record<string, unknown>[]);
      sql += `\nSET FOREIGN_KEY_CHECKS=1;\n`;

      return { sql, generatedAt: now, counts: {
        quotes: allQuotes.length, versions: allVersions.length, items: allItems.length,
        sellers: allSellers.length, users: allUsers.length, goals: allGoals.length,
        orders: allOrders.length, orderItems: allOrderItems.length,
      }};
    }),

    exportQuotesExcel: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
      const { quotes, quoteVersions, quoteItems } = await import("../drizzle/schema");
      const { desc } = await import("drizzle-orm");
      const allQuotes = await db.select().from(quotes).orderBy(desc(quotes.createdAt));
      const allVersions = await db.select().from(quoteVersions);
      const allItems = await db.select().from(quoteItems);
      return { quotes: allQuotes, versions: allVersions, items: allItems, generatedAt: nowBrasiliaStr() };
    }),
  }),

  // ─── Painel ADM ──────────────────────────────────────────────────────
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

    /**
     * Recalcula totalFinal e totalAmount de todos os orçamentos existentes
     * para incluir os drivers que antes não eram somados.
     * Deve ser executado UMA vez após o deploy da correção.
     */
    recalcDriverTotals: adminProcedure.mutation(async () => {
      const { getDb } = await import("./db");
      const { quotes, quoteVersions, quoteItems } = await import("../drizzle/schema");
      const { eq, inArray } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return { updated: 0, errors: [] };

      // Função auxiliar: corrige driverTotalPrice nos driverLines se estiver calculado para 1 unidade
      // Retorna o itemData corrigido (string JSON) e o total correto do item
      function fixAndCalcItem(itemData: string): { fixedData: string; total: number } {
        try {
          const d = JSON.parse(itemData) as any;
          if (!d) return { fixedData: itemData, total: 0 };
          if (d.driverLines && Array.isArray(d.driverLines) && d.driverLines.length > 0) {
            const qty = d.qty ?? 1;
            // Corrigir driverLines: se driverTotalPrice ≈ driverUnitPrice (calculado para 1 unidade), multiplicar por driverQty
            let itemDataChanged = false;
            const fixedDriverLines = d.driverLines.map((dl: any) => {
              if (dl.driverUnitPrice != null && dl.driverQty != null && dl.driverQty > 1) {
                const expectedTotal = Math.round(dl.driverUnitPrice * dl.driverQty * 100) / 100;
                const currentTotal = dl.driverTotalPrice ?? 0;
                // Se o total atual é igual ao preço unitário (erro de qty=1) ou difere do esperado
                if (Math.abs(currentTotal - dl.driverUnitPrice) < 0.02 || Math.abs(currentTotal - expectedTotal) > 0.02) {
                  itemDataChanged = true;
                  return { ...dl, driverTotalPrice: expectedTotal };
                }
              }
              return dl;
            });
            // Calcular total da luminaria corretamente
            let lumTotal = 0;
            if (d.priceWithoutDriver != null) {
              const isUnitOnly = d.unitPriceLuminaria != null &&
                Math.abs(d.priceWithoutDriver - d.unitPriceLuminaria) < 0.02 &&
                qty > 1;
              lumTotal = isUnitOnly ? d.unitPriceLuminaria * qty : d.priceWithoutDriver;
            } else {
              const unitLum = d.unitPriceLuminaria ?? d.unitPrice ?? null;
              lumTotal = unitLum != null ? unitLum * qty : (d.totalPrice ?? 0);
            }
            const drvTotal = fixedDriverLines.reduce((s: number, dl: any) => s + (dl.driverTotalPrice ?? 0), 0);
            const total = lumTotal + drvTotal;
            // Atualizar totalPrice no item para refletir luminária + drivers
            const fixedData = itemDataChanged
              ? JSON.stringify({ ...d, driverLines: fixedDriverLines, totalPrice: Math.round(total * 100) / 100 })
              : JSON.stringify({ ...d, totalPrice: Math.round(total * 100) / 100 });
            return { fixedData, total };
          }
          return { fixedData: itemData, total: d.totalPrice ?? 0 };
        } catch { return { fixedData: itemData, total: 0 }; }
      }
      // Compatibilidade: calcItemTotal usa fixAndCalcItem internamente
      function calcItemTotal(itemData: string): number {
        return fixAndCalcItem(itemData).total;
      }

      // Buscar todos os orçamentos
      const allQuotes = await db.select().from(quotes);
      let updatedCount = 0;
      const errors: string[] = [];

      for (const q of allQuotes) {
        try {
          // Buscar a versão atual do orçamento
          const versions = await db.select().from(quoteVersions)
            .where(eq(quoteVersions.quoteId, q.id))
            .orderBy(quoteVersions.version);
          if (versions.length === 0) continue;

          // Recalcular para cada versão
          for (const v of versions) {
            const vItems = await db.select().from(quoteItems)
              .where(eq(quoteItems.quoteVersionId, v.id));

            // Verificar se algum item tem driverLines
            const hasDrivers = vItems.some(it => {
              try {
                const d = JSON.parse(it.itemData) as any;
                return d?.driverLines && d.driverLines.length > 0;
              } catch { return false; }
            });
            if (!hasDrivers) continue;

            // Corrigir itemData de cada item (driverTotalPrice × qty correto) e calcular novo totalBase
            for (const vItem of vItems) {
              const { fixedData, total } = fixAndCalcItem(vItem.itemData);
              if (fixedData !== vItem.itemData) {
                await db.update(quoteItems)
                  .set({ itemData: fixedData })
                  .where(eq(quoteItems.id, vItem.id));
                vItem.itemData = fixedData; // atualizar referência local
              }
            }
            const newTotalBase = vItems.reduce((s, it) => s + calcItemTotal(it.itemData), 0);

            // Recuperar RT e margem do header snapshot
            let rtPct = 0, marginPct = 0;
            try {
              const snap = JSON.parse(v.headerSnapshot) as any;
              rtPct = snap.rtPercent ? parseFloat(String(snap.rtPercent)) : 0;
              marginPct = snap.marginPercent ? parseFloat(String(snap.marginPercent)) : 0;
            } catch {}

            const totalComRT = rtPct > 0 ? newTotalBase / (1 - rtPct) : newTotalBase;
            const totalFinalCalc = marginPct > 0 ? totalComRT / (1 - marginPct) : totalComRT;

            // Recuperar frete, DIFAL e FCP do snapshot
            let freteValor = 0, difalVal = 0, fcpVal = 0;
            try {
              const snap = JSON.parse(v.headerSnapshot) as any;
              freteValor = (snap.freteIncluded && snap.freteValue) ? parseFloat(String(snap.freteValue)) : 0;
              difalVal = (snap.difalEnabled && snap.difalValue) ? parseFloat(String(snap.difalValue)) : 0;
              fcpVal = (snap.fcpEnabled && snap.fcpValue) ? parseFloat(String(snap.fcpValue)) : 0;
            } catch {}

            const newTotalFinal = totalFinalCalc + freteValor + difalVal + fcpVal;

            // Atualizar versão
            await db.update(quoteVersions)
              .set({
                totalAmount: String(Math.round(newTotalBase * 100) / 100),
                totalFinal: String(Math.round(newTotalFinal * 100) / 100),
              })
              .where(eq(quoteVersions.id, v.id));
          }

          // Atualizar o orçamento principal com os valores da versão mais recente
          const latestVersion = versions[versions.length - 1];
          const latestItems = await db.select().from(quoteItems)
            .where(eq(quoteItems.quoteVersionId, latestVersion.id));
          const hasDriversLatest = latestItems.some(it => {
            try {
              const d = JSON.parse(it.itemData) as any;
              return d?.driverLines && d.driverLines.length > 0;
            } catch { return false; }
          });
          if (!hasDriversLatest) continue;

          const newTotalBaseLatest = latestItems.reduce((s, it) => s + calcItemTotal(it.itemData), 0);
          let rtPctQ = 0, marginPctQ = 0, freteValorQ = 0, difalValQ = 0, fcpValQ = 0;
          try {
            const snap = JSON.parse(latestVersion.headerSnapshot) as any;
            rtPctQ = snap.rtPercent ? parseFloat(String(snap.rtPercent)) : 0;
            marginPctQ = snap.marginPercent ? parseFloat(String(snap.marginPercent)) : 0;
            freteValorQ = (snap.freteIncluded && snap.freteValue) ? parseFloat(String(snap.freteValue)) : 0;
            difalValQ = (snap.difalEnabled && snap.difalValue) ? parseFloat(String(snap.difalValue)) : 0;
            fcpValQ = (snap.fcpEnabled && snap.fcpValue) ? parseFloat(String(snap.fcpValue)) : 0;
          } catch {}
          const totalComRTQ = rtPctQ > 0 ? newTotalBaseLatest / (1 - rtPctQ) : newTotalBaseLatest;
          const totalFinalQ = marginPctQ > 0 ? totalComRTQ / (1 - marginPctQ) : totalComRTQ;
          const newTotalFinalQ = totalFinalQ + freteValorQ + difalValQ + fcpValQ;

          await db.update(quotes)
            .set({
              totalAmount: String(Math.round(newTotalBaseLatest * 100) / 100),
              totalFinal: String(Math.round(newTotalFinalQ * 100) / 100),
            })
            .where(eq(quotes.id, q.id));

          updatedCount++;
        } catch (e: any) {
          errors.push(`Quote ${q.id}: ${e?.message ?? String(e)}`);
        }
      }

      return { updated: updatedCount, errors };
    }),
  }),
});

export type AppRouter = typeof appRouter;
