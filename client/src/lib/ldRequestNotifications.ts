export function getLdNotificationBadge(role: string | undefined, counts: { adminPendingCount?: number; guestReadyCount?: number } | undefined) {
  if (role === "admin") return { href: "/solicitacoes-ld", count: counts?.adminPendingCount ?? 0, title: "Solicitações LD" };
  if (role === "convidado") return { href: "/minhas-solicitacoes-ld", count: counts?.guestReadyCount ?? 0, title: "Minhas solicitações LD" };
  return null;
}
