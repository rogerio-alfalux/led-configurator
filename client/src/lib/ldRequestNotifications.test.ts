import { describe, expect, it } from "vitest";
import { getLdNotificationBadge } from "./ldRequestNotifications";

describe("notificações de solicitações LD", () => {
  it("mostra pendências ao administrador", () => expect(getLdNotificationBadge("admin", { adminPendingCount: 3 })).toEqual({ href: "/solicitacoes-ld", count: 3, title: "Solicitações LD" }));
  it("mostra respostas prontas ao LD e não expõe badge comercial", () => expect(getLdNotificationBadge("convidado", { guestReadyCount: 2 })).toEqual({ href: "/minhas-solicitacoes-ld", count: 2, title: "Minhas solicitações LD" }));
});
