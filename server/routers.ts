import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { fetchDrivers, invalidateDriverCache } from "./driverService";
import { fetchAllAlfaluxProducts, invalidateAlfaluxCache } from "./alfaluxApiService";
import { addCartItem, getCartItems, removeCartItem, clearCart, updateCartItemQty } from "./db";
import { protectedProcedure } from "./_core/trpc";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
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
      // Não há fallback estático: se a API falhar, o erro é propagado para a UI exibir ao usuário.
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
  }),
  cart: router({
    add: protectedProcedure
      .input(z.object({
        itemData: z.string(), // JSON serializado do CartItemData
      }))
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
  }),
});

export type AppRouter = typeof appRouter;
