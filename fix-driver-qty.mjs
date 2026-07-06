/**
 * Script de correção: corrige driverQty e driverTotalPrice quando driverQty = driverQtyPerUnit
 * (ou seja, não foi multiplicado pela quantidade de luminárias)
 */
import { createConnection } from "mysql2/promise";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL não encontrada.");
  process.exit(1);
}

const conn = await createConnection(dbUrl);
console.log("Conectado!\n");

// Buscar todos os itens com driverLines e qty > 1
const [items] = await conn.execute(
  `SELECT qi.id, qi.itemData, qi.quoteVersionId,
          qv.quoteId, qv.version, qv.headerSnapshot,
          q.quoteNumber, q.revisionCount
   FROM quote_items qi
   JOIN quote_versions qv ON qv.id = qi.quoteVersionId
   JOIN quotes q ON q.id = qv.quoteId
   WHERE qi.itemData LIKE '%driverLines%'
   ORDER BY q.quoteNumber, q.revisionCount, qv.version, qi.id`
);

console.log(`Total de itens com driverLines: ${items.length}\n`);

let itemsFixed = 0;
const quotesFixed = new Set();

for (const item of items) {
  let d;
  try {
    d = JSON.parse(item.itemData);
  } catch {
    continue;
  }

  if (!d.driverLines || !Array.isArray(d.driverLines) || d.driverLines.length === 0) continue;

  const qty = d.qty ?? 1;
  if (qty <= 1) continue; // Não há problema para qty=1

  let changed = false;
  const fixedDriverLines = d.driverLines.map((dl) => {
    const driverQtyPerUnit = d.driverQtyPerUnit ?? 1;
    const expectedDriverQty = driverQtyPerUnit * qty;
    const currentDriverQty = dl.driverQty ?? 0;
    
    // Bug: driverQty == driverQtyPerUnit (não foi multiplicado por qty)
    // Mas apenas se driverQtyPerUnit < qty (para evitar falsos positivos)
    if (
      currentDriverQty === driverQtyPerUnit &&
      expectedDriverQty !== currentDriverQty &&
      driverQtyPerUnit < qty
    ) {
      const newDriverTotalPrice = Math.round((dl.driverUnitPrice ?? 0) * expectedDriverQty * 100) / 100;
      console.log(
        `  Driver ${dl.driverModel} (${dl.driverCode}): driverQty ${currentDriverQty} → ${expectedDriverQty}, ` +
        `driverTotalPrice ${dl.driverTotalPrice} → ${newDriverTotalPrice}`
      );
      changed = true;
      return { ...dl, driverQty: expectedDriverQty, driverTotalPrice: newDriverTotalPrice };
    }
    return dl;
  });

  if (!changed) continue;

  // Recalcular totalPrice do item
  const lumTotal = d.priceWithoutDriver ?? (d.unitPriceLuminaria != null ? d.unitPriceLuminaria * qty : 0);
  const drvTotal = fixedDriverLines.reduce((s, dl) => s + (dl.driverTotalPrice ?? 0), 0);
  const newTotalPrice = Math.round((lumTotal + drvTotal) * 100) / 100;

  console.log(
    `Orçamento ${item.quoteNumber}-${item.revisionCount} (versão ${item.version}), item ID ${item.id}: ` +
    `totalPrice ${d.totalPrice} → ${newTotalPrice}`
  );

  const fixedData = JSON.stringify({
    ...d,
    driverLines: fixedDriverLines,
    totalPrice: newTotalPrice,
  });

  await conn.execute(`UPDATE quote_items SET itemData = ? WHERE id = ?`, [fixedData, item.id]);
  itemsFixed++;
  quotesFixed.add(`${item.quoteId}|${item.quoteVersionId}|${item.version}`);
  console.log(`  ✓ Item corrigido.\n`);
}

console.log(`\n${itemsFixed} itens corrigidos em ${quotesFixed.size} versões de orçamento.`);

// Recalcular totalAmount e totalFinal das versões afetadas
if (quotesFixed.size > 0) {
  console.log("\nRecalculando totais dos orçamentos afetados...");

  const affectedVersionIds = [...new Set([...quotesFixed].map(k => k.split('|')[1]))];

  for (const versionId of affectedVersionIds) {
    const [vItems] = await conn.execute(
      `SELECT itemData FROM quote_items WHERE quoteVersionId = ?`,
      [versionId]
    );

    let newTotalBase = 0;
    for (const vi of vItems) {
      const d = JSON.parse(vi.itemData);
      newTotalBase += d.totalPrice ?? 0;
    }

    const [[version]] = await conn.execute(
      `SELECT headerSnapshot, quoteId FROM quote_versions WHERE id = ?`,
      [versionId]
    );

    let rtPct = 0, marginPct = 0, freteValor = 0, difalVal = 0, fcpVal = 0;
    try {
      const snap = JSON.parse(version.headerSnapshot);
      rtPct = snap.rtPercent ? parseFloat(String(snap.rtPercent)) : 0;
      marginPct = snap.marginPercent ? parseFloat(String(snap.marginPercent)) : 0;
      freteValor = (snap.freteIncluded && snap.freteValue) ? parseFloat(String(snap.freteValue)) : 0;
      difalVal = (snap.difalEnabled && snap.difalValue) ? parseFloat(String(snap.difalValue)) : 0;
      fcpVal = (snap.fcpEnabled && snap.fcpValue) ? parseFloat(String(snap.fcpValue)) : 0;
    } catch {}

    const totalComRT = rtPct > 0 ? newTotalBase / (1 - rtPct) : newTotalBase;
    const totalFinalCalc = marginPct > 0 ? totalComRT / (1 - marginPct) : totalComRT;
    const newTotalFinal = Math.round((totalFinalCalc + freteValor + difalVal + fcpVal) * 100) / 100;
    const newTotalAmount = Math.round(newTotalBase * 100) / 100;

    await conn.execute(
      `UPDATE quote_versions SET totalAmount = ?, totalFinal = ? WHERE id = ?`,
      [String(newTotalAmount), String(newTotalFinal), versionId]
    );

    await conn.execute(
      `UPDATE quotes SET totalAmount = ?, totalFinal = ?
       WHERE id = ? AND currentVersion = (SELECT version FROM quote_versions WHERE id = ?)`,
      [String(newTotalAmount), String(newTotalFinal), version.quoteId, versionId]
    );

    console.log(`  Versão ${versionId}: totalBase=${newTotalAmount}, totalFinal=${newTotalFinal}`);
  }
}

await conn.end();
console.log("\n✓ Concluído!");
