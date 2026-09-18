import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Não reter dados em memória por mais de 2 minutos para garantir dados frescos da API
      gcTime: 2 * 60 * 1000,
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    // Só logar erros de autenticação; erros de rede têm fallback e não devem poluir o console
    if (error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG) {
      console.error("[API Query Error]", error);
    }
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      async fetch(input, init) {
        const response = await globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
        // Alguns proxies de borda devolvem texto puro (por exemplo,
        // "Service Unavailable") em vez do envelope JSON do tRPC. Sem esta
        // normalização o cliente tenta fazer JSON.parse e mostra
        // "Unexpected token 'S'" ao usuário.
        if (!response.ok) {
          const body = await response.clone().text();
          let isValidJson = false;
          try {
            JSON.parse(body);
            isValidJson = true;
          } catch {
            // O proxy pode rotular uma resposta de texto como JSON; o corpo é
            // a fonte de verdade para decidir se o tRPC conseguirá processá-lo.
          }
          if (!isValidJson) {
            const message = /service unavailable|database not available|temporarily unavailable/i.test(body)
              ? "O serviço está temporariamente indisponível. Aguarde alguns segundos e tente novamente."
              : `O servidor não respondeu corretamente (HTTP ${response.status}).`;
            return new Response(JSON.stringify({
              error: {
                json: {
                  message,
                  code: -32603,
                  data: { code: "INTERNAL_SERVER_ERROR", httpStatus: response.status },
                },
              },
            }), {
              status: response.status,
              headers: { "content-type": "application/json" },
            });
          }
        }
        return response;
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
