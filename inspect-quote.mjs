/**
 * Script de inspeção: mostra os driverLines dos itens 25 e 26 do orçamento 25.0169
 */
import { createConnection } from "mysql2/promise";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL não encontrada.");
  process.exit(1);
}

const conn = await createConnection(dbUrl);

// Buscar o orçamento 25.0169
const [quotes] = await conn.execute(
  `SELECT id, quoteNumber, revisionCount, currentVersion FROM quotes WHERE quoteNumber LIKE '25.0169%' ORDER BY id DESC LIMIT 5`
);
console.log("Orçamentos encontrados:", JSON.stringify(quotes, null, 2));

for (const q of quotes) {
  console.log(`\n=== Orçamento ${q.quoteNumber} (ID: ${q.id}, revisionCount: ${q.revisionCount}) ===`);
  
  // Buscar versão mais recente
  const [versions] = await conn.execute(
    `SELECT id, version FROM quote_versions WHERE quoteId = ? ORDER BY version DESC LIMIT 1`,
    [q.id]
  );
  if (versions.length === 0) continue;
  
  const v = versions[0];
  console.log(`Versão: ${v.version} (ID: ${v.id})`);
  
  // Buscar itens com driverLines
  const [items] = await conn.execute(
    `SELECT id, itemNumber, itemData FROM quote_items WHERE quoteVersionId = ? AND itemData LIKE '%driverLines%' ORDER BY itemNumber`,
    [v.id]
  );
  
  console.log(`Itens com driverLines: ${items.length}`);
  
  for (const item of items) {
    const d = JSON.parse(item.itemData);
    console.log(`\nItem ${item.itemNumber} (ID: ${item.id}):`);
    console.log(`  description: ${d.description}`);
    console.log(`  qty: ${d.qty}`);
    console.log(`  totalPrice: ${d.totalPrice}`);
    console.log(`  priceWithoutDriver: ${d.priceWithoutDriver}`);
    console.log(`  unitPriceLuminaria: ${d.unitPriceLuminaria}`);
    if (d.driverLines) {
      for (const dl of d.driverLines) {
        console.log(`  Driver: ${dl.driverModel} (${dl.driverCode})`);
        console.log(`    driverQty: ${dl.driverQty}`);
        console.log(`    driverUnitPrice: ${dl.driverUnitPrice}`);
        console.log(`    driverTotalPrice: ${dl.driverTotalPrice}`);
        console.log(`    ESPERADO: ${dl.driverUnitPrice != null && dl.driverQty != null ? dl.driverUnitPrice * dl.driverQty : 'N/A'}`);
      }
    }
  }
}

await conn.end();
