const { createConnection } = require('mysql2/promise');
async function main() {
  const conn = await createConnection(process.env.DATABASE_URL);
  
  // Buscar o quoteId e versões do orçamento 33.0071-26
  const [quotes] = await conn.execute(
    `SELECT id, quoteNumber, currentVersion FROM quotes WHERE quoteNumber = '33.0071-26' LIMIT 5`
  );
  console.log('Quotes:', JSON.stringify(quotes));
  
  for (const q of quotes) {
    // Buscar versões
    const [versions] = await conn.execute(
      `SELECT id, quoteId, version FROM quote_versions WHERE quoteId = ? ORDER BY version DESC LIMIT 5`,
      [q.id]
    );
    console.log('Versions for quote', q.id, ':', JSON.stringify(versions));
    
    // Buscar itens da versão mais recente
    if (versions.length > 0) {
      const latestVersionId = versions[0].id;
      const [items] = await conn.execute(
        `SELECT id, itemNumber, quoteVersionId, LEFT(itemData, 200) as preview FROM quote_items WHERE quoteVersionId = ? ORDER BY itemNumber`,
        [latestVersionId]
      );
      console.log('Items in latest version', latestVersionId, ':');
      for (const item of items) {
        const d = JSON.parse(item.preview + '...}').catch ? item.preview : (() => { try { return JSON.parse(item.preview); } catch { return {}; } })();
        console.log(`  item ${item.itemNumber}: ${d.sku || '?'} | ${d.description?.substring(0, 40) || '?'}`);
      }
    }
  }
  
  await conn.end();
  console.log('Done');
}
main().catch(console.error);
