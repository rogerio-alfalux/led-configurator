import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { fetchDrivers, invalidateDriverCache } from "./driverService";
import { fetchAllAlfaluxProducts, invalidateAlfaluxCache } from "./alfaluxApiService";

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
      try {
        const products = await fetchAllAlfaluxProducts();
        return products;
      } catch (err) {
        console.error("[AlfaluxAPI] Falha ao buscar produtos — usando catálogo estático como fallback:", err);
        return []; // UI usa catálogo estático quando array vazio
      }
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
});

export type AppRouter = typeof appRouter;
