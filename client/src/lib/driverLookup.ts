/**
 * driverLookup.ts
 * Tabela DRIVER_LOOKUP_ALFALUX — fonte única de verdade para seleção de drivers.
 *
 * REGRA ABSOLUTA: A seleção de driver NÃO é uma decisão da lógica.
 * É uma CONSULTA OBRIGATÓRIA nesta tabela.
 *
 * Fluxo determinístico:
 *   1. Receber: Potencia, Tensao, Tipo_Barra, barras_por_peca (valor real, sem arredondar)
 *   2. Filtrar linhas onde Potencia + Tensao + Tipo_Barra correspondem
 *   3. Encontrar linha onde Barras_Min <= barras_por_peca <= Barras_Max
 *   4. Retornar Driver_Modelo + Driver_Codigo
 *   5. Se não encontrar linha: retornar ERRO
 *
 * PROIBIDO: arredondar barras, usar CEIL/FLOOR, usar driver fora do intervalo.
 */

export interface DriverLookupRow {
  potencia: string;       // "18W", "26W", "36W"
  tensao: string;         // "220V", "Bivolt"
  tipoBarra: string;      // "Stripflex", "Stripline"
  barrasMin: number;
  barrasMax: number;
  driverModelo: string;
  driverCodigo: string;
  observacao?: string;
}

export interface DriverLookupResult {
  driverModelo: string;
  driverCodigo: string;
  error?: string;
}

/**
 * Tabela DRIVER_LOOKUP_ALFALUX.xlsx — transcrição exata.
 * Fonte: DRIVER_LOOKUP_ALFALUX.xlsx (versão 27/04/2026)
 * NÃO modificar sem atualizar a planilha de referência.
 */
export const DRIVER_LOOKUP_TABLE: DriverLookupRow[] = [
  // 18W 220V Stripflex
  { potencia: "18W", tensao: "220V", tipoBarra: "Stripflex", barrasMin: 1,    barrasMax: 2,    driverModelo: "PHILIPS XITANIUM 19W 350MA", driverCodigo: "EQ00346" },
  { potencia: "18W", tensao: "220V", tipoBarra: "Stripflex", barrasMin: 2.01, barrasMax: 5,    driverModelo: "PHILIPS XITANIUM 44W 350MA", driverCodigo: "EQ00347" },
  { potencia: "18W", tensao: "220V", tipoBarra: "Stripflex", barrasMin: 5.01, barrasMax: 7,    driverModelo: "PHILIPS XITANIUM 65W 350MA", driverCodigo: "EQ00393" },

  // 26W 220V Stripflex
  { potencia: "26W", tensao: "220V", tipoBarra: "Stripflex", barrasMin: 1,    barrasMax: 1.6,  driverModelo: "PHILIPS CERTADRIVE 20W",     driverCodigo: "EQ00353" },
  // GAP: 1.61 a 1.99 → ERRO (sem linha na tabela — medida inválida para 26W)
  { potencia: "26W", tensao: "220V", tipoBarra: "Stripflex", barrasMin: 2,    barrasMax: 2.99, driverModelo: "2x PHILIPS CERTADRIVE 20W",  driverCodigo: "EQ00353" },
  { potencia: "26W", tensao: "220V", tipoBarra: "Stripflex", barrasMin: 3,    barrasMax: 3.2,  driverModelo: "3x PHILIPS CERTADRIVE 20W",  driverCodigo: "EQ00353" },
  // GAP: 3.21 a 3.99 → ERRO (sem linha na tabela — medida inválida para 26W)
  { potencia: "26W", tensao: "220V", tipoBarra: "Stripflex", barrasMin: 4,    barrasMax: 6,    driverModelo: "OSRAM IT FIT 75W",           driverCodigo: "EQ00220" },

  // 18W Bivolt Stripflex
  { potencia: "18W", tensao: "Bivolt", tipoBarra: "Stripflex", barrasMin: 1,    barrasMax: 2,    driverModelo: "LIFUD 20W 350MA", driverCodigo: "EQ00580" },
  { potencia: "18W", tensao: "Bivolt", tipoBarra: "Stripflex", barrasMin: 2.01, barrasMax: 4,    driverModelo: "LIFUD 40W 350MA", driverCodigo: "EQ00581" },
  { potencia: "18W", tensao: "Bivolt", tipoBarra: "Stripflex", barrasMin: 4.01, barrasMax: 6,    driverModelo: "LIFUD 60W 350MA", driverCodigo: "EQ00582" },

  // 36W 220V Stripflex (Fileira Dupla) — até 14 barras (2x 7 barras em paralelo)
  { potencia: "36W", tensao: "220V", tipoBarra: "Stripflex", barrasMin: 1,    barrasMax: 2,    driverModelo: "PHILIPS XITANIUM 19W 350MA", driverCodigo: "EQ00346", observacao: "Fileira dupla" },
  { potencia: "36W", tensao: "220V", tipoBarra: "Stripflex", barrasMin: 2.01, barrasMax: 5,    driverModelo: "PHILIPS XITANIUM 44W 350MA", driverCodigo: "EQ00347", observacao: "Fileira dupla" },
  { potencia: "36W", tensao: "220V", tipoBarra: "Stripflex", barrasMin: 5.01, barrasMax: 14,   driverModelo: "PHILIPS XITANIUM 65W 350MA", driverCodigo: "EQ00393", observacao: "Fileira dupla" },

  // 36W 220V Stripline
  { potencia: "36W", tensao: "220V", tipoBarra: "Stripline", barrasMin: 1, barrasMax: 1, driverModelo: "PHILIPS XITANIUM 44W 250MA",                                                         driverCodigo: "EQ00347" },
  { potencia: "36W", tensao: "220V", tipoBarra: "Stripline", barrasMin: 2, barrasMax: 2, driverModelo: "PHILIPS XITANIUM 65W 250MA",                                                         driverCodigo: "EQ00393" },
  { potencia: "36W", tensao: "220V", tipoBarra: "Stripline", barrasMin: 3, barrasMax: 3, driverModelo: "1x PHILIPS XITANIUM 44W 250MA + 1x PHILIPS XITANIUM 65W 250MA",                     driverCodigo: "EQ00347 + EQ00393" },
  { potencia: "36W", tensao: "220V", tipoBarra: "Stripline", barrasMin: 4, barrasMax: 4, driverModelo: "2x PHILIPS XITANIUM 65W 250MA",                                                     driverCodigo: "EQ00393" },
  { potencia: "36W", tensao: "220V", tipoBarra: "Stripline", barrasMin: 5, barrasMax: 5, driverModelo: "2x PHILIPS XITANIUM 65W 250MA + 1x PHILIPS XITANIUM 44W 250MA",                     driverCodigo: "EQ00393 + EQ00347" },

  // 36W Bivolt Stripflex (Fileira Dupla)
  { potencia: "36W", tensao: "Bivolt", tipoBarra: "Stripflex", barrasMin: 1,    barrasMax: 2,    driverModelo: "LIFUD 20W 350MA", driverCodigo: "EQ00580", observacao: "Fileira dupla" },
  { potencia: "36W", tensao: "Bivolt", tipoBarra: "Stripflex", barrasMin: 2.01, barrasMax: 4,    driverModelo: "LIFUD 40W 350MA", driverCodigo: "EQ00581", observacao: "Fileira dupla" },
  { potencia: "36W", tensao: "Bivolt", tipoBarra: "Stripflex", barrasMin: 4.01, barrasMax: 6,    driverModelo: "LIFUD 60W 350MA", driverCodigo: "EQ00582", observacao: "Fileira dupla" },

  // 36W Bivolt Stripline
  { potencia: "36W", tensao: "Bivolt", tipoBarra: "Stripline", barrasMin: 1, barrasMax: 1, driverModelo: "LIFUD 40W 250MA",                                                                  driverCodigo: "EQ00581" },
  { potencia: "36W", tensao: "Bivolt", tipoBarra: "Stripline", barrasMin: 2, barrasMax: 2, driverModelo: "LIFUD 60W 250MA",                                                                  driverCodigo: "EQ00582" },
  { potencia: "36W", tensao: "Bivolt", tipoBarra: "Stripline", barrasMin: 3, barrasMax: 3, driverModelo: "1x LIFUD 40W 250MA + 1x LIFUD 60W 250MA",                                          driverCodigo: "EQ00581 + EQ00582" },
  { potencia: "36W", tensao: "Bivolt", tipoBarra: "Stripline", barrasMin: 4, barrasMax: 4, driverModelo: "2x LIFUD 60W 250MA",                                                               driverCodigo: "EQ00582" },
  { potencia: "36W", tensao: "Bivolt", tipoBarra: "Stripline", barrasMin: 5, barrasMax: 5, driverModelo: "2x LIFUD 60W 250MA + 1x LIFUD 40W 250MA",                                          driverCodigo: "EQ00582 + EQ00581" },
];

/**
 * Consulta determinística na tabela DRIVER_LOOKUP.
 *
 * @param barras  Valor real de barras por peça (SEM arredondamento)
 * @param potencia "18W" | "26W" | "36W"
 * @param tensao  "220V" | "Bivolt"
 * @param tipoBarra "Stripflex" | "Stripline"
 * @returns Driver_Modelo + Driver_Codigo, ou error se não encontrar linha
 */
export function lookupDriver(
  barras: number,
  potencia: string,
  tensao: string,
  tipoBarra: string
): DriverLookupResult {
  // Filtrar por Potencia + Tensao + Tipo_Barra
  const candidates = DRIVER_LOOKUP_TABLE.filter(
    row =>
      row.potencia === potencia &&
      row.tensao === tensao &&
      row.tipoBarra === tipoBarra
  );

  if (candidates.length === 0) {
    return {
      driverModelo: "",
      driverCodigo: "",
      error: `ERRO: combinação inválida — ${potencia} / ${tensao} / ${tipoBarra} não existe na tabela`,
    };
  }

  // Encontrar linha onde Barras_Min <= barras <= Barras_Max
  const match = candidates.find(
    row => barras >= row.barrasMin && barras <= row.barrasMax
  );

  if (!match) {
    return {
      driverModelo: "",
      driverCodigo: "",
      error: `ERRO: combinação inválida de barras para esta configuração (${barras} barras, ${potencia}, ${tensao}, ${tipoBarra})`,
    };
  }

  return {
    driverModelo: match.driverModelo,
    driverCodigo: match.driverCodigo,
  };
}
