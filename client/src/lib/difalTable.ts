/**
 * Tabela de DIFAL e FCP por estado (2025/2026)
 *
 * Origem: São Paulo (SP) — alíquota interestadual SP→Sul/Sudeste = 12%, SP→demais = 7%
 *
 * DIFAL = alíquota_interna_destino - alíquota_interestadual
 * FCP   = alíquota FCP do estado destino (incide sobre produtos em geral; para luminárias, verificar legislação estadual)
 *
 * Fontes:
 *  - Conta Azul: https://contaazul.com/blog/tabela-de-aliquota-interestadual/ (atualizado 13/03/2026)
 *  - SimTax: https://simtax.com.br/fundo-combate-pobreza-fcp/ (2025)
 *  - NF-e Fazenda: tabela FCP oficial
 *
 * Nota: FCP para luminárias/iluminação geralmente NÃO incide (não é produto supérfluo).
 * O campo fcpRate está incluído para fins informativos; o usuário pode ativar/desativar via toggle.
 */

export interface StateInfo {
  /** Sigla do estado */
  uf: string;
  /** Nome completo */
  name: string;
  /** Alíquota interna de ICMS (%) */
  icmsInterno: number;
  /** Alíquota interestadual de SP para este estado (%) — 12% Sul/Sudeste, 7% demais */
  icmsInterestadual: number;
  /** DIFAL = icmsInterno - icmsInterestadual (%) */
  difal: number;
  /** Alíquota FCP (%) — 0 se não possui */
  fcp: number;
  /** Região */
  regiao: "Norte" | "Nordeste" | "Centro-Oeste" | "Sudeste" | "Sul";
}

/** Estados Sul/Sudeste (exceto SP origem): alíquota interestadual 12% */
const SUL_SUDESTE = ["MG", "RJ", "ES", "PR", "SC", "RS"];

const RAW: Array<Omit<StateInfo, "icmsInterestadual" | "difal">> = [
  // Norte
  { uf: "AC", name: "Acre",             icmsInterno: 19.0, fcp: 0.0,  regiao: "Norte" },
  { uf: "AM", name: "Amazonas",         icmsInterno: 20.0, fcp: 2.0,  regiao: "Norte" },
  { uf: "AP", name: "Amapá",            icmsInterno: 18.0, fcp: 0.0,  regiao: "Norte" },
  { uf: "PA", name: "Pará",             icmsInterno: 19.0, fcp: 0.0,  regiao: "Norte" },
  { uf: "RO", name: "Rondônia",         icmsInterno: 19.5, fcp: 2.0,  regiao: "Norte" },
  { uf: "RR", name: "Roraima",          icmsInterno: 20.0, fcp: 2.0,  regiao: "Norte" },
  { uf: "TO", name: "Tocantins",        icmsInterno: 20.0, fcp: 2.0,  regiao: "Norte" },
  // Nordeste
  { uf: "AL", name: "Alagoas",          icmsInterno: 20.5, fcp: 2.0,  regiao: "Nordeste" },
  { uf: "BA", name: "Bahia",            icmsInterno: 20.5, fcp: 2.0,  regiao: "Nordeste" },
  { uf: "CE", name: "Ceará",            icmsInterno: 20.0, fcp: 2.0,  regiao: "Nordeste" },
  { uf: "MA", name: "Maranhão",         icmsInterno: 23.0, fcp: 2.0,  regiao: "Nordeste" },
  { uf: "PB", name: "Paraíba",          icmsInterno: 20.0, fcp: 2.0,  regiao: "Nordeste" },
  { uf: "PE", name: "Pernambuco",       icmsInterno: 20.5, fcp: 2.0,  regiao: "Nordeste" },
  { uf: "PI", name: "Piauí",            icmsInterno: 22.5, fcp: 2.0,  regiao: "Nordeste" },
  { uf: "RN", name: "Rio Grande do Norte", icmsInterno: 20.0, fcp: 2.0, regiao: "Nordeste" },
  { uf: "SE", name: "Sergipe",          icmsInterno: 19.0, fcp: 2.0,  regiao: "Nordeste" },
  // Centro-Oeste
  { uf: "DF", name: "Distrito Federal", icmsInterno: 20.0, fcp: 2.0,  regiao: "Centro-Oeste" },
  { uf: "GO", name: "Goiás",            icmsInterno: 19.0, fcp: 2.0,  regiao: "Centro-Oeste" },
  { uf: "MT", name: "Mato Grosso",      icmsInterno: 17.0, fcp: 2.0,  regiao: "Centro-Oeste" },
  { uf: "MS", name: "Mato Grosso do Sul", icmsInterno: 17.0, fcp: 2.0, regiao: "Centro-Oeste" },
  // Sudeste (exceto SP)
  { uf: "ES", name: "Espírito Santo",   icmsInterno: 17.0, fcp: 2.0,  regiao: "Sudeste" },
  { uf: "MG", name: "Minas Gerais",     icmsInterno: 18.0, fcp: 2.0,  regiao: "Sudeste" },
  { uf: "RJ", name: "Rio de Janeiro",   icmsInterno: 20.0, fcp: 2.0,  regiao: "Sudeste" },
  // Sul
  { uf: "PR", name: "Paraná",           icmsInterno: 19.5, fcp: 2.0,  regiao: "Sul" },
  { uf: "RS", name: "Rio Grande do Sul", icmsInterno: 17.0, fcp: 2.0, regiao: "Sul" },
  { uf: "SC", name: "Santa Catarina",   icmsInterno: 17.0, fcp: 0.0,  regiao: "Sul" },
];

export const DIFAL_TABLE: StateInfo[] = RAW.map((s) => {
  const interestadual = SUL_SUDESTE.includes(s.uf) ? 12 : 7;
  const difal = Math.max(0, s.icmsInterno - interestadual);
  return { ...s, icmsInterestadual: interestadual, difal };
});

/** Retorna as informações fiscais de um estado pelo UF */
export function getStateInfo(uf: string): StateInfo | undefined {
  return DIFAL_TABLE.find((s) => s.uf === uf);
}

/**
 * Calcula DIFAL e FCP sobre um valor base.
 * @param baseValue  Valor total dos produtos (sem impostos)
 * @param uf         Estado destino
 * @param includeFcp Se deve incluir FCP no cálculo
 * @returns { difalValue, fcpValue, totalTax, effectiveRate }
 */
export function calculateDifal(
  baseValue: number,
  uf: string,
  includeFcp: boolean
): { difalValue: number; fcpValue: number; totalTax: number; effectiveRate: number } {
  const info = getStateInfo(uf);
  if (!info) return { difalValue: 0, fcpValue: 0, totalTax: 0, effectiveRate: 0 };

  const difalValue = (baseValue * info.difal) / 100;
  const fcpValue = includeFcp ? (baseValue * info.fcp) / 100 : 0;
  const totalTax = difalValue + fcpValue;
  const effectiveRate = info.difal + (includeFcp ? info.fcp : 0);

  return { difalValue, fcpValue, totalTax, effectiveRate };
}
