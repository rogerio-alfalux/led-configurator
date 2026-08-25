/** Categorias comerciais que não têm componentes técnicos editáveis na ficha de produção. */
export function canEditProductionEquipments(category?: string | null): boolean {
  const normalized = (category ?? "").trim().toLocaleLowerCase("pt-BR");
  return normalized !== "revenda" && normalized !== "acessórios" && normalized !== "acessorios";
}
