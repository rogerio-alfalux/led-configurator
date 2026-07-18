const { createConnection } = require('mysql2/promise');
const url = process.env.DATABASE_URL;

async function main() {
  const conn = await createConnection(url);
  const [rows] = await conn.execute(
    `SELECT qi.id, qi.itemNumber, qi.itemData 
     FROM quote_items qi 
     JOIN quotes q ON q.id = qi.quoteId 
     WHERE q.quoteNumber = '33.0071-26' 
     AND qi.itemData LIKE '%LDS-7230%'
     ORDER BY qi.id DESC LIMIT 5`
  );
  for (const r of rows) {
    const d = JSON.parse(r.itemData);
    console.log('itemNumber:', r.itemNumber, '| sku:', d.sku);
    console.log('  drivers:', d.drivers);
    console.log('  driverLines:', JSON.stringify(d.driverLines));
    console.log('  accessories:', JSON.stringify(d.accessories?.slice(0,2)));
  }
  await conn.end();
}
main().catch(console.error);
