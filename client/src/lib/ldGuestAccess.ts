export type LdGuestUserLike = {
  role?: string | null;
  loginMethod?: string | null;
  openId?: string | null;
} | null | undefined;

/**
 * Identifica o LD Convidado de forma defensiva.
 *
 * O papel canônico é `convidado`. O segundo caso cobre sessões antigas de
 * login por senha cujo papel ainda não chegou ao cliente, sem transformar
 * vendedores ou administradores criados por senha em convidados.
 */
export function isLdGuestUser(user: LdGuestUserLike): boolean {
  const role = String(user?.role ?? "").trim().toLocaleLowerCase("pt-BR");
  if (["convidado", "ld convidado", "ld_convidado"].includes(role)) return true;

  const loginMethod = String(user?.loginMethod ?? "").trim().toLocaleLowerCase("pt-BR");
  const openId = String(user?.openId ?? "").trim();
  return role === "user" && loginMethod === "password" && openId.startsWith("pwd_");
}

/** Valores comerciais ficam ocultos até que a sessão seja conhecida. */
export function mustHideCommercialValues(user: LdGuestUserLike, isAuthLoading: boolean): boolean {
  return isAuthLoading || !user || isLdGuestUser(user);
}
