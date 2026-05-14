/**
 * priceCatalog.ts
 *
 * Tabela de preços por metro linear (R$/m) dos perfis de LED.
 * Válida SOMENTE para controle ON/OFF e tensão 220Vac.
 *
 * Fonte: Planilha "PreçoLineares09.05.26.xlsx"
 *
 * Estrutura da chave: `${profileCode}|${power}W`
 * Ex: "LLE-2810|18W" → 330
 *
 * Para adicionar novos perfis:
 *   1. Adicione a entrada no objeto PRICE_TABLE abaixo.
 *   2. A chave deve seguir o padrão `profileCode|${power}W`.
 */

/**
 * Mapa de preço por metro (R$/m) indexado por `profileCode|powerW`.
 * Apenas ON/OFF 220Vac.
 */
export const PRICE_TABLE: Record<string, number> = {
  // ── BLAZE E (LLE-2810) ──────────────────────────────────────────────────
  "LLE-2810|18W": 330,
  "LLE-2810|26W": 340,
  "LLE-2810|36W": 360,

  // ── EASY PRIME E (LLE-2580) ─────────────────────────────────────────────
  "LLE-2580|18W": 310,
  "LLE-2580|26W": 320,
  "LLE-2580|36W": 340,

  // ── SKYLINE E (LLE-2052) ────────────────────────────────────────────────
  "LLE-2052|18W": 270,
  "LLE-2052|26W": 280,
  "LLE-2052|36W": 300,

  // ── MINI BLAZE P/S (LLP-3336 e LLS-3336) ───────────────────────────────
  "LLP-3336|18W": 310,
  "LLP-3336|26W": 320,
  "LLP-3336|36W": 340,
  "LLS-3336|18W": 310,
  "LLS-3336|26W": 320,
  "LLS-3336|36W": 340,

  // ── EASY H PLUS D1 (LLP-4450 / LLA-4450) ───────────────────────────────
  "LLP-4450|18W": 470,
  "LLP-4450|26W": 480,
  "LLP-4450|36W": 500,
  "LLA-4450|18W": 470,
  "LLA-4450|26W": 480,
  "LLA-4450|36W": 500,

  // ── EASY H PLUS D1+D2 (LLP-4450 / LLA-4450) ────────────────────────────
  // Para D1+D2, a potência total é a soma; usamos a chave com potência do D1
  // e o sufixo "+D2" para diferenciar. A lógica de lookup usa application.
  "LLP-4450|36W|D1+D2": 600,
  "LLP-4450|52W|D1+D2": 620,
  "LLP-4450|72W|D1+D2": 660,
  "LLA-4450|36W|D1+D2": 600,
  "LLA-4450|52W|D1+D2": 620,
  "LLA-4450|72W|D1+D2": 660,

  // ── HIT P D1 (LLP-4251 / LLA-3395) ─────────────────────────────────────
  "LLP-4251|18W": 410,
  "LLP-4251|26W": 420,
  "LLP-4251|36W": 440,
  "LLA-3395|18W": 410,
  "LLA-3395|26W": 420,
  "LLA-3395|36W": 440,

  // ── HIT P D1+D2 (LLP-4251 / LLA-3395) ──────────────────────────────────
  "LLP-4251|36W|D1+D2": 520,
  "LLP-4251|52W|D1+D2": 550,
  "LLP-4251|72W|D1+D2": 600,
  "LLA-3395|36W|D1+D2": 520,
  "LLA-3395|52W|D1+D2": 550,
  "LLA-3395|72W|D1+D2": 600,

  // ── BLAZE S D1 (LLS-3945) ───────────────────────────────────────────────
  "LLS-3945|18W": 370,
  "LLS-3945|26W": 380,
  "LLS-3945|36W": 400,
};

/**
 * Retorna o preço por metro (R$/m) para o perfil, potência e aplicação informados.
 * Retorna null se:
 *   - Não houver preço cadastrado para a combinação.
 *   - A tensão não for "220Vac" (preços válidos apenas para 220V ON/OFF).
 */
export function getPricePerMeter(
  profileCode: string,
  powerW: number,
  voltage: string,
  application: string = "D1",
): number | null {
  // Preços disponíveis somente para 220Vac ON/OFF
  if (voltage !== "220Vac") return null;

  const appSuffix = application === "D1+D2" ? "|D1+D2" : "";
  const key = `${profileCode}|${powerW}W${appSuffix}`;
  return PRICE_TABLE[key] ?? null;
}

/**
 * Calcula o preço total para uma linha de perfil.
 * @param profileCode  Código do perfil (ex: "LLE-2810")
 * @param powerW       Potência em Watts (18, 26 ou 36)
 * @param voltage      Tensão ("220Vac" ou "Bivolt")
 * @param application  Aplicação ("D1", "D2" ou "D1+D2")
 * @param lengthMm     Comprimento realizado em milímetros
 * @returns Preço total em R$, ou null se não houver preço cadastrado
 */
export function calculateTotalPrice(
  profileCode: string,
  powerW: number,
  voltage: string,
  application: string,
  lengthMm: number,
): number | null {
  const pricePerMeter = getPricePerMeter(profileCode, powerW, voltage, application);
  if (pricePerMeter === null) return null;
  const lengthM = lengthMm / 1000;
  return Math.round(pricePerMeter * lengthM * 100) / 100;
}

/**
 * Formata um valor monetário em Real brasileiro.
 * Ex: 3400 → "R$ 3.400,00"
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
