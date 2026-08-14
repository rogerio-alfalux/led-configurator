import { shouldMarkLdResponsesViewed } from "./ldResponseVisibility";

export async function markLdResponsesOnPageOpen(input: {
  role: string | undefined;
  requests: Array<{ status?: string }> | undefined;
  markViewed: () => Promise<unknown>;
  invalidateBadge: () => Promise<unknown>;
}) {
  if (!shouldMarkLdResponsesViewed(input.role, input.requests)) return false;
  await input.markViewed();
  await input.invalidateBadge();
  return true;
}
