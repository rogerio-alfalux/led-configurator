/**
 * Famílias de PERFIS de tamanho fixo cujo preço e driver são retornados
 * separadamente pela API. Perfis modulares e por metro seguem seus próprios
 * motores de cálculo e não devem entrar neste mapa.
 */
export function isApiPricedFixedProfileFamily(family: string | null | undefined): boolean {
  const normalized = (family ?? "").trim().toLocaleUpperCase("pt-BR");
  return normalized === "BAGEO"
    || normalized.startsWith("BAGEO ")
    || normalized === "GLOW"
    || normalized === "TUBE LIGHT";
}
