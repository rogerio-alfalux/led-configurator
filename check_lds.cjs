const { createConnection } = require('mysql2/promise');
async function main() {
  const conn = await createConnection(process.env.DATABASE_URL);
  
  // Buscar qualquer item com LDS-7230 no banco
  const [rows] = await conn.execute(
    `SELECT qi.id, qi.itemNumber, qi.quoteVersionId, qi.itemData,
            q.quoteNumber, q.id as quoteId
     FROM quote_items qi 
     JOIN quotes q ON q.id = qi.quoteId 
     WHERE qi.itemData LIKE '%LDS-7230%'
     ORDER BY qi.id DESC LIMIT 10`
  );
  
  console.log('Total encontrados:', rows.length);
  for (const r of rows) {
    const d = JSON.parse(r.itemData);
    console.log('=== ITEM ===');
    console.log('quoteNumber:', r.quoteNumber, '| itemNumber:', r.itemNumber, '| id:', r.id, '| versionId:', r.quoteVersionId);
    console.log('sku:', d.sku);
    console.log('description:', d.description);
    console.log('drivers:', d.drivers);
    console.log('driverLines:', JSON.stringify(d.driverLines));
    console.log('accessories:', JSON.stringify(d.accessories?.slice(0,2)));
  }
  
  await conn.end();
  console.log('Done');
}
main().catch(console.error);
