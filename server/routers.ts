import { COOKIE_NAME, COST_PRIVILEGED_EMAILS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { calculateDashboardProductCost, getActiveQuoteVersionId, getManualUnitCost, selectActiveQuoteItems, selectApiProductForQuoteItem } from "./quoteCostUtils";
import {
  fetchAllAlfaluxProducts,
  invalidateAlfaluxCache,
  fetchRevendaProducts,
  fetchAcessoriosProducts,
  fetchCustomizadosProducts,
  fetchComponentes,
  invalidateComponentesCache,
} from "./alfaluxApiService";
import {
  addCartItem, getCartItems, removeCartItem, clearCart, updateCartItemQty, updateCartItemData, updateCartItemsSortOrder, createQuote, addQuoteRevision, listQuotes, getQuoteById, approveQuote, getRevisionItems,
  updateQuoteStatus, markQuoteAsNonCommercial, getQuoteStats, deleteQuote, suggestQuoteNumber, findQuoteByNumber,
  insertAuditLog, getAuditLogs, listSellers, listAssistants,
  createFactoryOrder, getFactoryOrdersByQuoteId, getFactoryOrderById,
  updateFactoryOrder, addFactoryOrderItem, updateFactoryOrderItem,
  deleteFactoryOrderItem, createFactoryOrderRevision, deleteFactoryOrder,
  createFactoryOrderExcel, listFactoryOrderExcels, getSubOrders,
  getManagerDashboard, getSellerDashboard, getSalesGoalsByYear, upsertSalesGoal, getMonthlyBillingsByYear, upsertMonthlyBilling,
  getMonthlyReport,
  getQuoteAutomaticDuplicateState,
  getQuoteMetricVisibilityPreference,
  saveQuoteMetricVisibilityPreference,
  duplicateQuote,
  checkDuplicateProject,
  checkDuplicateQuoteNumber,
  reorderQuoteItems,
  nowBrasiliaStr,
  bumpQuoteRevision,
  setQuoteRevisionCount,
  getDriverPriceOverrides,
  upsertDriverPriceOverride,
  deleteDriverPriceOverride,
  getQuoteAdditionalCosts,
  createQuoteAdditionalCost,
  deleteQuoteAdditionalCost,
  getTotalAdditionalCosts,
  createSampleOrder,
  listSampleOrders,
  getSampleOrderById,
  getSampleOrderByQuoteId,
  updateSampleOrder,
  createSampleLink,
  listSampleLinks,
  getSampleLinkById,
  listSampleLinksByQuoteId,
  getSampleCommercialAdjustments,
  getNonCommercialFinancialTransfersByTargetQuoteId,
  getNonCommercialFinancialTransferBySourceQuoteId,
  applyNonCommercialRevenueTransfer,
  reverseNonCommercialRevenueTransfer,
  deleteSampleLink,
  deleteSampleOrder,
  getSampleOrderStats,
  createGuestQuoteRequest,
  createGuestQuoteRequestAttachments,
  listGuestQuoteRequestAttachments,
  listGuestQuoteRequests,
  listGuestQuoteRequestsForGuest,
  getGuestQuoteRequestById,
  getGuestQuoteRequestByAdminQuoteId,
  getLdGuestContactProfile,
  upsertLdGuestContactProfile,
  countPendingGuestQuoteRequests,
  countGuestUnseenQuoteResponses,
  markGuestQuoteResponseViewed,
  markGuestQuoteRequestInReview,
  linkGuestQuoteRequestQuote,
  attachGuestQuoteRequestPdf,
  deleteGuestQuoteRequestForGuest,
  deleteGuestQuoteRequestForAdmin,
} from "./db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { storagePut } from "./storage";
import { getDb } from "./db";
import { sellers, assistants, quoteItems, quotes } from "../drizzle/schema";
import { eq, inArray, and } from "drizzle-orm";
import { DISCOUNT_EDITORS_EMAILS } from "../shared/const";
import { canDuplicateAnyCommercialQuote, canEditOwnDuplicatedQuote, commercialQuoteAccess, shouldBindCommercialQuoteTeam } from "../shared/quoteOwnership";
import { resolveOriginalCommercialTotals } from "../shared/nonCommercialQuoteFinancial";
import { canAccessCommercialQuotes } from "../shared/guestCommercialAccess";
import { getSampleLinkValidationError } from "../shared/sampleLinkValidation";
import { sanitizeLdAttachmentFileName, validateLdTechnicalAttachments, type LdTechnicalAttachment } from "./ldRequestAttachment";
import { buildLdQuoteConversion } from "./ldQuoteConversion";
import { buildLdDraftQuoteNumber, isLdDraftQuoteNumber } from "../shared/ldDraftQuoteNumber";
import { getLdRequestDeadlineValidationError } from "../shared/ldRequestDeadlines";
import { generateAndStoreCompleteBackup } from "./backupService";
import { getQuoteStatusAuthorizationError } from "./quoteStatusPolicy";
import { getUserCreationRoleAuthorizationError } from "../shared/userCreationAccess";
import { isCostDepartmentRole, isSpecialItemWithoutRegisteredCost } from "../shared/costDepartmentAccess";

// ─── Controle de acesso a orçamentos ─────────────────────────────────────────
/** Emails dos gestores com acesso irrestrito a todos os orçamentos */
const MANAGER_EMAILS = [
  "daniel@grupoalfalux.com.br",   // DANIEL PUGLIESE
  "dennis@grupoalfalux.com.br",   // DENNIS PUGLIESE
  "vivian@grupoalfalux.com.br",   // VIVIAN FRANCESCHINELLI
];

/**
 * Vendedores com comissão diferenciada e seus caps individuais.
 * O Gustavo tem cap de 10% (sozinho). Se houver 2 vendedores, a soma ainda não pode ultrapassar 10%.
 */
const SPECIAL_COMMISSION_SELLERS: Record<string, number> = {
  "gustavo@grupoalfalux.com.br": 0.10, // Gustavo Gatti Casagrande — cap de 10%
};

/** LD Convidado configura itens e recebe somente o PDF validado, sem rotas comerciais. */
const commercialQuoteProcedure = protectedProcedure.use(({ ctx, next, type }) => {
  if (isCostDepartmentRole(ctx.user.role) && type === "mutation") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Departamento de Custos possui acesso somente leitura a orçamentos." });
  }
  if (!canAccessCommercialQuotes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "LD Convidado não possui acesso a orçamentos comerciais." });
  }
  return next({ ctx });
});

/** Bloqueia qualquer escrita operacional do Departamento de Custos. */
const nonCostDepartmentProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (isCostDepartmentRole(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Departamento de Custos possui acesso somente leitura." });
  }
  return next({ ctx });
});

type QuoteTeamFields = {
  createdByUserId?: number | null;
  duplicatedFromQuoteId?: number | null;
  seller1Id?: number | null;
  seller1Name?: string | null;
  seller2Id?: number | null;
  seller2Name?: string | null;
  assistantId?: number | null;
  assistantName?: string | null;
};

/**
 * Para vendedores e assistentes, os responsáveis do orçamento são derivados do
 * e-mail da sessão — nunca de um valor enviado pelo navegador. Em uma edição,
 * a equipe original é preservada; o audit log registra o editor.
 */
async function getIdentityBoundTeam(
  user: { id?: number | null; email?: string | null; role?: string | null },
  existing?: QuoteTeamFields,
): Promise<Partial<QuoteTeamFields>> {
  const email = user.email?.toLowerCase().trim();
  if (!email || !user.role) return {};
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });

  const canManageQuotes = user.id != null && await hasUserPermission(
    user.id,
    user.role,
    PERMISSIONS.GERENCIAR_ORCAMENTOS,
  );
  if (!shouldBindCommercialQuoteTeam(user.role, canManageQuotes)) {
    return {};
  }

  if (canEditOwnDuplicatedQuote(user.id, existing ?? {})) {
    return {};
  }

  if (user.role === "vendedor") {
    const seller = (await db.select({ id: sellers.id, name: sellers.name })
      .from(sellers).where(eq(sellers.email, email)).limit(1))[0];
    if (!seller) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Seu login não está vinculado a um vendedor cadastrado." });
    }
    if (existing) {
      if (existing.seller1Id !== seller.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Vendedores só podem alterar orçamentos criados em seu próprio nome." });
      }
      return {
        seller1Id: existing.seller1Id, seller1Name: existing.seller1Name,
        seller2Id: existing.seller2Id, seller2Name: existing.seller2Name,
        assistantId: existing.assistantId, assistantName: existing.assistantName,
      };
    }
    return {
      seller1Id: seller.id,
      seller1Name: seller.name,
      seller2Id: undefined,
      seller2Name: undefined,
      assistantId: undefined,
      assistantName: "VENDEDOR",
    };
  }

  if (user.role === "assistente") {
    const assistant = (await db.select({ id: assistants.id, name: assistants.name, allowedSellerId: assistants.allowedSellerId })
      .from(assistants).where(eq(assistants.email, email)).limit(1))[0];
    if (!assistant) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Seu login não está vinculado a um assistente cadastrado." });
    }
    if (existing) {
      if (existing.assistantId !== assistant.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Assistentes só podem alterar orçamentos registrados em seu próprio nome." });
      }
      return {
        seller1Id: existing.seller1Id, seller1Name: existing.seller1Name,
        seller2Id: existing.seller2Id, seller2Name: existing.seller2Name,
        assistantId: existing.assistantId, assistantName: existing.assistantName,
      };
    }
    const ownAssistant: Partial<QuoteTeamFields> = { assistantId: assistant.id, assistantName: assistant.name };
    if (assistant.allowedSellerId) {
      const seller = (await db.select({ id: sellers.id, name: sellers.name })
        .from(sellers).where(eq(sellers.id, assistant.allowedSellerId)).limit(1))[0];
      if (seller) {
        ownAssistant.seller1Id = seller.id;
        ownAssistant.seller1Name = seller.name;
        ownAssistant.seller2Id = undefined;
        ownAssistant.seller2Name = undefined;
      }
    }
    return ownAssistant;
  }

  return {};
}

/**
 * Verifica se o usuário logado pode editar/excluir um orçamento.
 * Usuários com a permissão gerenciar_orcamentos têm acesso irrestrito.
 * Demais usuários só podem editar orçamentos onde seu email está vinculado
 * como seller1, seller2 ou assistente.
 */
async function canEditQuote(
  userEmail: string | null | undefined,
  quote: { seller1Id?: number | null; seller2Id?: number | null; assistantId?: number | null; createdByUserId?: number | null; duplicatedFromQuoteId?: number | null },
  userRole?: string | null,
  userId?: number | null
): Promise<boolean> {
  if (!userEmail && !userId) return false;
  // Admins têm acesso total
  if (userRole === "admin") return true;
  // Usuários com permissão granular de gerenciamento têm acesso total
  if (userId && await hasUserPermission(userId, userRole, PERMISSIONS.GERENCIAR_ORCAMENTOS)) return true;
  if (canEditOwnDuplicatedQuote(userId, quote)) return true;
  if (!userEmail) return false;
  const email = userEmail.toLowerCase().trim();
  const db = await getDb();
  if (!db) return false;
  if (userRole === "vendedor" || userRole === "assistente") {
    const seller = quote.seller1Id
      ? await db.select({ email: sellers.email }).from(sellers).where(eq(sellers.id, quote.seller1Id)).limit(1)
      : [];
    const assistant = quote.assistantId
      ? await db.select({ email: assistants.email }).from(assistants).where(eq(assistants.id, quote.assistantId)).limit(1)
      : [];
    return commercialQuoteAccess(userRole, email, {
      seller1Email: seller[0]?.email,
      assistantEmail: assistant[0]?.email,
    }) ?? false;
  }
  // Usuários sem papel comercial só podem editar orçamentos que criaram.
  if (userId && quote.createdByUserId && userId === quote.createdByUserId) return true;
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
    me: publicProcedure.query(async (opts) => {
      if (!opts.ctx.user) return null;
      const permissions = await getEffectivePermissions(opts.ctx.user.id, opts.ctx.user.role);
      return { ...opts.ctx.user, permissions };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  userPreferences: router({
    quoteMetricVisibility: protectedProcedure.query(async ({ ctx }) => ({
      visibility: await getQuoteMetricVisibilityPreference(ctx.user.id),
    })),
    saveQuoteMetricVisibility: protectedProcedure
      .input(z.object({ visibility: z.record(z.string(), z.boolean()) }))
      .mutation(async ({ ctx, input }) => {
        await saveQuoteMetricVisibilityPreference(ctx.user.id, input.visibility);
        return { success: true };
      }),
  }),

  // Solicitações enviadas por LD Convidado não criam orçamento comercial até a revisão administrativa.
  ldRequests: router({
    submit: protectedProcedure
      .input(z.object({
        officeName: z.string().trim().min(2).max(256),
        finalClientName: z.string().trim().min(2).max(256),
        constructorName: z.string().trim().max(256).optional(),
        contactName: z.string().trim().min(2).max(256),
        contactPhone: z.string().trim().min(8).max(64),
        workState: z.string().trim().length(2).transform(value => value.toUpperCase()),
        workCity: z.string().trim().min(2).max(128),
        generalObservation: z.string().trim().max(4_000).optional(),
        desiredQuoteDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        estimatedDeliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        attachments: z.array(z.object({
          fileName: z.string().trim().min(1).max(256),
          mimeType: z.string().trim().min(1).max(128),
          size: z.number().int().positive(),
          base64: z.string().min(4),
        })).max(6).default([]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "convidado") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Este envio é exclusivo para LD Convidado." });
        }
        const deadlineError = getLdRequestDeadlineValidationError(input);
        if (deadlineError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: deadlineError });
        }
        const cart = await getCartItems(ctx.user.id);
        if (!cart.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Adicione ao menos um produto antes de enviar a solicitação." });
        }
        try {
          validateLdTechnicalAttachments(input.attachments as LdTechnicalAttachment[]);
        } catch (error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Anexos inválidos." });
        }
        const id = await createGuestQuoteRequest({
          guestUserId: ctx.user.id,
          guestName: ctx.user.name ?? "LD Convidado",
          guestEmail: ctx.user.email ?? null,
          contactName: input.contactName,
          contactPhone: input.contactPhone,
          officeName: input.officeName,
          finalClientName: input.finalClientName,
          constructorName: input.constructorName?.trim() || null,
          workState: input.workState,
          workCity: input.workCity,
          generalObservation: input.generalObservation?.trim() || null,
          desiredQuoteDate: input.desiredQuoteDate ?? null,
          estimatedDeliveryDate: input.estimatedDeliveryDate ?? null,
          itemsData: JSON.stringify(cart.map(item => ({ itemData: item.itemData, sortOrder: item.sortOrder }))),
        });
        await upsertLdGuestContactProfile({
          guestUserId: ctx.user.id,
          contactName: input.contactName,
          contactPhone: input.contactPhone,
        });
        const uploaded = await Promise.all(input.attachments.map(async (attachment, index) => {
          const fileName = sanitizeLdAttachmentFileName(attachment.fileName);
          const key = `ld-request-attachments/${ctx.user.id}/${id}/${Date.now()}-${index}-${fileName}`;
          const { key: storageKey, url } = await storagePut(key, Buffer.from(attachment.base64, "base64"), attachment.mimeType);
          return { requestId: id, fileName: attachment.fileName, storageKey, fileUrl: url, mimeType: attachment.mimeType, fileSize: attachment.size };
        }));
        await createGuestQuoteRequestAttachments(uploaded);
        await clearCart(ctx.user.id);
        await insertAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email ?? null,
          userName: ctx.user.name ?? null,
          action: "ld_quote_request_submitted",
          entityType: "guest_quote_request",
          entityId: id,
          details: JSON.stringify({ officeName: input.officeName, finalClientName: input.finalClientName, workState: input.workState, workCity: input.workCity, desiredQuoteDate: input.desiredQuoteDate ?? null, estimatedDeliveryDate: input.estimatedDeliveryDate ?? null, hasGeneralObservation: Boolean(input.generalObservation), attachmentCount: uploaded.length }),
        });
        return { id };
      }),

    contactDefaults: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "convidado") throw new TRPCError({ code: "FORBIDDEN" });
      return (await getLdGuestContactProfile(ctx.user.id)) ?? null;
    }),

    notifications: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === "admin") return { adminPendingCount: await countPendingGuestQuoteRequests(), guestReadyCount: 0 };
      if (ctx.user.role === "convidado") return { adminPendingCount: 0, guestReadyCount: await countGuestUnseenQuoteResponses(ctx.user.id) };
      return { adminPendingCount: 0, guestReadyCount: 0 };
    }),

    markResponseViewed: protectedProcedure.input(z.object({ requestId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "convidado") throw new TRPCError({ code: "FORBIDDEN" });
      await markGuestQuoteResponseViewed(ctx.user.id, input.requestId);
      return { success: true };
    }),

    deleteMine: protectedProcedure.input(z.object({ requestId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "convidado") throw new TRPCError({ code: "FORBIDDEN" });
      const deleted = await deleteGuestQuoteRequestForGuest(ctx.user.id, input.requestId);
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada." });
      await insertAuditLog({
        userId: ctx.user.id,
        userEmail: ctx.user.email ?? null,
        userName: ctx.user.name ?? null,
          action: "ld_quote_request_hidden_by_guest",
        entityType: "guest_quote_request",
        entityId: input.requestId,
        details: JSON.stringify({ requestNumber: deleted.requestNumber, adminQuoteId: deleted.adminQuoteId }),
      });
      return { success: true, requestId: input.requestId };
    }),

    mine: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "convidado") return [];
      const requests = await listGuestQuoteRequestsForGuest(ctx.user.id);
      return requests.map(request => ({
        id: request.id,
        officeName: request.officeName,
        finalClientName: request.finalClientName,
        constructorName: request.constructorName,
        contactName: request.contactName,
        contactPhone: request.contactPhone,
        workState: request.workState,
        workCity: request.workCity,
        status: request.status,
        adminQuoteId: request.adminQuoteId,
        submittedAt: request.submittedAt,
        pdfAvailable: request.status === "quote_ready" && Boolean(request.validatedPdfUrl),
        pdfSentAt: request.pdfSentAt,
      }));
    }),

    myPdf: protectedProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "convidado") throw new TRPCError({ code: "FORBIDDEN" });
        const request = await getGuestQuoteRequestById(input.requestId);
        if (!request || request.guestUserId !== ctx.user.id || request.guestDeletedAt || request.status !== "quote_ready" || !request.validatedPdfUrl) {
          throw new TRPCError({ code: "NOT_FOUND", message: "PDF ainda não está disponível." });
        }
        await markGuestQuoteResponseViewed(ctx.user.id, request.id);
        return { url: request.validatedPdfUrl };
      }),

    /** Dados do orçamento vinculado, restritos ao LD dono da solicitação, para
     * regenerar o PDF no layout vigente também em solicitações retroativas. */
    currentPdfData: protectedProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "convidado") throw new TRPCError({ code: "FORBIDDEN" });
        const request = await getGuestQuoteRequestById(input.requestId);
        if (!request || request.guestUserId !== ctx.user.id || request.guestDeletedAt || request.status !== "quote_ready" || !request.adminQuoteId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "PDF ainda não está disponível." });
        }
        const quoteData = await getQuoteById(request.adminQuoteId);
        if (!quoteData) throw new TRPCError({ code: "NOT_FOUND", message: "Orçamento vinculado não encontrado." });
        // O LD deve sempre visualizar a versão mais recente que o administrador salvou.
        // Ordenamos também aqui para manter a regra estável mesmo quando a origem dos dados
        // não preservar a ordenação esperada.
        const currentVersion = [...quoteData.versions]
          .sort((left, right) => Number(right.version) - Number(left.version)
            || String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? "")))[0];
        const versionItems = currentVersion
          ? quoteData.items.filter(item => item.quoteVersionId === currentVersion.id)
          : quoteData.items;
        // Registros antigos podem apontar currentVersion para uma revisão sem
        // itens persistidos. Nesse caso, o PDF atualizado deve usar os itens
        // existentes do orçamento, nunca forçar o LD a receber o arquivo legado.
        const currentItems = versionItems.length > 0 ? versionItems : quoteData.items;
        const sellerIds = [quoteData.quote.seller1Id, quoteData.quote.seller2Id].filter((id): id is number => Boolean(id));
        const sellerRows = sellerIds.length
          ? await (await getDb())?.select({ id: sellers.id, phone: sellers.phone, email: sellers.email }).from(sellers).where(inArray(sellers.id, sellerIds))
          : [];
        const sellerContactById = new Map((sellerRows ?? []).map(seller => [seller.id, seller]));
        await markGuestQuoteResponseViewed(ctx.user.id, request.id);
        return {
          requestId: request.id,
          quote: quoteData.quote,
          selectedVersion: currentVersion?.version ?? quoteData.quote.currentVersion,
          items: currentItems,
          seller1Contact: quoteData.quote.seller1Id ? sellerContactById.get(quoteData.quote.seller1Id) ?? null : null,
          seller2Contact: quoteData.quote.seller2Id ? sellerContactById.get(quoteData.quote.seller2Id) ?? null : null,
        };
      }),

    adminList: adminProcedure
      .input(z.object({ status: z.enum(["pending", "in_review", "quote_ready", "cancelled"]).optional() }).optional())
      .query(async ({ input }) => Promise.all((await listGuestQuoteRequests(input?.status)).map(async request => ({
        ...request,
        attachments: await listGuestQuoteRequestAttachments(request.id),
      })))),

    adminStartReview: adminProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const request = await getGuestQuoteRequestById(input.requestId);
        if (!request) throw new TRPCError({ code: "NOT_FOUND" });
        if (request.status === "pending") await markGuestQuoteRequestInReview(input.requestId, ctx.user.id);
        return { requestId: input.requestId };
      }),

    adminDelete: adminProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const deleted = await deleteGuestQuoteRequestForAdmin(input.requestId);
        if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada." });
        await insertAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email ?? null,
          userName: ctx.user.name ?? null,
          action: "ld_quote_request_admin_deleted",
          entityType: "guest_quote_request",
          entityId: input.requestId,
          details: JSON.stringify({ requestNumber: deleted.requestNumber, adminQuoteId: deleted.adminQuoteId }),
        });
        return { success: true, requestId: input.requestId };
      }),

    adminConvertToQuote: adminProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const request = await getGuestQuoteRequestById(input.requestId);
        if (!request) throw new TRPCError({ code: "NOT_FOUND" });
        if (request.adminQuoteId) return { quoteId: request.adminQuoteId, alreadyConverted: true };

        let snapshot: Array<{ itemData: string; sortOrder?: number }>;
        try { snapshot = JSON.parse(request.itemsData); } catch { throw new TRPCError({ code: "BAD_REQUEST", message: "Itens da solicitação inválidos." }); }
        const items = snapshot
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((item, index) => ({ itemNumber: index + 1, itemData: item.itemData }));
        const totalAmount = items.reduce((sum, item) => {
          try { return sum + (Number(JSON.parse(item.itemData).totalPrice) || 0); } catch { return sum; }
        }, 0);
        const ldConversion = buildLdQuoteConversion(request, totalAmount);
        const created = await createQuote({
          // A solicitação LD não define um número comercial. Registramos apenas
          // uma referência interna e aguardamos a escolha do vendedor e do número.
          quoteNumber: buildLdDraftQuoteNumber(request.requestNumber, request.id),
          clientName: ldConversion.clientName,
          clientContact: ldConversion.clientContact,
          clientPhone: ldConversion.clientPhone,
          clientEmail: ldConversion.clientEmail,
          projectName: ldConversion.projectName,
          lightDesigner: ldConversion.lightDesigner,
          freteType: ldConversion.freteType,
          notes: ldConversion.notes,
          totalAmount,
          totalFinal: ldConversion.totalFinal,
          destState: ldConversion.destState,
          freteState: ldConversion.freteState,
          freteCity: ldConversion.freteCity,
          freteLocalidade: ldConversion.freteLocalidade,
          difalEnabled: ldConversion.difalEnabled,
          difalPercent: ldConversion.difalPercent,
          fcpEnabled: ldConversion.fcpEnabled,
          fcpPercent: ldConversion.fcpPercent,
          difalValue: ldConversion.difalValue,
          fcpValue: ldConversion.fcpValue,
          items,
          createdByUserId: ctx.user.id,
        });
        await linkGuestQuoteRequestQuote(request.id, created.quoteId, ctx.user.id);
        await insertAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email ?? null,
          userName: ctx.user.name ?? null,
          action: "ld_quote_request_converted",
          entityType: "guest_quote_request",
          entityId: request.id,
          details: JSON.stringify({ quoteId: created.quoteId, quoteNumber: created.quoteNumber }),
        });
        return { quoteId: created.quoteId, quoteNumber: created.quoteNumber, alreadyConverted: false };
      }),

    adminAttachPdf: adminProcedure
      .input(z.object({
        requestId: z.number().int().positive(),
        pdfBase64: z.string().min(16),
        fileName: z.string().trim().min(1).max(180),
      }))
      .mutation(async ({ ctx, input }) => {
        const request = await getGuestQuoteRequestById(input.requestId);
        if (!request?.adminQuoteId) throw new TRPCError({ code: "BAD_REQUEST", message: "Converta a solicitação em orçamento antes de enviar o PDF." });
        const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const key = `ld-quotes/${request.guestUserId}/${request.id}/${Date.now()}-${safeName}`;
        const { url } = await storagePut(key, Buffer.from(input.pdfBase64, "base64"), "application/pdf");
        await attachGuestQuoteRequestPdf(request.id, url, ctx.user.id);
        return { url };
      }),
  }),



  alfalux: router({
    products: publicProcedure
      .input(z.object({ forceRefresh: z.boolean().optional() }).optional())
      .query(async ({ input }) => {
      const products = await fetchAllAlfaluxProducts(input?.forceRefresh === true);
      return products;
    }),
    refreshProducts: publicProcedure.mutation(async () => {
      try {
        invalidateAlfaluxCache();
        invalidateComponentesCache();
        const products = await fetchAllAlfaluxProducts(true);
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
      console.log(`[Componentes] Retornando ${items.length} itens, tipos: ${tipos.join(", ")}`);
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

    // Módulos SHIFT (S01) — retorna agrupados por nome único com CCTs disponíveis
    shiftModules: publicProcedure.query(async () => {
      const products = await fetchAllAlfaluxProducts();
      const s01 = products.filter(p => p.sku.startsWith("S01"));
      // Group by name (some have same SKU but different optics like 10° vs 48°)
      const grouped = new Map<string, {
        sku: string;
        name: string;
        fotoUrl: string | null;
        wattage: number | null;
        dimensions: string | null;
        availableCCTs: string[];
        driverCode: string | null;
        driverModel: string | null;
        lightSourcesByCct: Record<string, { description: string; code: string | null; type: string; quantity: number }>;
        technicalDrivers: Array<{ description: string; code: string | null; type: string; quantity: number }>;
        technicalDriversByControl: Partial<Record<"onoff" | "dim110v" | "dimDali" | "dimTriac110v" | "dimTriac220v", Array<{ description: string; code: string | null; type: string; quantity: number }>>>;
        apiOtherEquipments: Array<{ description: string; code: string | null; type: string; quantity: number }>;
        unitCost: number | null;
        markupPadrao: number | null;
        markupMinimo: number | null;
        unitPrice: number | null;
      }>();
      for (const p of s01) {
        const key = p.name; // Use full name as key (includes optics)
        if (!grouped.has(key)) {
          // Extract wattage from name (e.g. "7W", "8W")
          const wMatch = p.name.match(/(\d+)W/);
          // Extract dimensions from name (e.g. "303 X 36 X 33MM")
          const dimMatch = p.name.match(/\((.*?)\)/);
          const ccts = Array.from(new Set((p.temperaturasCor ?? [])
            .map(cct => String(cct).replace(/\s*K$/i, "").trim())
            .filter(Boolean)));
          const lightSourcesByCct = Object.fromEntries(ccts.flatMap(cct => {
            const suffix = cct.replace(/[^0-9]/g, "");
            const description = (p as any)[`ledModule${suffix}`] ?? p.ledModule ?? null;
            const code = (p as any)[`ledModuleEq${suffix}`]
              ?? (p as any)[`ledModuleCode${suffix}`]
              ?? p.ledModuleEq
              ?? null;
            const quantity = Number((p as any)[`ledModuleQtd${suffix}`] ?? p.ledModuleQtd ?? 1);
            return typeof description === "string" && description.trim()
              ? [[cct, { description: description.trim(), code, type: "MODULO_LED", quantity: Number.isFinite(quantity) && quantity >= 0 ? quantity : 1 }] as const]
              : [];
          }));
          const toDriver = (driver: { model?: string | null; code?: string | null } | null | undefined, quantity: unknown) => driver?.model
            ? [{
              description: driver.model,
              code: driver.code ?? null,
              type: "DRIVER",
              quantity: Number.isFinite(Number(quantity)) && Number(quantity) >= 0 ? Number(quantity) : 1,
            }]
            : [];
          const rawProduct = p as any;
          const technicalDriversByControl = {
            onoff: toDriver(p.driver220 ?? p.driverBivolt, p.driverQtd220 ?? p.driverQtdBivolt),
            dim110v: toDriver(p.driverDim110v, p.driverQtdDim110v),
            dimDali: toDriver(p.driverDimDali, p.driverQtdDimDali),
            dimTriac110v: toDriver(rawProduct.driverDimTriac110v, rawProduct.driverQtdDimTriac110v),
            dimTriac220v: toDriver(rawProduct.driverDimTriac220v, rawProduct.driverQtdDimTriac220v),
          };
          const technicalDrivers = technicalDriversByControl.onoff;
          const apiOtherEquipments = Array.isArray((p as any).outrosEquipamentos)
            ? (p as any).outrosEquipamentos.flatMap((equipment: Record<string, unknown>) => {
              const description = typeof equipment.descricao === "string"
                ? equipment.descricao
                : typeof equipment.modelo === "string" ? equipment.modelo : "";
              if (!description.trim()) return [];
              const quantity = Number(equipment.qtd ?? equipment.qty ?? equipment.quantidade ?? 1);
              return [{
                description: description.trim(),
                code: typeof equipment.codigo === "string" ? equipment.codigo : null,
                type: typeof equipment.tipo === "string" ? equipment.tipo : "EQUIPAMENTO",
                quantity: Number.isFinite(quantity) && quantity >= 0 ? quantity : 1,
              }];
            })
            : [];
          grouped.set(key, {
            sku: p.sku,
            name: p.name,
            fotoUrl: p.fotoUrl ?? null,
            wattage: wMatch ? parseInt(wMatch[1]) : null,
            dimensions: dimMatch ? dimMatch[1] : null,
            availableCCTs: ccts,
            driverCode: (p as any).driver220?.code ?? null,
            driverModel: (p as any).driver220?.model ?? null,
            lightSourcesByCct,
            technicalDrivers,
            technicalDriversByControl,
            apiOtherEquipments,
            unitCost: (p as any).custoCorpoOnoff220v ?? p.custoLuminaria ?? null,
            markupPadrao: (p as any).markupPadraoOnoff220v ?? null,
            markupMinimo: (p as any).markupMinimoOnoff220v ?? null,
            unitPrice: (() => {
              if (typeof p.precoOnOff220 === "number") return p.precoOnOff220;
              const cost = (p as any).custoCorpoOnoff220v ?? p.custoLuminaria ?? null;
              const markup = (p as any).markupPadraoOnoff220v ?? null;
              return typeof cost === "number" && typeof markup === "number"
                ? Math.round(cost * markup * 100) / 100
                : null;
            })(),
          });
        }
      }
      return Array.from(grouped.values());
    }),
  }),

  cart: router({
    add: nonCostDepartmentProcedure
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

    remove: nonCostDepartmentProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await removeCartItem(input.id, ctx.user.id);
        return { success: true };
      }),

    clear: nonCostDepartmentProcedure.mutation(async ({ ctx }) => {
      await clearCart(ctx.user.id);
      return { success: true };
    }),

    updateQty: nonCostDepartmentProcedure
      .input(z.object({ id: z.number(), qty: z.number().min(1) }))
      .mutation(async ({ ctx, input }) => {
        await updateCartItemQty(input.id, ctx.user.id, input.qty);
        return { success: true };
      }),

    reorder: nonCostDepartmentProcedure
      .input(z.object({ orderedIds: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        await updateCartItemsSortOrder(ctx.user.id, input.orderedIds);
        return { success: true };
      }),
    updateItemData: nonCostDepartmentProcedure
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
    specialItemPhoto: nonCostDepartmentProcedure
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
    save: commercialQuoteProcedure
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
        diluicaoValor: z.number().min(0).optional(),
        diluicaoDescricao: z.string().max(256).optional(),
        discountPercent: z.number().min(0).max(0.99).optional(),
        showDiscount: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const identityTeam = await getIdentityBoundTeam(ctx.user);
        const boundInput = { ...input, ...identityTeam };
        const saveInput = {
          ...boundInput,
          seller1Id: boundInput.seller1Id ?? undefined,
          seller1Name: boundInput.seller1Name ?? undefined,
          seller2Id: boundInput.seller2Id ?? undefined,
          seller2Name: boundInput.seller2Name ?? undefined,
          assistantId: boundInput.assistantId ?? undefined,
          assistantName: boundInput.assistantName ?? undefined,
        };
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
        // Verificar cap de comissão — gestores e admins ficam isentos
        // Gustavo tem cap de 10%; demais vendedores cap de 5% (soma das duas comissões)
        const userEmail = ctx.user.email?.toLowerCase().trim() ?? "";
        const isManagerUser = await hasUserPermission(
          ctx.user.id,
          ctx.user.role,
          PERMISSIONS.EDITAR_COMISSAO,
        );
        if (!isManagerUser) {
          const comm1 = input.commissionPercent ?? 0;
          const comm2 = input.commissionPercent2 ?? 0;
          // commissionPercent vem como valor 0-100 (%), commissionPercent2 como 0-1
          const comm1Pct = comm1 > 1 ? comm1 / 100 : comm1;
          const comm2Pct = comm2;
          const totalComm = comm1Pct + comm2Pct;
          // Verificar se o usuário logado é um vendedor com cap especial
          const specialCap = SPECIAL_COMMISSION_SELLERS[userEmail];
          // Verificar se o seller1 ou seller2 do orçamento tem cap especial (busca pelo email do seller no banco)
          const db = await getDb();
          let sellerSpecialCap = 0;
          if (db && (boundInput.seller1Id || boundInput.seller2Id)) {
            const sellerIds = [boundInput.seller1Id, boundInput.seller2Id].filter((id): id is number => typeof id === "number");
            if (sellerIds.length > 0) {
              const sellerRows = await db.select({ email: sellers.email })
                .from(sellers)
                .where(inArray(sellers.id, sellerIds));
              for (const s of sellerRows) {
                const cap = SPECIAL_COMMISSION_SELLERS[(s.email ?? "").toLowerCase()];
                if (cap && cap > sellerSpecialCap) sellerSpecialCap = cap;
              }
            }
          }
          const effectiveCap = Math.max(specialCap ?? 0, sellerSpecialCap, 0.05);
          if (totalComm > effectiveCap + 0.0001) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `A soma das comissões não pode ultrapassar ${(effectiveCap * 100).toFixed(0)}% (atual: ${(totalComm * 100).toFixed(1)}%).`,
            });
          }
        }
        // Validar permissão de desconto pelo controle granular do banco
        if (input.discountPercent && input.discountPercent > 0) {
          const discountAllowed = await hasUserPermission(
            ctx.user.id,
            ctx.user.role,
            PERMISSIONS.EDITAR_DESCONTOS,
          );
          if (!discountAllowed) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem permissão para aplicar desconto." });
          }
        }
        const result = await createQuote({ ...saveInput, createdByUserId: ctx.user.id });
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
            totalAmount: boundInput.totalAmount,
            itemCount: boundInput.items.length,
            seller1Id: saveInput.seller1Id,
            assistantId: saveInput.assistantId,
            identityBound: Object.keys(identityTeam).length > 0,
          }),
        });
        return result;
      }),

    addRevision: commercialQuoteProcedure
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
        diluicaoValor: z.number().min(0).optional(),
        diluicaoDescricao: z.string().max(256).optional(),
        discountPercent: z.number().min(0).max(0.99).optional(),
        showDiscount: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { quoteId, bumpVersion, ...rest } = input;
        // Verificar permissão de edição
        const existingForRevision = await getQuoteById(quoteId);
        if (!existingForRevision) throw new TRPCError({ code: "NOT_FOUND", message: "Orçamento não encontrado" });
        const linkedLdRequestForRevision = await getGuestQuoteRequestByAdminQuoteId(quoteId);
        const needsLdCommercialNumber = Boolean(linkedLdRequestForRevision) && (
          isLdDraftQuoteNumber(existingForRevision.quote.quoteNumber)
          || (!existingForRevision.quote.seller1Id && existingForRevision.quote.quoteNumber.startsWith("ORC-"))
        );
        if (needsLdCommercialNumber && (!input.seller1Id || !input.quoteNumber?.trim() || isLdDraftQuoteNumber(input.quoteNumber))) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selecione o vendedor e informe o número definitivo do orçamento antes de salvar uma solicitação LD.",
          });
        }
        const hasPermission = await canEditQuote(ctx.user.email, existingForRevision.quote, ctx.user.role, ctx.user.id);
        if (!hasPermission) throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem permissão para editar este orçamento." });
        const identityTeam = await getIdentityBoundTeam(ctx.user, existingForRevision.quote);
        const boundRest = { ...rest, ...identityTeam };
        const saveRevisionInput = {
          ...boundRest,
          seller1Id: boundRest.seller1Id ?? undefined,
          seller1Name: boundRest.seller1Name ?? undefined,
          seller2Id: boundRest.seller2Id ?? undefined,
          seller2Name: boundRest.seller2Name ?? undefined,
          assistantId: boundRest.assistantId ?? undefined,
          assistantName: boundRest.assistantName ?? undefined,
        };
        // Verificar cap de comissão — gestores e admins ficam isentos
        // Gustavo tem cap de 10%; demais vendedores cap de 5% (soma das duas comissões)
        const userEmailRev = ctx.user.email?.toLowerCase().trim() ?? "";
        const isManagerRev = await hasUserPermission(
          ctx.user.id,
          ctx.user.role,
          PERMISSIONS.EDITAR_COMISSAO,
        );
        if (!isManagerRev) {
          const comm1 = input.commissionPercent ?? 0;
          const comm2 = input.commissionPercent2 ?? 0;
          const comm1Pct = comm1 > 1 ? comm1 / 100 : comm1;
          const comm2Pct = comm2;
          const totalCommRev = comm1Pct + comm2Pct;
          const specialCapRev = SPECIAL_COMMISSION_SELLERS[userEmailRev];
          const dbRev = await getDb();
          let sellerSpecialCapRev = 0;
          if (dbRev && (boundRest.seller1Id || boundRest.seller2Id)) {
            const sellerIdsRev = [boundRest.seller1Id, boundRest.seller2Id].filter((id): id is number => typeof id === "number");
            if (sellerIdsRev.length > 0) {
              const sellerRowsRev = await dbRev.select({ email: sellers.email })
                .from(sellers)
                .where(inArray(sellers.id, sellerIdsRev));
              for (const s of sellerRowsRev) {
                const cap = SPECIAL_COMMISSION_SELLERS[(s.email ?? "").toLowerCase()];
                if (cap && cap > sellerSpecialCapRev) sellerSpecialCapRev = cap;
              }
            }
          }
          const effectiveCapRev = Math.max(specialCapRev ?? 0, sellerSpecialCapRev, 0.05);
          if (totalCommRev > effectiveCapRev + 0.0001) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `A soma das comissões não pode ultrapassar ${(effectiveCapRev * 100).toFixed(0)}% (atual: ${(totalCommRev * 100).toFixed(1)}%).`,
            });
          }
        }
        // Validar permissão de desconto — apenas DISCOUNT_EDITORS_EMAILS podem definir desconto
        if (input.discountPercent && input.discountPercent > 0) {
          const discountAllowed = await hasUserPermission(
            ctx.user.id,
            ctx.user.role,
            PERMISSIONS.EDITAR_DESCONTOS,
          );
          if (!discountAllowed) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem permissão para aplicar desconto." });
          }
        }
        // Garantir que 0 seja passado explicitamente (não undefined) para limpar RT/Margem
        const result = await addQuoteRevision(quoteId, {
          ...saveRevisionInput,
          rtPercent: input.rtPercent ?? 0,
          marginPercent: input.marginPercent ?? 0,
          discountPercent: input.discountPercent ?? 0,
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
            originalCreatedByUserId: existingForRevision.quote.createdByUserId,
            originalAssistantId: existingForRevision.quote.assistantId,
            originalAssistantName: existingForRevision.quote.assistantName,
            editorRole: ctx.user.role,
            identityBound: Object.keys(identityTeam).length > 0,
          }),
        });
        return result;
      }),

    list: commercialQuoteProcedure
      .input(z.object({
        search: z.string().optional(),
        status: z.enum(["open", "approved", "lost", "cancelled", "invoiced"]).optional(),
        seller1Name: z.string().optional(),
        assistantName: z.string().optional(),
        seller1Id: z.number().int().positive().optional(),
        assistantId: z.number().int().positive().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const canInvoiceAnyQuote = ctx.user.role === "admin"
          || await hasExplicitUserPermission(ctx.user.id, PERMISSIONS.FATURAR_ORCAMENTOS);
        // Assistentes com allowedSellerId só podem ver orçamentos do vendedor vinculado.
        // A responsável nominal de faturamento precisa localizar qualquer orçamento aprovado.
        if (!canInvoiceAnyQuote && ctx.user.role === 'assistente' && ctx.user.email) {
          const db = await getDb();
          if (db) {
            const assistantRow = await db
              .select({ allowedSellerId: assistants.allowedSellerId, name: assistants.name })
              .from(assistants)
              .where(and(eq(assistants.email, ctx.user.email), eq(assistants.active, true)))
              .limit(1);
            if (assistantRow[0]?.allowedSellerId) {
                // Forçar filtro pelo ID do vendedor vinculado, sem ambiguidade de nomes.
                const sellerRow = await db
                  .select({ id: sellers.id })
                .from(sellers)
                .where(eq(sellers.id, assistantRow[0].allowedSellerId))
                .limit(1);
              if (sellerRow[0]?.id) {
                return listQuotes({ ...input, seller1Id: sellerRow[0].id });
              }
            }
          }
        }
        return listQuotes(input);
      }),

    /** Marca ou remove a classificação de prospecção de lighting designer. */
    setProspecting: commercialQuoteProcedure
      .input(z.object({ id: z.number(), isProspecting: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const result = await getQuoteById(input.id);
        if (!result) throw new TRPCError({ code: 'NOT_FOUND', message: 'Orçamento não encontrado.' });
        const canEdit = await canEditQuote(ctx.user.email, result.quote, ctx.user.role, ctx.user.id);
        if (!canEdit) throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para alterar este orçamento.' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await db.update(quotes).set({ isProspecting: input.isProspecting }).where(eq(quotes.id, input.id));
        return { success: true };
      }),

    /** Usuário autorizado pode incluir ou retirar uma duplicidade manual sem alterar o orçamento original. */
    setManualDuplicate: protectedProcedure
      .input(z.object({ id: z.number(), isManuallyDuplicate: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const canMarkManualDuplicate = await hasUserPermission(
          ctx.user.id,
          ctx.user.role,
          PERMISSIONS.MARCAR_DUPLICADOS_MANUALMENTE,
        );
        if (!canMarkManualDuplicate) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para marcar duplicados manualmente.' });
        }
        const result = await getQuoteById(input.id);
        if (!result) throw new TRPCError({ code: 'NOT_FOUND', message: 'Orçamento não encontrado.' });
        if (input.isManuallyDuplicate && await getQuoteAutomaticDuplicateState(input.id)) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Este orçamento já é duplicado automaticamente e não pode receber marcação manual.',
          });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await db.update(quotes)
          .set({ isManuallyDuplicate: input.isManuallyDuplicate })
          .where(eq(quotes.id, input.id));
        return { success: true, isManuallyDuplicate: input.isManuallyDuplicate };
      }),

    duplicateState: commercialQuoteProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => ({ isAutomaticallyDuplicate: await getQuoteAutomaticDuplicateState(input.id) })),

    getById: commercialQuoteProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const result = await getQuoteById(input.id);
        if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Orçamento não encontrado" });
        const canInvoiceAnyQuote = ctx.user.role === "admin"
          || await hasExplicitUserPermission(ctx.user.id, PERMISSIONS.FATURAR_ORCAMENTOS);
        // Assistentes com allowedSellerId só podem ver orçamentos do vendedor vinculado
        if (!canInvoiceAnyQuote && ctx.user.role === 'assistente' && ctx.user.email) {
          const db = await getDb();
          if (db) {
            const assistantRow = await db
              .select({ allowedSellerId: assistants.allowedSellerId })
              .from(assistants)
              .where(and(eq(assistants.email, ctx.user.email), eq(assistants.active, true)))
              .limit(1);
            const allowedSellerId = assistantRow[0]?.allowedSellerId;
            if (allowedSellerId) {
              // Verificar se o orçamento pertence ao vendedor vinculado
              const isAllowed = result.quote.seller1Id === allowedSellerId || result.quote.seller2Id === allowedSellerId;
              if (!isAllowed) {
                throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado a este orçamento." });
              }
            }
          }
        }
        const canEdit = await canEditQuote(ctx.user.email, result.quote, ctx.user.role, ctx.user.id);
        // Permissão de comissão:
        // - Usuário com editar_comissao: vê e edita
        // - Vendedor que é seller1 ou seller2 do orçamento: vê (somente leitura)
        // - Demais (assistente, user, etc.): não vê
        const userEmail = (ctx.user.email ?? "").toLowerCase().trim();
        const canManageCommission = await hasUserPermission(
          ctx.user.id,
          ctx.user.role,
          PERMISSIONS.EDITAR_COMISSAO,
        );
        let canSeeCommission = canManageCommission;
        let canEditCommission = canManageCommission;
        if (!canManageCommission && ctx.user.role === "vendedor") {
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
        return { ...result, quote: quoteData, canEdit, canInvoice: canInvoiceAnyQuote, canSeeCommission, canEditCommission };
      }),

    approve: commercialQuoteProcedure
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

    duplicate: commercialQuoteProcedure
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
        const source = await getQuoteById(input.id);
        if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Orçamento não encontrado." });
        const canDuplicate = canDuplicateAnyCommercialQuote(ctx.user.role)
          || await canEditQuote(ctx.user.email, source.quote, ctx.user.role, ctx.user.id);
        if (!canDuplicate) throw new TRPCError({ code: "FORBIDDEN", message: "Você não possui permissão para duplicar este orçamento." });
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
          details: JSON.stringify({ newQuoteNumber: result.quoteNumber, duplicatedFromQuoteId: input.id }),
        });
        return result;
      }),
    updateStatus: commercialQuoteProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["open", "approved", "lost", "cancelled", "invoiced"]),
        quoteNumber: z.string().optional(),
        orderNumber: z.string().regex(/^\d{6}$/, "Número do pedido deve ter exatamente 6 dígitos").optional(),
        billingCompany: z.enum(["alfalux", "primelux", "decada", "primelase", "luminew"]).optional(),
        invoicedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de faturamento inválida").optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const qForStatus = await getQuoteById(input.id);
        if (!qForStatus) throw new TRPCError({ code: "NOT_FOUND", message: "Orçamento não encontrado" });
        const canInvoiceAnyQuote = ctx.user.role === "admin"
          || await hasExplicitUserPermission(ctx.user.id, PERMISSIONS.FATURAR_ORCAMENTOS);
        const canEditStatus = await canEditQuote(ctx.user.email, qForStatus.quote, ctx.user.role, ctx.user.id);
        const statusError = getQuoteStatusAuthorizationError({
          targetStatus: input.status,
          currentStatus: qForStatus.quote.status as "open" | "approved" | "lost" | "cancelled" | "invoiced",
          canEditStatus,
          canInvoiceAnyQuote,
        });
        if (statusError) {
          throw new TRPCError({
            code: input.status === "invoiced" && qForStatus.quote.status !== "approved" ? "BAD_REQUEST" : "FORBIDDEN",
            message: statusError,
          });
        }
        if (input.invoicedDate && input.status !== "invoiced") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "A data de faturamento só pode ser informada ao faturar o orçamento." });
        }
        await updateQuoteStatus(input.id, input.status, {
          orderNumber: input.orderNumber,
          billingCompany: input.billingCompany,
          invoicedDate: input.invoicedDate,
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
            invoicedDate: input.invoicedDate,
          }),
        });
        return { success: true };
      }),

    stats: commercialQuoteProcedure.query(async () => {
      return getQuoteStats();
    }),

    delete: commercialQuoteProcedure
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
    appendItems: commercialQuoteProcedure
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
          freteCity: quote.freteCity ?? undefined,
          freteIncluded: quote.freteIncluded ?? false,
          arquiteto: quote.arquiteto ?? undefined,
          lightDesigner: quote.lightDesigner ?? undefined,
          diluicaoValor: quote.diluicaoValor != null ? Number(quote.diluicaoValor) : undefined,
          diluicaoDescricao: quote.diluicaoDescricao ?? undefined,
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

    replaceItem: commercialQuoteProcedure
      .input(z.object({
        quoteId: z.number(),
        replaceIndex: z.number(), // 0-based index of the item to replace
        newItemData: z.string(), // JSON stringified CartItemData
        versionNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getQuoteById(input.quoteId);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Orçamento não encontrado" });
        const canReplace = await canEditQuote(ctx.user.email, existing.quote, ctx.user.role, ctx.user.id);
        if (!canReplace) throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem permissão para editar este orçamento." });
        const { quote, versions, items } = existing;
        const currentVersionId = versions[0]?.id;
        const currentItems = items
          .filter(i => i.quoteVersionId === currentVersionId)
          .map((i) => ({ itemNumber: i.itemNumber, itemData: i.itemData }));
        if (input.replaceIndex < 0 || input.replaceIndex >= currentItems.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Índice de item inválido" });
        }
        // Replace the item at the given index, keeping the same itemNumber
        const updatedItems = currentItems.map((it, idx) => {
          if (idx === input.replaceIndex) {
            return { itemNumber: it.itemNumber, itemData: input.newItemData };
          }
          return it;
        });
        const totalAmount = updatedItems.reduce((sum, it) => {
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
          freteCity: quote.freteCity ?? undefined,
          freteIncluded: quote.freteIncluded ?? false,
          arquiteto: quote.arquiteto ?? undefined,
          lightDesigner: quote.lightDesigner ?? undefined,
          diluicaoValor: quote.diluicaoValor != null ? Number(quote.diluicaoValor) : undefined,
          diluicaoDescricao: quote.diluicaoDescricao ?? undefined,
          notes: quote.notes ?? undefined,
          versionNotes: input.versionNotes ?? `Item #${input.replaceIndex + 1} substituído`,
          totalAmount,
          items: updatedItems,
          createdByUserId: ctx.user.id,
        }, false /* bumpVersion=false */);
        await insertAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          userName: ctx.user.name,
          action: "quote_revised",
          entityType: "quote",
          entityId: input.quoteId,
          details: JSON.stringify({ newVersion: result.version, replacedIndex: input.replaceIndex }),
        });
        return { ...result, quoteNumber: quote.quoteNumber };
      }),

    suggestNumber: commercialQuoteProcedure
      .input(z.object({ sellerId: z.number().optional() }))
      .query(async ({ input }) => {
        const suggested = await suggestQuoteNumber(input.sellerId);
        return { suggested };
      }),

    /** Verifica se um número de orçamento já está em uso */
    checkNumber: commercialQuoteProcedure
      .input(z.object({
        quoteNumber: z.string(),
        excludeQuoteId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const dup = await checkDuplicateQuoteNumber(input.quoteNumber, input.excludeQuoteId);
        return { exists: !!dup, existingQuote: dup ?? null };
      }),

    /** Reordena os itens da versão atual sem criar nova revisão */
    reorderItems: commercialQuoteProcedure
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
    getRevisionItems: commercialQuoteProcedure
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
    bumpRevision: commercialQuoteProcedure
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

    /** Define manualmente o revisionCount (permissão gerenciar_orcamentos) */
    setRevision: commercialQuoteProcedure
      .input(z.object({ id: z.number(), revisionCount: z.number().int().min(0) }))
      .mutation(async ({ ctx, input }) => {
        const canManageQuotes = await hasUserPermission(
          ctx.user.id,
          ctx.user.role,
          PERMISSIONS.GERENCIAR_ORCAMENTOS,
        );
        if (!canManageQuotes) throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem permissão para alterar a revisão manualmente." });
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
    logProductionSheet: commercialQuoteProcedure
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
    // Calcula custo real dos produtos buscando na API (para itens sem custoCorpoBase salvo)
    calculateCost: commercialQuoteProcedure
      .input(z.object({ quoteId: z.number() }))
      .query(async ({ input }) => {
        const result = await getQuoteById(input.quoteId);
        if (!result) return { custoProdutos: 0, temCusto: false, items: [] };
        const sourceTransfer = await getNonCommercialFinancialTransferBySourceQuoteId(input.quoteId);
        if (sourceTransfer) {
          const linkedQuote = await getQuoteById(sourceTransfer.linkedQuoteId);
          return {
            custoProdutos: 0,
            temCusto: true,
            items: [],
            transferredOut: {
              linkedQuoteId: sourceTransfer.linkedQuoteId,
              linkedQuoteNumber: linkedQuote?.quote.quoteNumber ?? null,
              linkType: sourceTransfer.linkType,
              cost: Number(sourceTransfer.cost ?? 0),
              revenue: Number(sourceTransfer.revenue ?? 0),
              transferredAt: sourceTransfer.transferredAt,
            },
          };
        }
        const activeItems = selectActiveQuoteItems(result.versions, result.items);
        const inboundTransfers = await getNonCommercialFinancialTransfersByTargetQuoteId(input.quoteId);

        const [products, { items: componentes }, acessorios, revendas] = await Promise.all([
          fetchAllAlfaluxProducts(),
          fetchComponentes(),
          fetchAcessoriosProducts(),
          fetchRevendaProducts(),
        ]);

        // Build maps for fast lookup
        const productBySku = new Map(products.map(p => [p.sku.toUpperCase(), p]));
        const componenteByCodigo = new Map(componentes.map(c => [c.codigo?.toUpperCase() ?? '', c]));
        // Mapa unificado de acessórios por código (EQ/CP) — campo 'custo' é o custo real
        const acessorioByCodigo = new Map(acessorios.filter(a => a.codigo).map(a => [a.codigo!.toUpperCase(), a]));
        // Também indexar por SKU do acessório (alguns itens podem ter sido salvos com o SKU em vez do código)
        const acessorioBySku = new Map(acessorios.filter(a => a.sku).map(a => [a.sku!.toUpperCase(), a]));
        const revendaBySku = new Map(revendas.map(item => [item.codigo.toUpperCase(), item]));

        // Margem do orçamento para estimar custo de itens especiais
        const marginPercent = Number(result.quote.marginPercent ?? 0.10);

        let totalCusto = 0;
        let temCusto = false;
        const itemDetails: Array<{ itemNumber: number; sku: string; custoCorpo: number; custoDriver: number; qty: number; driverQty: number; subtotal: number; source: string }> = [];

        for (const row of activeItems) {
          try {
            const data = typeof row.itemData === 'string' ? JSON.parse(row.itemData) : row.itemData;
            const sku = (data.sku ?? '').toUpperCase();
            const qty = Number(data.qty ?? 1);

            // Uma edição manual é deliberada e deve prevalecer sobre qualquer
            // valor calculado, mantendo o dashboard da revisão ativa sincronizado.
            const custoManual = getManualUnitCost(data.custoManual);
            if (custoManual > 0) {
              const subtotal = custoManual * qty;
              totalCusto += subtotal;
              temCusto = true;
              itemDetails.push({ itemNumber: row.itemNumber, sku, custoCorpo: custoManual, custoDriver: 0, qty, driverQty: 0, subtotal, source: 'manual' });
              continue;
            }

            // Item Especial: usar custoManual se preenchido, senão estimar pela margem
            if (data.isSpecialItem || data.category === 'Item Especial' || data.category === 'especial') {
              // Estimar custo pela margem média: precoVenda / (1 + margem)
              const totalPrice = Number(data.totalPrice ?? 0);
              if (totalPrice > 0 && marginPercent > 0) {
                const custoEstimado = totalPrice / (1 + marginPercent);
                totalCusto += custoEstimado;
                temCusto = true;
                itemDetails.push({ itemNumber: row.itemNumber, sku, custoCorpo: custoEstimado / qty, custoDriver: 0, qty, driverQty: 0, subtotal: custoEstimado, source: 'especial_estimado' });
              } else {
                itemDetails.push({ itemNumber: row.itemNumber, sku, custoCorpo: 0, custoDriver: 0, qty, driverQty: 0, subtotal: 0, source: 'especial_sem_preco' });
              }
              continue;
            }

            // ── PERFIS MODULARES: cada segmento tem seu próprio SKU com custo individual ──
            if (Array.isArray(data.profileSegments) && data.profileSegments.length > 0) {
              let custoCorpoTotal = 0;
              let custoDriverTotal = 0;
              let totalDriverQty = 0;
              let allFound = false;

              // Determinar tipo de controle pelo driverCode do primeiro segmento
              const firstDriverCode = (data.profileSegments[0].driverCode ?? '').toUpperCase();

              // Buscar custo de cada módulo/segmento individualmente na API
              for (const seg of data.profileSegments) {
                const segSku = (seg.sku ?? '').toUpperCase();
                const segQty = Number(seg.qty ?? 1);
                const segDriverQtyPerPiece = Number(seg.driverQtyPerPiece ?? 0);

                // Buscar o produto do módulo na API pelo SKU do segmento
                const segProduct = productBySku.get(segSku);
                if (segProduct) {
                  // Determinar custo do corpo baseado no tipo de controle
                  let segCusto = 0;
                  if (firstDriverCode && segProduct.driver220?.code?.toUpperCase() === firstDriverCode) {
                    segCusto = Number(segProduct.custoCorpoOnoff220v ?? segProduct.custoLuminaria ?? 0);
                  } else if (firstDriverCode && segProduct.driverBivolt?.code?.toUpperCase() === firstDriverCode) {
                    segCusto = Number(segProduct.custoCorpoOnoffBivolt ?? segProduct.custoLuminaria ?? 0);
                  } else if (firstDriverCode && segProduct.driverDimDali?.code?.toUpperCase() === firstDriverCode) {
                    segCusto = Number(segProduct.custoCorpoDimDali ?? segProduct.custoLuminaria ?? 0);
                  } else if (firstDriverCode && segProduct.driverDim110v?.code?.toUpperCase() === firstDriverCode) {
                    segCusto = Number(segProduct.custoCorpoDim110v ?? segProduct.custoLuminaria ?? 0);
                  } else if (firstDriverCode && segProduct.driverDimTriac110v?.code?.toUpperCase() === firstDriverCode) {
                    segCusto = Number(segProduct.custoCorpoDimTriac110v ?? segProduct.custoLuminaria ?? 0);
                  } else if (firstDriverCode && segProduct.driverDimTriac220v?.code?.toUpperCase() === firstDriverCode) {
                    segCusto = Number(segProduct.custoCorpoDimTriac220v ?? segProduct.custoLuminaria ?? 0);
                  } else {
                    // Fallback: usar custoCorpoOnoff220v (padrão)
                    segCusto = Number(segProduct.custoCorpoOnoff220v ?? segProduct.custoLuminaria ?? 0);
                  }
                  custoCorpoTotal += segCusto * segQty;
                  if (segCusto > 0) allFound = true;
                }

                // Somar drivers deste segmento
                totalDriverQty += segDriverQtyPerPiece * segQty;
              }

              // Buscar custo do driver (usar primeiro segmento como referência)
              let custoDriverUnit = 0;
              if (firstDriverCode) {
                // Tentar buscar do primeiro produto de segmento que tenha o driver
                for (const seg of data.profileSegments) {
                  const segProduct = productBySku.get((seg.sku ?? '').toUpperCase());
                  if (!segProduct) continue;
                  if (segProduct.driver220?.code?.toUpperCase() === firstDriverCode) {
                    custoDriverUnit = Number(segProduct.custoDriver220 ?? 0); break;
                  } else if (segProduct.driverBivolt?.code?.toUpperCase() === firstDriverCode) {
                    custoDriverUnit = Number(segProduct.custoDriverBivolt ?? 0); break;
                  } else if (segProduct.driverDimDali?.code?.toUpperCase() === firstDriverCode) {
                    custoDriverUnit = Number(segProduct.custoDriverDimDali ?? 0); break;
                  } else if (segProduct.driverDim110v?.code?.toUpperCase() === firstDriverCode) {
                    custoDriverUnit = Number(segProduct.custoDriverDim110v ?? 0); break;
                  } else if (segProduct.driverDimTriac110v?.code?.toUpperCase() === firstDriverCode) {
                    custoDriverUnit = Number(segProduct.custoDriverDimTriac110v ?? 0); break;
                  } else if (segProduct.driverDimTriac220v?.code?.toUpperCase() === firstDriverCode) {
                    custoDriverUnit = Number(segProduct.custoDriverDimTriac220v ?? 0); break;
                  }
                }
                // Fallback: buscar no componentes ou acessórios
                if (custoDriverUnit === 0) {
                  const comp = componenteByCodigo.get(firstDriverCode);
                  if (comp?.custoDriver) {
                    custoDriverUnit = Number(comp.custoDriver);
                  } else {
                    const acess = acessorioByCodigo.get(firstDriverCode);
                    if (acess?.custo) custoDriverUnit = Number(acess.custo);
                  }
                }
              }

              // Também considerar driverLines se existirem (podem ter drivers diferentes)
              let driverQtyFinal = totalDriverQty * qty;
              if (Array.isArray(data.driverLines) && data.driverLines.length > 0) {
                // Se tem driverLines explícitas, usar elas para quantidade e custo
                driverQtyFinal = data.driverLines.reduce((s: number, d: any) => s + Number(d.driverQty ?? 0), 0);
                // Se o driverCode das driverLines é diferente, buscar custo específico
                const dlCode = (data.driverLines[0].driverCode ?? '').toUpperCase();
                if (dlCode && dlCode !== firstDriverCode) {
                  const comp = componenteByCodigo.get(dlCode);
                  if (comp?.custoDriver) {
                    custoDriverUnit = Number(comp.custoDriver);
                  } else {
                    const acess = acessorioByCodigo.get(dlCode);
                    if (acess?.custo) custoDriverUnit = Number(acess.custo);
                  }
                }
              }

              custoDriverTotal = custoDriverUnit * driverQtyFinal;
              const subtotal = custoCorpoTotal * qty + custoDriverTotal;

              if (allFound) {
                totalCusto += subtotal;
                temCusto = true;
                itemDetails.push({ itemNumber: row.itemNumber, sku, custoCorpo: custoCorpoTotal, custoDriver: custoDriverUnit, qty, driverQty: driverQtyFinal, subtotal, source: 'api_perfil' });
              } else {
                itemDetails.push({ itemNumber: row.itemNumber, sku, custoCorpo: 0, custoDriver: 0, qty, driverQty: 0, subtotal: 0, source: 'perfil_sem_custo' });
              }
              continue;
            }

            // ── SEMPRE buscar custo na API pelo SKU (tempo real) ──
            const revenda = revendaBySku.get(sku);
            const custoRevenda = Number(revenda?.custo ?? 0);
            if (custoRevenda > 0) {
              const subtotal = custoRevenda * qty;
              totalCusto += subtotal;
              temCusto = true;
              itemDetails.push({ itemNumber: row.itemNumber, sku, custoCorpo: custoRevenda, custoDriver: 0, qty, driverQty: 0, subtotal, source: 'api_revenda' });
              continue;
            }
            const product = selectApiProductForQuoteItem(products, sku, data.description);
            if (!product) {
              // Tentar buscar como componente pelo código EQ/CP na API de componentes
              const comp = componenteByCodigo.get(sku);
              if (comp && (comp.custoDriver ?? 0) > 0) {
                const custoUnit = Number(comp.custoDriver ?? 0);
                const subtotal = custoUnit * qty;
                totalCusto += subtotal;
                temCusto = true;
                itemDetails.push({ itemNumber: row.itemNumber, sku, custoCorpo: custoUnit, custoDriver: 0, qty, driverQty: 0, subtotal, source: 'componente' });
                continue;
              }
              // Tentar buscar na API de acessórios pelo código EQ/CP ou SKU
              const acess = acessorioByCodigo.get(sku) ?? acessorioBySku.get(sku);
              if (acess && (acess.custo ?? 0) > 0) {
                const custoUnit = Number(acess.custo!);
                const subtotal = custoUnit * qty;
                totalCusto += subtotal;
                temCusto = true;
                itemDetails.push({ itemNumber: row.itemNumber, sku, custoCorpo: custoUnit, custoDriver: 0, qty, driverQty: 0, subtotal, source: 'acessorio' });
                continue;
              }
              // Não encontrado em nenhuma API — tentar estimar pela margem
              const totalPrice = Number(data.totalPrice ?? 0);
              if (totalPrice > 0 && marginPercent > 0) {
                const custoEstimado = totalPrice / (1 + marginPercent);
                totalCusto += custoEstimado;
                temCusto = true;
                itemDetails.push({ itemNumber: row.itemNumber, sku, custoCorpo: custoEstimado / qty, custoDriver: 0, qty, driverQty: 0, subtotal: custoEstimado, source: 'estimado_margem' });
              } else {
                itemDetails.push({ itemNumber: row.itemNumber, sku, custoCorpo: 0, custoDriver: 0, qty, driverQty: 0, subtotal: 0, source: 'nao_encontrado' });
              }
              continue;
            }

            // Determinar tipo de controle pelo driverCode do item
            let driverCode = '';
            if (Array.isArray(data.driverLines) && data.driverLines.length > 0) {
              driverCode = (data.driverLines[0].driverCode ?? '').toUpperCase();
            }

            // Identificar qual campo de custo usar baseado no driver
            let custoCorpo = 0;
            let custoDriver = 0;
            if (driverCode && product.driver220?.code?.toUpperCase() === driverCode) {
              custoCorpo = Number(product.custoCorpoOnoff220v ?? product.custoLuminaria ?? 0);
              custoDriver = Number(product.custoDriver220 ?? 0);
            } else if (driverCode && product.driverBivolt?.code?.toUpperCase() === driverCode) {
              custoCorpo = Number(product.custoCorpoOnoffBivolt ?? product.custoLuminaria ?? 0);
              custoDriver = Number(product.custoDriverBivolt ?? 0);
            } else if (driverCode && product.driverDim110v?.code?.toUpperCase() === driverCode) {
              custoCorpo = Number(product.custoCorpoDim110v ?? product.custoLuminaria ?? 0);
              custoDriver = Number(product.custoDriverDim110v ?? 0);
            } else if (driverCode && product.driverDimDali?.code?.toUpperCase() === driverCode) {
              custoCorpo = Number(product.custoCorpoDimDali ?? product.custoLuminaria ?? 0);
              custoDriver = Number(product.custoDriverDimDali ?? 0);
            } else if (driverCode && product.driverDimTriac110v?.code?.toUpperCase() === driverCode) {
              custoCorpo = Number(product.custoCorpoDimTriac110v ?? product.custoLuminaria ?? 0);
              custoDriver = Number(product.custoDriverDimTriac110v ?? 0);
            } else if (driverCode && product.driverDimTriac220v?.code?.toUpperCase() === driverCode) {
              custoCorpo = Number(product.custoCorpoDimTriac220v ?? product.custoLuminaria ?? 0);
              custoDriver = Number(product.custoDriverDimTriac220v ?? 0);
            } else {
              // Fallback: usar custoLuminaria genérico ou custoCorpoOnoff220v
              custoCorpo = Number(product.custoCorpoOnoff220v ?? product.custoLuminaria ?? 0);
              custoDriver = Number(product.custoDriver220 ?? 0);
              // Se não tem custo na API, tentar buscar o driver no componentes ou acessórios
              if (custoDriver === 0 && driverCode) {
                const comp = componenteByCodigo.get(driverCode);
                if (comp?.custoDriver) {
                  custoDriver = Number(comp.custoDriver);
                } else {
                  const acess = acessorioByCodigo.get(driverCode);
                  if (acess?.custo) custoDriver = Number(acess.custo);
                }
              }
            }

            // Calcular quantidade de drivers
            let driverQty = 0;
            if (Array.isArray(data.driverLines) && data.driverLines.length > 0) {
              driverQty = data.driverLines.reduce((s: number, d: any) => s + Number(d.driverQty ?? 0), 0);
            } else if (data.driverQtyPerUnit) {
              driverQty = Number(data.driverQtyPerUnit) * qty;
            } else {
              // Tentar inferir da API (driverQtd220, etc.)
              const driverQtdPerUnit = Number(product.driverQtd220 ?? product.driverQtdBivolt ?? 1);
              driverQty = driverQtdPerUnit * qty;
            }

            if (custoCorpo > 0) {
              const comprimentoMm = Number(data.ledBarComprimentoTotalMm ?? 0);
              const calculatedCost = calculateDashboardProductCost({
                category: data.category,
                bodyCost: custoCorpo,
                driverCost: custoDriver,
                qty,
                driverQty,
                lengthMm: comprimentoMm,
              });
              totalCusto += calculatedCost.subtotal;
              temCusto = true;
              itemDetails.push({ itemNumber: row.itemNumber, sku, custoCorpo: calculatedCost.custoCorpo, custoDriver: calculatedCost.custoDriver, qty, driverQty, subtotal: calculatedCost.subtotal, source: data.category === 'BAGEO' ? 'api_bageo_corpo' : 'api' });
            } else {
              itemDetails.push({ itemNumber: row.itemNumber, sku, custoCorpo: 0, custoDriver: 0, qty, driverQty: 0, subtotal: 0, source: 'sem_custo_api' });
            }
          } catch {
            // Item com itemData inválido
          }
        }

        const transferredCost = inboundTransfers.reduce((sum, transfer) => sum + Number(transfer.cost ?? 0), 0);
        if (transferredCost > 0) {
          totalCusto += transferredCost;
          temCusto = true;
          for (const transfer of inboundTransfers) {
            itemDetails.push({
              itemNumber: -Number(transfer.linkId),
              sku: "AMOSTRA/MANUTENÇÃO",
              custoCorpo: Number(transfer.cost ?? 0),
              custoDriver: 0,
              qty: 1,
              driverQty: 0,
              subtotal: Number(transfer.cost ?? 0),
              source: `transferido_${transfer.linkType}_${transfer.sourceQuoteNumber}`,
            });
          }
        }
        return { custoProdutos: totalCusto, temCusto, items: itemDetails, transferredCost, inboundTransfers };
      }),
    setCustoManual: protectedProcedure
      .input(z.object({ quoteId: z.number(), itemNumber: z.number(), custoManual: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!canAccessCommercialQuotes(ctx.user.role)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'LD Convidado não possui acesso a custos de orçamento.' });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });
        // Buscar somente o item da revisão ativa — revisões históricas não podem
        // receber uma edição que o dashboard atual não consegue enxergar.
        const quoteResult = await getQuoteById(input.quoteId);
        if (!quoteResult) throw new TRPCError({ code: 'NOT_FOUND', message: 'Orçamento não encontrado' });
        const activeVersionId = getActiveQuoteVersionId(quoteResult.versions);
        if (activeVersionId == null) throw new TRPCError({ code: 'NOT_FOUND', message: 'Revisão ativa não encontrada' });
        const [item] = await db.select().from(quoteItems)
          .where(and(
            eq(quoteItems.quoteId, input.quoteId),
            eq(quoteItems.quoteVersionId, activeVersionId),
            eq(quoteItems.itemNumber, input.itemNumber),
          ))
          .limit(1);
        if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: 'Item não encontrado' });
        // Atualizar itemData com custoManual
        const data = typeof item.itemData === 'string' ? JSON.parse(item.itemData) : (item.itemData ?? {});
        if (isCostDepartmentRole(ctx.user.role) && !isSpecialItemWithoutRegisteredCost(data)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'O Departamento de Custos só pode informar custo em item especial sem custo registrado.' });
        }
        data.custoManual = input.custoManual;
        await db.update(quoteItems)
          .set({ itemData: JSON.stringify(data) })
          .where(and(eq(quoteItems.quoteId, input.quoteId), eq(quoteItems.itemNumber, input.itemNumber)));
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
    create: nonCostDepartmentProcedure
      .input(z.object({
        quoteId: z.number(),
        empresa: z.enum(['ALFALUX', 'LUMINEW']).default('ALFALUX'),
        deliveryDays: z.number().optional(),
        notes: z.string().optional(),
        parentOrderId: z.number().optional(),
        subOrderIndex: z.number().optional(),
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
          parentOrderId: input.parentOrderId,
          subOrderIndex: input.subOrderIndex,
          createdByUserId: ctx.user.id,
          items: input.items,
        });
        return { id: orderId };
      }),

    /** Lista subpedidos de um pedido pai */
    listSubOrders: protectedProcedure
      .input(z.object({ parentOrderId: z.number() }))
      .query(async ({ input }) => {
        return getSubOrders(input.parentOrderId);
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
    update: nonCostDepartmentProcedure
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
    addItem: nonCostDepartmentProcedure
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
    updateItem: nonCostDepartmentProcedure
      .input(z.object({
        itemId: z.number(),
        itemData: z.string(),
      }))
      .mutation(async ({ input }) => {
        await updateFactoryOrderItem(input.itemId, input.itemData);
        return { success: true };
      }),

    /** Remove um item do pedido */
    removeItem: nonCostDepartmentProcedure
      .input(z.object({ itemId: z.number() }))
      .mutation(async ({ input }) => {
        await deleteFactoryOrderItem(input.itemId);
        return { success: true };
      }),

    /** Remove um pedido de fábrica completo (com itens e subpedidos) */
    deleteOrder: nonCostDepartmentProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteFactoryOrder(input.id);
        return { success: true };
      }),

    /** Cria nova revisão clonando o pedido atual */
    createRevision: nonCostDepartmentProcedure
      .input(z.object({ sourceOrderId: z.number() }))
      .mutation(async ({ input }) => {
        const newOrderId = await createFactoryOrderRevision(input.sourceOrderId);
        return { id: newOrderId };
      }),

    /** Salva um Excel gerado no S3 e registra no histórico */
    saveExcel: nonCostDepartmentProcedure
      .input(z.object({
        factoryOrderId: z.number(),
        orderNumber: z.string().regex(/^\d{6}(-\d+)?$/, 'Número do pedido deve ter 6 dígitos (opcionalmente seguido de -N para subpedido)'),
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
        const canViewDashboard = await hasUserPermission(
          ctx.user.id,
          ctx.user.role,
          PERMISSIONS.VER_DASHBOARD,
        );
        if (!canViewDashboard) throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para acessar o dashboard gerencial.' });
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
    /** Upsert de meta (usuário com permissão editar_metas) */
    upsertGoal: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().nullable(),
        goalAmount: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const canEditGoals = await hasUserPermission(
          ctx.user.id,
          ctx.user.role,
          PERMISSIONS.EDITAR_METAS,
        );
        if (!canEditGoals) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para editar metas.' });
        }
        const id = await upsertSalesGoal({
          year: input.year,
          month: input.month,
          goalAmount: input.goalAmount,
          setByUserId: ctx.user.id,
        });
        return { id };
      }),
    /** Faturamentos efetivamente realizados, informados por mês. */
    billings: protectedProcedure
      .input(z.object({ year: z.number() }))
      .query(async ({ ctx, input }) => {
        const canViewDashboard = await hasUserPermission(ctx.user.id, ctx.user.role, PERMISSIONS.VER_DASHBOARD);
        if (!canViewDashboard) throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado.' });
        return getMonthlyBillingsByYear(input.year);
      }),
    /** Upsert de faturamento manual, protegido pela mesma permissão das metas. */
    upsertBilling: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number().int().min(1).max(12), amount: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const canEditGoals = await hasUserPermission(ctx.user.id, ctx.user.role, PERMISSIONS.EDITAR_METAS);
        if (!canEditGoals) throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para informar faturamento.' });
        const amount = Number(input.amount.replace(',', '.'));
        if (!Number.isFinite(amount) || amount < 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Informe um valor de faturamento válido.' });
        const id = await upsertMonthlyBilling({ year: input.year, month: input.month, amount: String(amount), setByUserId: ctx.user.id });
        return { id };
      }),
    /** Atualiza role de um usuário (somente admin) */
    updateUserRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(['user', 'admin', 'gerente', 'vendedor', 'assistente', 'convidado', 'custos']),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { users } = await import('../drizzle/schema');
        await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
        return { success: true };
      }),
    /** Atualiza o nome exibido de um usuário (somente admin). */
    updateUserName: adminProcedure
      .input(z.object({ userId: z.number(), name: z.string().trim().min(1).max(256) }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { users } = await import('../drizzle/schema');
        await db.update(users).set({ name: input.name }).where(eq(users.id, input.userId));
        return { success: true };
      }),
    /** Criar usuário manualmente (com senha) — admin only */
    createUser: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(4),
        role: z.enum(['user', 'admin', 'gerente', 'vendedor', 'assistente', 'convidado', 'custos']).default('convidado'),
      }))
      .mutation(async ({ ctx, input }) => {
        const authorizationError = getUserCreationRoleAuthorizationError(ctx.user.email, input.role);
        if (authorizationError) {
          throw new TRPCError({ code: 'FORBIDDEN', message: authorizationError });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { users } = await import('../drizzle/schema');
        const bcrypt = await import('bcryptjs');
        // Verificar se e-mail já existe
        const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email.toLowerCase().trim())).limit(1);
        if (existing.length > 0) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Já existe um usuário com este e-mail.' });
        }
        const passwordHash = await bcrypt.hash(input.password, 10);
        // Gerar openId único para usuários com senha (prefixo "pwd_")
        const openId = `pwd_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        await db.insert(users).values({
          openId,
          name: input.name,
          email: input.email.toLowerCase().trim(),
          role: input.role,
          passwordHash,
          loginMethod: 'password',
        });
        return { success: true };
      }),
    /** Atualizar senha de um usuário — admin only */
    updateUserPassword: adminProcedure
      .input(z.object({
        userId: z.number(),
        password: z.string().min(4),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { users } = await import('../drizzle/schema');
        const bcrypt = await import('bcryptjs');
        const passwordHash = await bcrypt.hash(input.password, 10);
        await db.update(users).set({ passwordHash }).where(eq(users.id, input.userId));
        return { success: true };
      }),
    /** Excluir usuário — admin only */
    deleteUser: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { users } = await import('../drizzle/schema');
        await db.delete(users).where(eq(users.id, input.userId));
        return { success: true };
      }),
    /** Listar permissões de um usuário — admin only */
    getUserPermissions: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const { userPermissions } = await import('../drizzle/schema');
        const rows = await db.select({ permission: userPermissions.permission })
          .from(userPermissions)
          .where(eq(userPermissions.userId, input.userId));
        return rows.map(r => r.permission);
      }),
    /** Listar permissões de TODOS os usuários — admin only */
    getAllPermissions: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const { userPermissions } = await import('../drizzle/schema');
      return db.select({
        userId: userPermissions.userId,
        permission: userPermissions.permission,
      }).from(userPermissions);
    }),
    /** Atribuir permissão a um usuário — admin only */
    grantPermission: adminProcedure
      .input(z.object({ userId: z.number(), permission: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { userPermissions } = await import('../drizzle/schema');
        // Upsert: ignore if already exists
        await db.insert(userPermissions).values({
          userId: input.userId,
          permission: input.permission,
        }).onDuplicateKeyUpdate({ set: { permission: input.permission } });
        return { success: true };
      }),
    /** Revogar permissão de um usuário — admin only */
    revokePermission: adminProcedure
      .input(z.object({ userId: z.number(), permission: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { userPermissions } = await import('../drizzle/schema');
        const { and } = await import('drizzle-orm');
        await db.delete(userPermissions).where(
          and(eq(userPermissions.userId, input.userId), eq(userPermissions.permission, input.permission))
        );
        return { success: true };
      }),
    /** Relatório mensal de vendas com comissões (permissão ver_dashboard) */
    monthlyReport: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ ctx, input }) => {
        const canViewDashboard = await hasUserPermission(
          ctx.user.id,
          ctx.user.role,
          PERMISSIONS.VER_DASHBOARD,
        );
        if (!canViewDashboard) throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para acessar este relatório.' });
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
      const rows = await db.select().from(backups).orderBy(desc(backups.createdAt), desc(backups.id)).limit(100);
      return rows;
    }),

    runNow: adminProcedure.mutation(async () => {
      try {
        return await generateAndStoreCompleteBackup({ trigger: "manual" });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Não foi possível gerar o backup: ${message}`,
        });
      }
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

            let discPct = 0;
            try {
              const snap2 = JSON.parse(v.headerSnapshot) as any;
              discPct = snap2.discountPercent ? parseFloat(String(snap2.discountPercent)) : 0;
            } catch {}
            const totalComRT = rtPct > 0 ? newTotalBase / (1 - rtPct) : newTotalBase;
            const totalComMargem = marginPct > 0 ? totalComRT / (1 - marginPct) : totalComRT;
            const totalFinalCalc = discPct > 0 ? totalComMargem * (1 - discPct) : totalComMargem;

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
          let discPctQ = 0;
          try {
            const snap2 = JSON.parse(latestVersion.headerSnapshot) as any;
            discPctQ = snap2.discountPercent ? parseFloat(String(snap2.discountPercent)) : 0;
          } catch {}
          const totalComRTQ = rtPctQ > 0 ? newTotalBaseLatest / (1 - rtPctQ) : newTotalBaseLatest;
          const totalComMargemQ = marginPctQ > 0 ? totalComRTQ / (1 - marginPctQ) : totalComRTQ;
          const totalFinalQ = discPctQ > 0 ? totalComMargemQ * (1 - discPctQ) : totalComMargemQ;
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

  // ─── Driver Price Overrides (apenas vivian@grupoalfalux.com.br) ──────────────────────
  // ─── Custos Adicionais por Orçamento ─────────────────────────────────────────
  quoteAdditionalCosts: router({
    /** Lista custos adicionais de um orçamento (restrito a privilegiados) */
    list: protectedProcedure
      .input(z.object({ quoteId: z.number() }))
      .query(async ({ ctx, input }) => {
        const isPrivileged = await hasUserPermission(ctx.user.id, ctx.user.role, PERMISSIONS.VER_CUSTOS);
        if (!isPrivileged) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito" });
        }
        return getQuoteAdditionalCosts(input.quoteId);
      }),

    /** Cria um custo adicional para um orçamento */
    create: protectedProcedure
      .input(z.object({
        quoteId: z.number(),
        descricao: z.string().min(1).max(256),
        valor: z.number().min(0),
      }))
      .mutation(async ({ ctx, input }) => {
        const isPrivileged = await hasUserPermission(ctx.user.id, ctx.user.role, PERMISSIONS.VER_CUSTOS);
        if (!isPrivileged) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito" });
        }
        return createQuoteAdditionalCost(input.quoteId, input.descricao, input.valor, ctx.user.id);
      }),

    /** Remove um custo adicional */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const isPrivileged = await hasUserPermission(ctx.user.id, ctx.user.role, PERMISSIONS.VER_CUSTOS);
        if (!isPrivileged) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito" });
        }
        await deleteQuoteAdditionalCost(input.id);
        return { success: true };
      }),

    /** Retorna totais de custos adicionais agrupados por orçamento (para dashboard) */
    totals: protectedProcedure.query(async ({ ctx }) => {
      const isPrivileged = await hasUserPermission(ctx.user.id, ctx.user.role, PERMISSIONS.VER_CUSTOS);
      if (!isPrivileged) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito" });
      }
      return getTotalAdditionalCosts();
    }),
  }),

  driverPriceOverrides: router({
    /** Lista todos os overrides de custo de driver */
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.email !== "vivian@grupoalfalux.com.br") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito" });
      }
      return getDriverPriceOverrides();
    }),

    /** Cria ou atualiza o override de custo para um código EQ de driver */
    upsert: protectedProcedure
      .input(z.object({
        driverCode: z.string().min(1).max(20),
        driverModel: z.string().max(256).nullable().optional(),
        customCusto: z.number().min(0),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.email !== "vivian@grupoalfalux.com.br") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito" });
        }
        await upsertDriverPriceOverride(
          input.driverCode,
          input.driverModel ?? null,
          input.customCusto,
          ctx.user.id,
        );
        return { success: true };
      }),

    /** Remove o override de custo para um código EQ de driver */
    delete: protectedProcedure
      .input(z.object({ driverCode: z.string().min(1).max(20) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.email !== "vivian@grupoalfalux.com.br") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito" });
        }
        await deleteDriverPriceOverride(input.driverCode);
        return { success: true };
      }),

    /** Retorna o mapa de overrides (código EQ → customCusto) para uso no frontend */
    getMap: publicProcedure.query(async () => {
      const overrides = await getDriverPriceOverrides();
      const map: Record<string, number> = {};
      for (const o of overrides) {
        map[o.driverCode] = parseFloat(String(o.customCusto));
      }
      return map;
    }),
  }),

  // ─── Pedidos de Amostras ─────────────────────────────────────────────────────
  samples: router({
    /** Converte um orçamento em pedido de amostra */
    create: protectedProcedure
      .input(z.object({
        quoteId: z.number(),
        notes: z.string().optional(),
        kind: z.enum(['sample', 'maintenance']).default('sample'),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!await hasUserPermission(ctx.user.id, ctx.user.role, PERMISSIONS.GERENCIAR_AMOSTRAS)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Você não possui permissão para converter em amostra ou manutenção." });
        }
        // Amostra e manutenção são registros independentes para o mesmo orçamento.
        const existing = await getSampleOrderByQuoteId(input.quoteId, input.kind);
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: input.kind === 'maintenance'
              ? "Este orçamento já possui pedido de manutenção."
              : "Este orçamento já foi convertido em pedido de amostra.",
          });
        }
        // Buscar dados do orçamento
        const quoteData = await getQuoteById(input.quoteId);
        if (!quoteData) throw new TRPCError({ code: "NOT_FOUND", message: "Orçamento não encontrado." });
        const { quote, items } = quoteData;
        const relatedNonCommercialOrder = await getSampleOrderByQuoteId(input.quoteId);
        const originalCommercialTotals = resolveOriginalCommercialTotals(quote, relatedNonCommercialOrder);
        // Calcular custo real (sem markup) somando custoCorpoBase * qty de cada item
        // custoCorpoBase é o custo da API antes de aplicar qualquer markup
        let totalCusto = 0;
        console.log(`[Sample] items count: ${items.length}`);
        for (const item of items) {
          try {
            const parsed = JSON.parse(item.itemData);
            const custo = parsed.custoCorpoBase ?? 0;
            const qty = parsed.qty ?? 1;
            console.log(`[Sample] item ${item.itemNumber}: custoCorpoBase=${custo}, qty=${qty}, subtotal=${custo*qty}`);
            totalCusto += custo * qty;
            // Adicionar custo dos drivers (custoDriverBase é por unidade de driver)
            if (parsed.custoDriverBase && parsed.driverLines && Array.isArray(parsed.driverLines)) {
              for (const dl of parsed.driverLines) {
                totalCusto += parsed.custoDriverBase * (dl.driverQty ?? 0);
              }
            }
          } catch { /* skip unparseable items */ }
        }
        // Fallback: se nenhum item tem custoCorpoBase, reverter margem do totalAmount
        const totalSale = parseFloat(String(quote.totalAmount)) || 0;
        const marginPct = parseFloat(String(quote.marginPercent)) || 0;
        const discountPct = parseFloat(String((quote as any).discountPercent)) || 0;
        const fallbackCost = discountPct < 1
          ? Math.round(totalSale * (1 - marginPct) / (1 - discountPct) * 100) / 100
          : Math.round(totalSale * (1 - marginPct) * 100) / 100;
        const costAmount = totalCusto > 0 ? Math.round(totalCusto * 100) / 100 : fallbackCost;
        console.log(`[Sample] totalCusto=${totalCusto}, fallbackCost=${fallbackCost}, costAmount=${costAmount}`);
        const result = await createSampleOrder({
          quoteId: input.quoteId,
          clientName: quote.clientName,
          projectName: (quote as any).projectName ?? undefined,
          costAmount,
          originalTotalAmount: originalCommercialTotals.totalAmount,
          originalTotalFinal: originalCommercialTotals.totalFinal,
          notes: input.notes,
          sellerName: (quote as any).seller1Name ?? undefined,
          sellerId: quote.seller1Id ?? undefined,
          createdByUserId: ctx.user.id,
          kind: input.kind,
        });
        // Amostra e manutenção são pedidos sem cobrança; ambos usam o status
        // comercial "sample" para que todos os indicadores de receita os excluam.
        await markQuoteAsNonCommercial(input.quoteId, input.kind);
        await insertAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email ?? "",
          userName: ctx.user.name ?? "",
          action: input.kind === 'maintenance' ? "maintenance_created" : "sample_created",
          entityType: "sample_order",
          entityId: result.id,
          details: JSON.stringify({ quoteId: input.quoteId, clientName: quote.clientName, kind: input.kind }),
        });
        return result;
      }),

    /** Lista pedidos de amostras com filtros */
    list: protectedProcedure
      .input(z.object({
        clientName: z.string().optional(),
        status: z.string().optional(),
        sellerId: z.number().optional(),
        kind: z.enum(['sample', 'maintenance']).optional(),
      }).optional())
      .query(async ({ input }) => {
        return listSampleOrders(input ?? undefined);
      }),

    /** Busca pedido de amostra por ID */
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const sample = await getSampleOrderById(input.id);
        if (!sample) throw new TRPCError({ code: "NOT_FOUND" });
        // Buscar vinculações
        const links = await listSampleLinks(input.id);
        return { ...sample, links };
      }),

    /** Verifica se um orçamento já é amostra */
    getByQuoteId: protectedProcedure
      .input(z.object({ quoteId: z.number(), kind: z.enum(['sample', 'maintenance']).optional() }))
      .query(async ({ input }) => {
        const order = await getSampleOrderByQuoteId(input.quoteId, input.kind);
        if (!order) return null;
        return { ...order, links: await listSampleLinks(order.id) };
      }),

    /** Resolve o número informado no diálogo de vínculo sem depender da lista em cache do navegador. */
    findQuoteByNumber: protectedProcedure
      .input(z.object({ quoteNumber: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        if (!await hasUserPermission(ctx.user.id, ctx.user.role, PERMISSIONS.GERENCIAR_AMOSTRAS)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Você não possui permissão para vincular pedidos sem cobrança." });
        }
        return findQuoteByNumber(input.quoteNumber);
      }),

    /** Atualiza status/notas de um pedido de amostra */
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!await hasUserPermission(ctx.user.id, ctx.user.role, PERMISSIONS.GERENCIAR_AMOSTRAS)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Você não possui permissão para editar pedidos sem cobrança." });
        }
        await updateSampleOrder(input.id, { status: input.status, notes: input.notes });
        await insertAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email ?? "",
          userName: ctx.user.name ?? "",
          action: "sample_updated",
          entityType: "sample_order",
          entityId: input.id,
          details: JSON.stringify({ status: input.status }),
        });
        return { success: true };
      }),

    /** Vincula pedido de amostra a um orçamento futuro */
    link: protectedProcedure
      .input(z.object({
        sampleOrderId: z.number(),
        linkedQuoteId: z.number(),
        linkType: z.enum(["cobrar", "diluir", "associar"]),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!await hasUserPermission(ctx.user.id, ctx.user.role, PERMISSIONS.GERENCIAR_AMOSTRAS)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Você não possui permissão para vincular pedidos sem cobrança." });
        }
        const [sourceOrder, targetQuote, existingLinks] = await Promise.all([
          getSampleOrderById(input.sampleOrderId),
          getQuoteById(input.linkedQuoteId),
          listSampleLinks(input.sampleOrderId),
        ]);
        if (!sourceOrder) throw new TRPCError({ code: "NOT_FOUND", message: "Pedido de amostra ou manutenção não encontrado." });
        if (!targetQuote) throw new TRPCError({ code: "NOT_FOUND", message: "Orçamento informado não encontrado." });
        if (targetQuote.quote.status === "sample") {
          throw new TRPCError({ code: "CONFLICT", message: "O orçamento informado já é um pedido sem cobrança e não pode receber uma vinculação." });
        }
        const validationError = getSampleLinkValidationError({
          sourceQuoteId: sourceOrder.quoteId,
          targetQuoteId: input.linkedQuoteId,
          existingLinkedQuoteIds: existingLinks.map((link) => link.linkedQuoteId),
        });
        if (validationError) throw new TRPCError({ code: "CONFLICT", message: validationError });
        const result = await createSampleLink({
          sampleOrderId: input.sampleOrderId,
          linkedQuoteId: input.linkedQuoteId,
          linkType: input.linkType,
          notes: input.notes,
          createdByUserId: ctx.user.id,
          transferredRevenue: Number(sourceOrder.originalTotalFinal ?? sourceOrder.originalTotalAmount ?? 0),
          transferredCost: Number(sourceOrder.costAmount ?? 0),
        });
        if (input.linkType === "cobrar" || input.linkType === "diluir") {
          await applyNonCommercialRevenueTransfer(
            input.linkedQuoteId,
            Number(sourceOrder.originalTotalFinal ?? sourceOrder.originalTotalAmount ?? 0),
          );
        }
        // Atualizar status da amostra para 'linked'
        await updateSampleOrder(input.sampleOrderId, { status: "linked" });
        await insertAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email ?? "",
          userName: ctx.user.name ?? "",
          action: "sample_linked",
          entityType: "sample_link",
          entityId: result.id,
          details: JSON.stringify({ sampleOrderId: input.sampleOrderId, linkedQuoteId: input.linkedQuoteId, linkType: input.linkType }),
        });
        return result;
      }),

    /** Remove uma vinculação */
    unlink: protectedProcedure
      .input(z.object({ id: z.number(), sampleOrderId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!await hasUserPermission(ctx.user.id, ctx.user.role, PERMISSIONS.GERENCIAR_AMOSTRAS)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Você não possui permissão para desvincular pedidos sem cobrança." });
        }
        const existingLink = await getSampleLinkById(input.id);
        if (existingLink?.financialTransferredAt) {
          await reverseNonCommercialRevenueTransfer(existingLink.linkedQuoteId, Number(existingLink.transferredRevenue ?? 0));
        }
        await deleteSampleLink(input.id);
        // Verificar se ainda tem links; se não, voltar status para active
        const remaining = await listSampleLinks(input.sampleOrderId);
        if (remaining.length === 0) {
          await updateSampleOrder(input.sampleOrderId, { status: "active" });
        }
        return { success: true };
      }),

    /** Busca vinculações de um orçamento (para saber se ele tem amostras vinculadas) */
    linksByQuoteId: protectedProcedure
      .input(z.object({ quoteId: z.number() }))
      .query(async ({ input }) => {
        return listSampleLinksByQuoteId(input.quoteId);
      }),

    /** Valores e produtos de amostras vinculadas que afetam somente documentos comerciais do orçamento de destino. */
    commercialAdjustments: protectedProcedure
      .input(z.object({ quoteId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!canAccessCommercialQuotes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "LD Convidado não possui acesso a ajustes comerciais." });
        }
        return getSampleCommercialAdjustments(input.quoteId);
      }),

    /** Cancela um pedido de amostra e reverte o status do orçamento */
    cancel: protectedProcedure
      .input(z.object({ id: z.number(), quoteId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!await hasUserPermission(ctx.user.id, ctx.user.role, PERMISSIONS.GERENCIAR_AMOSTRAS)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Você não possui permissão para cancelar pedidos sem cobrança." });
        }
        const sample = await getSampleOrderById(input.id);
        if (!sample) throw new TRPCError({ code: "NOT_FOUND", message: "Pedido de amostra não encontrado." });
        const links = await listSampleLinks(input.id);
        for (const link of links) {
          if (link.financialTransferredAt) {
            await reverseNonCommercialRevenueTransfer(link.linkedQuoteId, Number(link.transferredRevenue ?? 0));
          }
        }
        await deleteSampleOrder(input.id, input.quoteId);
        await insertAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email ?? "",
          userName: ctx.user.name ?? "",
          action: "sample_cancelled",
          entityType: "sample_order",
          entityId: input.id,
          details: JSON.stringify({ quoteId: input.quoteId }),
        });
        return { success: true };
      }),

    /** Estatísticas de amostras para o dashboard */
    stats: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        sellerId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return getSampleOrderStats(input ?? undefined);
      }),
  }),
});
export type AppRouter = typeof appRouter;
import { getEffectivePermissions, hasExplicitUserPermission, hasUserPermission } from "./permissionsService";
import { PERMISSIONS } from "../shared/permissions";
