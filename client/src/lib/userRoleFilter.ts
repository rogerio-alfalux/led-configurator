export const USER_ROLE_FILTERS = [
  { value: "all", label: "Todos os tipos" },
  { value: "admin", label: "Administrador" },
  { value: "gerente", label: "Gerente" },
  { value: "vendedor", label: "Vendedor" },
  { value: "assistente", label: "Assistente" },
  { value: "custos", label: "Departamento de Custos" },
  { value: "user", label: "Usuário" },
  { value: "convidado", label: "LD Convidado" },
] as const;

export function filterUsersByRole<T extends { role?: string | null }>(users: T[], roleFilter: string): T[] {
  return roleFilter === "all" ? users : users.filter((user) => user.role === roleFilter);
}
