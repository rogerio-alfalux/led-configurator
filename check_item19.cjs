const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Buscar o orçamento 33.0071-26 versão mais recente
  const [quotes] = await conn.query(
    `SELECT id, quoteNumber, currentVersion FROM quotes WHERE quoteNumber = '33.0071-26' ORDER BY currentVersion DESC LIMIT 1`
  );
  console.log('Quote:', JSON.stringify(quotes[0]));
  
  if (!quotes[0]) { conn.end(); return; }
  const quoteId = quotes[0].id;
  
  // Buscar itens com BLAZE EMBUTIR 18W
  const [items] = await conn.query(
    `SELECT id, itemNumber, itemData FROM quote_items WHERE quoteId = ? ORDER BY itemNumber`,
    [quoteId]
  );
  
  for (const item of items) {
    try {
      const data = JSON.parse(item.itemData);
      if (data.profileSegments && data.profileSegments.some((s) => s.sku && s.sku.includes('2810'))) {
        console.log(`\nItem ${item.itemNumber}:`);
        console.log('  SKU:', data.sku);
        console.log('  Description:', data.description);
        console.log('  Power:', data.power);
        console.log('  stripMethod:', data.stripMethod);
        console.log('  Segments:', data.profileSegments.length);
        for (const seg of data.profileSegments.slice(0, 3)) {
          console.log('    seg.sku:', seg.sku, '| ledModuleCode:', seg.ledModuleCode, '| barsPerPiece:', seg.barsPerPiece);
        }
      }
    } catch(e) {}
  }
  
  conn.end();
}

main().catch(console.error);
