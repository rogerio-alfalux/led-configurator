/**
 * Tabela de DIFAL e FCP por estado (2025/2026)
 *
 * Origem: São Paulo (SP) — alíquota interestadual SP→Sul/Sudeste = 12%, SP→demais = 7%
 *
 * DIFAL = alíquota_interna_destino - alíquota_interestadual
 * FCP   = alíquota FCP do estado destino
 * combined = DIFAL + FCP  ← alíquota única usada no cálculo
 *
 * Fórmula "por dentro" (imposto embutido no preço):
 *   total_com_imposto = base ÷ (1 - combined/100)
 *   valor_imposto     = total_com_imposto - base
 *
 * Fontes:
 *  - Conta Azul: https://contaazul.com/blog/tabela-de-aliquota-interestadual/ (atualizado 13/03/2026)
 *  - SimTax: https://simtax.com.br/fundo-combate-pobreza-fcp/ (2025)
 *  - NF-e Fazenda: tabela FCP oficial
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
  /** Alíquota combinada DIFAL + FCP (%) — usada no cálculo */
  combined: number;
  /** Região */
  regiao: "Norte" | "Nordeste" | "Centro-Oeste" | "Sudeste" | "Sul";
}

/** Estados Sul/Sudeste (exceto SP origem): alíquota interestadual 12% */
const SUL_SUDESTE = ["MG", "RJ", "ES", "PR", "SC", "RS"];

const RAW: Array<Omit<StateInfo, "icmsInterestadual" | "difal" | "combined">> = [
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
  const combined = difal + s.fcp;
  return { ...s, icmsInterestadual: interestadual, difal, combined };
});

/** Retorna as informações fiscais de um estado pelo UF */
export function getStateInfo(uf: string): StateInfo | undefined {
  return DIFAL_TABLE.find((s) => s.uf === uf);
}

/**
 * Calcula DIFAL+FCP pelo método "por dentro" sobre um valor base.
 *
 * Fórmula: total = base ÷ (1 - combined/100)
 *          imposto = total - base
 *
 * @param baseValue  Valor total dos produtos + frete (sem impostos)
 * @param uf         Estado destino
 * @returns { difalValue, fcpValue, combinedValue, totalWithTax, combinedRate }
 */
export function calculateDifal(
  baseValue: number,
  uf: string,
): { difalValue: number; fcpValue: number; combinedValue: number; totalWithTax: number; combinedRate: number } {
  const info = getStateInfo(uf);
  if (!info || info.combined <= 0) {
    return { difalValue: 0, fcpValue: 0, combinedValue: 0, totalWithTax: baseValue, combinedRate: 0 };
  }

  const combinedRate = info.combined; // ex: 10 para RJ (8% DIFAL + 2% FCP)
  // Fórmula por dentro: total = base / (1 - rate/100)
  const totalWithTax = baseValue / (1 - combinedRate / 100);
  const combinedValue = totalWithTax - baseValue;
  // Decompor proporcionalmente em DIFAL e FCP para exibição
  const difalValue = info.combined > 0 ? combinedValue * (info.difal / info.combined) : 0;
  const fcpValue   = info.combined > 0 ? combinedValue * (info.fcp   / info.combined) : 0;

  return { difalValue, fcpValue, combinedValue, totalWithTax, combinedRate };
}
