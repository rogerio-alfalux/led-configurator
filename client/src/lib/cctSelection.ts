export const CCT_A_DEFINIR = "A definir";

/**
 * A opção A Definir é uma escolha válida do usuário, embora não venha na lista
 * de CCTs específicos do produto retornada pela API.
 */
export function isCctSelectionAvailable(
  selectedCct: string | null | undefined,
  availableCcts: readonly string[] | null | undefined,
): boolean {
  if (!selectedCct) return false;
  if (selectedCct.trim().toLocaleLowerCase("pt-BR") === CCT_A_DEFINIR.toLocaleLowerCase("pt-BR")) return true;
  return (availableCcts ?? []).includes(selectedCct);
}
