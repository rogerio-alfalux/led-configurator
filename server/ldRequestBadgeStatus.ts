export type LdRequestStatus = "pending" | "in_review" | "quote_ready" | "cancelled";

export const ADMIN_PENDING_LD_STATUSES: LdRequestStatus[] = ["pending", "in_review"];

export function countsForAdminBadge(status: LdRequestStatus) {
  return ADMIN_PENDING_LD_STATUSES.includes(status);
}

export function countsForGuestBadge(status: LdRequestStatus, responseViewedAt: string | null) {
  return status === "quote_ready" && responseViewedAt === null;
}
