// Simular o cálculo do BLAZE S 7900mm com barras quebradas
// Módulos disponíveis para LLS-3945:
// IF: 4.8 = 2760mm, 5 = 2825mm, 4.7 = 2700mm, 4.5 = 2575mm, 4.4 = 2510mm, 4.3 = 2450mm, 4.2 = 2385mm, 4.1 = 2325mm, 4 = 2260mm, 3.8 = 2200mm, 3.7 = 2135mm, 3.6 = 2075mm, 3.5 = 2010mm, 3.4 = 1950mm, 3.3 = 1885mm, 3.2 = 1825mm, 3.1 = 1760mm, 3 = 1700mm, 2.8 = 1635mm, 2.6 = 1510mm, 2.5 = 1450mm, 2 = 1135mm, 1 = 575mm
// ML: 6 = 3380mm, 5.8 = 3320mm, 5.3 = 3005mm, 5.2 = 2945mm, 5.1 = 2880mm, 5 = 2820mm, 4.5 = 2570mm, 4.4 = 2505mm, 4.2 = 2380mm, 4 = 2255mm, 3.5 = 2005mm, 3.4 = 1945mm, 3.3 = 1880mm, 3 = 1695mm, 2.3 = 1320mm, 2.2 = 1255mm, 2 = 1130mm, 1.4 = 820mm, 1 = 570mm

const requestedLength = 7900;

const ifModules = [
  { barras: 6, length: 3385, sku: "LLS-3945.6IF.38F" },
  { barras: 5.8, length: 3325, sku: "LLS-3945.58F.38F" },
  { barras: 5.7, length: 3260, sku: "LLS-3945.57F.38F" },
  { barras: 5.5, length: 3135, sku: "LLS-3945.55F.38F" },
  { barras: 5.4, length: 3075, sku: "LLS-3945.54F.38F" },
  { barras: 5.3, length: 3010, sku: "LLS-3945.53F.38F" },
  { barras: 5.1, length: 2885, sku: "LLS-3945.51F.38F" },
  { barras: 5, length: 2825, sku: "LLS-3945.5IF.38F" },
  { barras: 4.8, length: 2760, sku: "LLS-3945.48F.38F" },
  { barras: 4.7, length: 2700, sku: "LLS-3945.47F.38F" },
  { barras: 4.5, length: 2575, sku: "LLS-3945.45F.38F" },
  { barras: 4.4, length: 2510, sku: "LLS-3945.44F.38F" },
  { barras: 4.3, length: 2450, sku: "LLS-3945.43F.38F" },
  { barras: 4.2, length: 2385, sku: "LLS-3945.42F.38F" },
  { barras: 4.1, length: 2325, sku: "LLS-3945.41F.38F" },
  { barras: 4, length: 2260, sku: "LLS-3945.4IF.38F" },
  { barras: 3.8, length: 2200, sku: "LLS-3945.38F.38F" },
  { barras: 3.7, length: 2135, sku: "LLS-3945.37F.38F" },
  { barras: 3.6, length: 2075, sku: "LLS-3945.36F.38F" },
  { barras: 3.5, length: 2010, sku: "LLS-3945.35F.38F" },
  { barras: 3.4, length: 1950, sku: "LLS-3945.34F.38F" },
  { barras: 3.3, length: 1885, sku: "LLS-3945.33F.38F" },
  { barras: 3.2, length: 1825, sku: "LLS-3945.32F.38F" },
  { barras: 3.1, length: 1760, sku: "LLS-3945.31F.38F" },
  { barras: 3, length: 1700, sku: "LLS-3945.3IF.38F" },
  { barras: 2.8, length: 1635, sku: "LLS-3945.28F.38F" },
  { barras: 2.6, length: 1510, sku: "LLS-3945.26F.38F" },
  { barras: 2.5, length: 1450, sku: "LLS-3945.25F.38F" },
  { barras: 2, length: 1135, sku: "LLS-3945.2IF.38F" },
  { barras: 1, length: 575, sku: "LLS-3945.1IF.38F" },
];

const mlModules = [
  { barras: 6, length: 3380, sku: "LLS-3945.6ML.38F" },
  { barras: 5.8, length: 3320, sku: "LLS-3945.58M.38F" },
  { barras: 5.3, length: 3005, sku: "LLS-3945.53M.38F" },
  { barras: 5.2, length: 2945, sku: "LLS-3945.52M.38F" },
  { barras: 5.1, length: 2880, sku: "LLS-3945.51M.38F" },
  { barras: 5, length: 2820, sku: "LLS-3945.5ML.38F" },
  { barras: 4.5, length: 2570, sku: "LLS-3945.45M.38F" },
  { barras: 4.4, length: 2505, sku: "LLS-3945.44M.38F" },
  { barras: 4.2, length: 2380, sku: "LLS-3945.42M.38F" },
  { barras: 4, length: 2255, sku: "LLS-3945.4ML.38F" },
  { barras: 3.5, length: 2005, sku: "LLS-3945.35M.38F" },
  { barras: 3.4, length: 1945, sku: "LLS-3945.34M.38F" },
  { barras: 3.3, length: 1880, sku: "LLS-3945.33M.38F" },
  { barras: 3, length: 1695, sku: "LLS-3945.3ML.38F" },
  { barras: 2.3, length: 1320, sku: "LLS-3945.23M.38F" },
  { barras: 2.2, length: 1255, sku: "LLS-3945.22M.38F" },
  { barras: 2, length: 1130, sku: "LLS-3945.2ML.38F" },
  { barras: 1.4, length: 820, sku: "LLS-3945.14M.38F" },
  { barras: 1, length: 570, sku: "LLS-3945.1ML.38F" },
];

// Filtrar IF >= 2 barras (MIN_BARS_FOR_COMPOSITION = 2)
const validIFs = ifModules.filter(m => m.barras >= 2);
const validMLs = mlModules.filter(m => m.barras >= 2);

// Simular buildIfMlComposition
const candidates = [];

for (const ifMod of validIFs) {
  const twoIfLength = 2 * ifMod.length;
  if (twoIfLength > requestedLength) continue;

  const remaining = requestedLength - twoIfLength;

  // Candidato A: 2x IF sem ML
  {
    const realizedLength = twoIfLength;
    const moduleCount = 2;
    const brokenCount = (Number.isInteger(ifMod.barras) ? 0 : 1) * 2;
    const maxLength = ifMod.length;
    candidates.push({ ifMod, mlItems: [], realizedLength, moduleCount, skuVariety: 1, balance: 0, maxLength, brokenCount });
  }

  // Candidato B: 2x IF + ML
  if (validMLs.length > 0 && remaining > 0) {
    const mlItems = [];
    let rem = remaining;
    for (const ml of validMLs) {
      while (rem >= ml.length) {
        mlItems.push(ml);
        rem -= ml.length;
      }
    }
    if (mlItems.length > 0) {
      const realizedLength = requestedLength - rem;
      const moduleCount = 2 + mlItems.length;
      const allLengths = [ifMod.length, ifMod.length, ...mlItems.map(m => m.length)];
      const mean = allLengths.reduce((s, v) => s + v, 0) / allLengths.length;
      const balance = Math.sqrt(allLengths.reduce((s, v) => s + (v - mean) ** 2, 0) / allLengths.length);
      const skuVariety = new Set([ifMod.sku, ...mlItems.map(m => m.sku)]).size;
      const maxLength = Math.max(...allLengths);
      const brokenCount = (Number.isInteger(ifMod.barras) ? 0 : 1) * 2
        + mlItems.filter(m => !Number.isInteger(m.barras)).length;
      candidates.push({ ifMod, mlItems, realizedLength, moduleCount, skuVariety, balance, maxLength, brokenCount });
    }
  }
}

// Ordenação geral (linha longa > 5650mm)
  candidates.sort((a, b) => {
  if (b.realizedLength !== a.realizedLength) return b.realizedLength - a.realizedLength;
  if (a.moduleCount !== b.moduleCount) return a.moduleCount - b.moduleCount;
  if (a.skuVariety !== b.skuVariety) return a.skuVariety - b.skuVariety;
  if (a.maxLength !== b.maxLength) return a.maxLength - b.maxLength;
  return a.balance - b.balance;
});

// Verificar "cleanest" (v3.3)
const mostExact = candidates[0];
const cleanest = [...candidates].sort((a, b) => {
  if (a.skuVariety !== b.skuVariety) return a.skuVariety - b.skuVariety;
  if (a.moduleCount !== b.moduleCount) return a.moduleCount - b.moduleCount;
  if (a.maxLength !== b.maxLength) return a.maxLength - b.maxLength;
  return a.balance - b.balance;
})[0];

const cleanTolerance = Math.min(100, Math.max(30, requestedLength * 0.002));
const lengthDiff = mostExact.realizedLength - cleanest.realizedLength;

console.log("=== BLAZE S 7900mm com barras quebradas ===");
console.log(`\nTop 5 candidatos (ordenados por realizedLength desc):`);
candidates.slice(0, 5).forEach((c, i) => {
  const modules = [c.ifMod.sku, c.ifMod.sku, ...c.mlItems.map(m => m.sku)];
  console.log(`  [${i+1}] ${modules.join(" + ")} = ${c.realizedLength}mm (${requestedLength - c.realizedLength}mm abaixo) | módulos: ${c.moduleCount} | broken: ${c.brokenCount} | skuVariety: ${c.skuVariety}`);
});

console.log(`\nmostExact: ${mostExact.ifMod.sku} x2 + [${mostExact.mlItems.map(m=>m.sku).join(", ")}] = ${mostExact.realizedLength}mm`);
console.log(`cleanest: ${cleanest.ifMod.sku} x2 + [${cleanest.mlItems.map(m=>m.sku).join(", ")}] = ${cleanest.realizedLength}mm`);
console.log(`lengthDiff: ${lengthDiff}mm, cleanTolerance: ${cleanTolerance}mm`);
console.log(`\nRESULTADO FINAL: ${lengthDiff <= cleanTolerance ? "cleanest" : "mostExact"}`);
const best = lengthDiff <= cleanTolerance ? cleanest : mostExact;
const bestModules = [best.ifMod.sku, best.ifMod.sku, ...best.mlItems.map(m=>m.sku)];
console.log(`  ${bestModules.join(" + ")} = ${best.realizedLength}mm (${requestedLength - best.realizedLength}mm abaixo)`);
console.log(`  brokenCount: ${best.brokenCount}`);

console.log("\n=== RESULTADO ESPERADO ===");
console.log("  2x LLS-3945.48F.38F + 1x LLS-3945.42M.38F = 7900mm (2760+2760+2380)");
