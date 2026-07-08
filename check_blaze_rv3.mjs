import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Buscar o orçamento 04.0173-26
const [quotes] = await conn.execute(
  "SELECT id, quoteNumber FROM quotes WHERE quoteNumber LIKE '04.0173%' LIMIT 5"
);
console.log('Orçamentos:', JSON.stringify(quotes, null, 2));

if (quotes.length > 0) {
  const quoteId = quotes[0].id;
  // Buscar versões
  const [versions] = await conn.execute(
    "SELECT id, version FROM quote_versions WHERE quoteId = ? ORDER BY createdAt DESC LIMIT 5",
    [quoteId]
  );
  console.log('Versões:', JSON.stringify(versions, null, 2));
  
  if (versions.length > 0) {
    const versionId = versions[0].id;
    // Buscar itens BLAZE
    const [items] = await conn.execute(
      "SELECT id, itemData FROM quote_items WHERE quoteVersionId = ? LIMIT 20",
      [versionId]
    );
    
    for (const item of items) {
      const data = JSON.parse(item.itemData);
      if (data.sku && data.sku.includes('LLS-3945')) {
        console.log('\n=== BLAZE ITEM ===');
        console.log('SKU:', data.sku);
        console.log('Description:', data.description);
        console.log('qty (luminárias):', data.qty);
        console.log('driverQtyPerUnit:', data.driverQtyPerUnit);
        console.log('driverLines:', JSON.stringify(data.driverLines?.map(dl => ({
          driverCode: dl.driverCode,
          driverQty: dl.driverQty,
          driverUnitPrice: dl.driverUnitPrice,
          driverTotalPrice: dl.driverTotalPrice
        })), null, 2));
        console.log('profileSegments:');
        if (data.profileSegments) {
          let totalDrvPerLum = 0;
          for (const seg of data.profileSegments) {
            const drvPerSeg = (seg.driverQtyPerPiece ?? 1) * (seg.qty ?? 1);
            totalDrvPerLum += drvPerSeg;
            console.log(`  qty=${seg.qty}, driverCode=${seg.driverCode}, driverQtyPerPiece=${seg.driverQtyPerPiece} => ${drvPerSeg} drivers desta peça`);
          }
          console.log(`  TOTAL drivers por luminária: ${totalDrvPerLum}`);
          console.log(`  TOTAL drivers correto (${totalDrvPerLum} × ${data.qty} lum): ${totalDrvPerLum * (data.qty ?? 1)}`);
        }
      }
    }
  }
}

await conn.end();
