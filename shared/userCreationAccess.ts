export type CreatableUserRole = "user" | "admin" | "gerente" | "vendedor" | "assistente" | "convidado";

const VIVIAN_LD_GUEST_CREATOR_EMAIL = "vivian@grupoalfalux.com.br";

/**
 * A delegação para Vivian é propositalmente limitada à criação de contas LD
 * Convidado. Outros administradores mantêm o fluxo administrativo já existente.
 */
export function isVivianLdGuestCreator(email?: string | null): boolean {
  return email?.trim().toLowerCase() === VIVIAN_LD_GUEST_CREATOR_EMAIL;
}

/** Retorna a mensagem de bloqueio quando a delegação não autoriza o perfil escolhido. */
export function getUserCreationRoleAuthorizationError(
  creatorEmail: string | null | undefined,
  requestedRole: CreatableUserRole,
): string | null {
  if (isVivianLdGuestCreator(creatorEmail) && requestedRole !== "convidado") {
    return "A Vivian pode criar somente usuários LD Convidado.";
  }
  return null;
}
