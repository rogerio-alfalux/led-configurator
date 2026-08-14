export function shouldMarkLdResponsesViewed(role: string | undefined, requests: Array<{ status?: string }> | undefined) {
  return role === "convidado" && Boolean(requests?.some(request => request.status === "quote_ready"));
}
