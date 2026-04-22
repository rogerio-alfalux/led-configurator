/**
 * Driver Service — busca e faz cache dos drivers do Google Sheets
 * Atualiza automaticamente a cada 1 hora
 */

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1DhnImBwkwBDBB6sCTAXVSoIFIuUIqL5ZPJ26bJU0PE4/export?format=csv&gid=0";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

export interface DriverEntry {
  code: string;          // EQ00346
  model: string;         // PHILIPS XITANIUM 19W
  inputVoltage: string;  // "220V" | "BIVOLT"
  /** Array de faixas de tensão de saída por corrente */
  outputRanges: OutputRange[];
  /** Correntes suportadas em mA */
  currents: number[];
  available: boolean;
  priority: number;
}

export interface OutputRange {
  current: number;       // mA
  vMin: number;          // V mínimo de saída
  vMax: number;          // V máximo de saída
}

interface CacheEntry {
  data: DriverEntry[];
  fetchedAt: number;
}

let cache: CacheEntry | null = null;

/** Parseia a string de tensão de saída que pode ter múltiplas linhas por corrente */
function parseOutputRanges(rawVout: string, rawCurrents: string): OutputRange[] {
  const ranges: OutputRange[] = [];

  // Normalizar correntes da coluna E
  const currentList = rawCurrents
    .toUpperCase()
    .split(/,|ou/i)
    .map(s => parseInt(s.replace(/[^0-9]/g, "").trim()))
    .filter(n => !isNaN(n) && n > 0);

  // Verificar se a tensão de saída tem múltiplas linhas com "@" (formato bivolt/OSRAM)
  const lines = rawVout.split("\n").map(l => l.trim()).filter(Boolean);

  const atLines = lines.filter(l => l.includes("@"));

  if (atLines.length > 0) {
    // Formato: "25 - 75V @ 200mA" ou "90 - 216V @ 350MA"
    for (const line of atLines) {
      const match = line.match(/(\d+)\s*[-–]\s*(\d+)\s*V\s*@\s*(\d+)\s*m?A/i);
      if (match) {
        ranges.push({
          current: parseInt(match[3]),
          vMin: parseInt(match[1]),
          vMax: parseInt(match[2]),
        });
      }
    }
  } else {
    // Formato simples: "30 - 54V" ou "30-42V" — aplica para todas as correntes
    const simpleMatch = rawVout.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (simpleMatch) {
      const vMin = parseInt(simpleMatch[1]);
      const vMax = parseInt(simpleMatch[2]);
      for (const c of currentList) {
        ranges.push({ current: c, vMin, vMax });
      }
    }
  }

  return ranges;
}

function parseCSV(csv: string): DriverEntry[] {
  const lines = csv.split("\n");
  const drivers: DriverEntry[] = [];

  // Pular linha 1 (título) e linha 2 (cabeçalho)
  let i = 2;

  while (i < lines.length) {
    // Juntar linhas que fazem parte do mesmo registro (campos multiline entre aspas)
    let record = lines[i];
    while (record.split('"').length % 2 === 0 && i + 1 < lines.length) {
      i++;
      record += "\n" + lines[i];
    }
    i++;

    if (!record.trim()) continue;

    // Parser CSV simples respeitando aspas
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let ci = 0; ci < record.length; ci++) {
      const ch = record[ci];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());

    if (fields.length < 7) continue;

    const [code, model, inputVoltage, rawVout, rawCurrents, available, priorityStr] = fields;

    if (!code || !code.startsWith("EQ")) continue;

    const priority = parseInt(priorityStr) || 99;
    const isAvailable = available.toUpperCase().trim() === "SIM";

    const currents = rawCurrents
      .toUpperCase()
      .split(/,|ou/i)
      .map(s => parseInt(s.replace(/[^0-9]/g, "").trim()))
      .filter(n => !isNaN(n) && n > 0);

    const outputRanges = parseOutputRanges(rawVout, rawCurrents);

    drivers.push({
      code: code.trim(),
      model: model.trim(),
      inputVoltage: inputVoltage.trim().toUpperCase(),
      outputRanges,
      currents,
      available: isAvailable,
      priority,
    });
  }

  return drivers;
}

export async function fetchDrivers(): Promise<DriverEntry[]> {
  const now = Date.now();

  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  try {
    const response = await fetch(SHEET_CSV_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const csv = await response.text();
    const drivers = parseCSV(csv);

    if (drivers.length > 0) {
      cache = { data: drivers, fetchedAt: now };
      console.log(`[DriverService] Carregados ${drivers.length} drivers do Google Sheets`);
    }

    return drivers;
  } catch (err) {
    console.error("[DriverService] Erro ao buscar drivers:", err);
    // Retornar cache antigo se disponível
    if (cache) {
      console.warn("[DriverService] Usando cache antigo");
      return cache.data;
    }
    return getFallbackDrivers();
  }
}

/**
 * Seleciona o melhor driver para uma dada tensão de saída e corrente.
 * Prioriza drivers com menor número de prioridade (1 = maior prioridade).
 * Filtra por: disponível=SIM, suporta a corrente, tensão de saída dentro da faixa.
 */
export function selectBestDriver(
  drivers: DriverEntry[],
  vOut: number,
  currentMA: number,
  inputVoltage: "220V" | "BIVOLT"
): DriverEntry | null {
  const isBivolt = inputVoltage === "BIVOLT";

  const candidates = drivers.filter(d => {
    if (!d.available) return false;
    // Filtrar por tensão de entrada
    if (isBivolt) {
      if (d.inputVoltage !== "BIVOLT") return false;
    } else {
      if (d.inputVoltage !== "220V") return false;
    }
    // Verificar se suporta a corrente
    if (!d.currents.includes(currentMA)) return false;
    // Verificar se a tensão de saída está dentro da faixa para essa corrente
    const range = d.outputRanges.find(r => r.current === currentMA);
    if (!range) return false;
    return vOut >= range.vMin && vOut <= range.vMax;
  });

  if (candidates.length === 0) return null;

  // Ordenar por prioridade (menor = melhor), depois por potência (menor = mais eficiente)
  candidates.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    // Desempate: menor potência (extraída do modelo)
    const wA = parseInt(a.model.match(/(\d+)W/i)?.[1] ?? "999");
    const wB = parseInt(b.model.match(/(\d+)W/i)?.[1] ?? "999");
    return wA - wB;
  });

  return candidates[0];
}

/** Drivers de fallback caso a planilha não esteja acessível */
function getFallbackDrivers(): DriverEntry[] {
  return [
    {
      code: "EQ00346",
      model: "PHILIPS XITANIUM 19W",
      inputVoltage: "220V",
      outputRanges: [
        { current: 200, vMin: 30, vMax: 54 },
        { current: 250, vMin: 30, vMax: 54 },
        { current: 300, vMin: 30, vMax: 54 },
        { current: 350, vMin: 30, vMax: 54 },
      ],
      currents: [200, 250, 300, 350],
      available: true,
      priority: 1,
    },
    {
      code: "EQ00347",
      model: "PHILIPS XITANIUM 44W",
      inputVoltage: "220V",
      outputRanges: [
        { current: 200, vMin: 70, vMax: 125 },
        { current: 250, vMin: 70, vMax: 125 },
        { current: 300, vMin: 70, vMax: 125 },
        { current: 350, vMin: 70, vMax: 125 },
      ],
      currents: [200, 250, 300, 350],
      available: true,
      priority: 1,
    },
    {
      code: "EQ00393",
      model: "PHILIPS XITANIUM 65W",
      inputVoltage: "220V",
      outputRanges: [
        { current: 200, vMin: 120, vMax: 185 },
        { current: 250, vMin: 120, vMax: 185 },
        { current: 300, vMin: 120, vMax: 185 },
        { current: 350, vMin: 120, vMax: 185 },
      ],
      currents: [200, 250, 300, 350],
      available: true,
      priority: 1,
    },
    {
      code: "EQ00220",
      model: "OSRAM IT FIT 75W",
      inputVoltage: "220V",
      outputRanges: [
        { current: 350, vMin: 90, vMax: 216 },
        { current: 400, vMin: 90, vMax: 180 },
        { current: 500, vMin: 90, vMax: 150 },
        { current: 550, vMin: 90, vMax: 130 },
      ],
      currents: [350, 400, 500, 550],
      available: true,
      priority: 1,
    },
    {
      code: "EQ00580",
      model: "LIFUD 20W LF-FMR020YS0350U(S)",
      inputVoltage: "BIVOLT",
      outputRanges: [
        { current: 200, vMin: 25, vMax: 75 },
        { current: 250, vMin: 25, vMax: 75 },
        { current: 300, vMin: 25, vMax: 57 },
        { current: 350, vMin: 25, vMax: 57 },
      ],
      currents: [200, 250, 300, 350],
      available: true,
      priority: 1,
    },
    {
      code: "EQ00581",
      model: "LIFUD 40W LF-FMR040YS0350U(S)",
      inputVoltage: "BIVOLT",
      outputRanges: [
        { current: 200, vMin: 80, vMax: 130 },
        { current: 250, vMin: 65, vMax: 130 },
        { current: 300, vMin: 55, vMax: 130 },
        { current: 350, vMin: 45, vMax: 115 },
      ],
      currents: [200, 250, 300, 350],
      available: true,
      priority: 1,
    },
    {
      code: "EQ00582",
      model: "LIFUD 60W LF-FMR060YS0350U(S)",
      inputVoltage: "BIVOLT",
      outputRanges: [
        { current: 200, vMin: 80, vMax: 200 },
        { current: 250, vMin: 80, vMax: 200 },
        { current: 300, vMin: 80, vMax: 200 },
        { current: 350, vMin: 80, vMax: 172 },
      ],
      currents: [200, 250, 300, 350],
      available: true,
      priority: 1,
    },
  ];
}
