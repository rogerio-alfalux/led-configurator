const { createConnection } = require('mysql2/promise');
async function main() {
  const conn = await createConnection(process.env.DATABASE_URL);
  
  // Buscar o orçamento 33.0071-26
  const [quotes] = await conn.execute(
    `SELECT id, quoteNumber FROM quotes WHERE quoteNumber LIKE '33.0071-26%' LIMIT 5`
  );
  console.log('Quotes:', JSON.stringify(quotes));
  
  for (const q of quotes) {
    // Buscar versões ordenadas pela mais recente
    const [versions] = await conn.execute(
      `SELECT id, quoteId, createdAt FROM quote_versions WHERE quoteId = ? ORDER BY createdAt DESC LIMIT 5`,
      [q.id]
    );
    console.log('Versions for quote', q.id, ':', JSON.stringify(versions));
    
    // Verificar se versionId 7140001 está nessa lista
    const v7140001 = versions.find(v => v.id === '7140001' || v.id === 7140001);
    console.log('Version 7140001 found?', !!v7140001);
    
    // Buscar item LDS-7230 em cada versão
    for (const v of versions) {
      const [items] = await conn.execute(
        `SELECT id, itemNumber FROM quote_items WHERE quoteVersionId = ? AND itemData LIKE '%LDS-7230%'`,
        [v.id]
      );
      if (items.length > 0) {
        console.log(`  Version ${v.id}: found ${items.length} LDS-7230 items:`, items.map(i => `item#${i.itemNumber} id:${i.id}`));
      }
    }
  }
  
  await conn.end();
  console.log('Done');
}
main().catch(console.error);
