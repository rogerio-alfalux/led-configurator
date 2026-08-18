export const QUOTES_ROUTE = "/orcamentos";

export function canOpenQuotesFromHome(isAuthenticated: boolean, isLdGuest: boolean): boolean {
  return isAuthenticated && !isLdGuest;
}
