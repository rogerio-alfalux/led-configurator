const { createConnection } = require('mysql2/promise');
async function main() {
  const conn = await createConnection(process.env.DATABASE_URL);
  const [rows] = await conn.execute(
    `SELECT qi.id, qi.itemNumber, qi.itemData 
     FROM quote_items qi 
     JOIN quotes q ON q.id = qi.quoteId 
     WHERE q.quoteNumber = '33.0071-26' 
     ORDER BY qi.id DESC LIMIT 100`
  );
  for (const r of rows) {
    const d = JSON.parse(r.itemData);
    if ((d.sku && (d.sku.includes('LDS') || d.sku.includes('LUNA'))) || 
        (d.description && d.description.includes('LUNA'))) {
      console.log('=== FOUND ===');
      console.log('itemNumber:', r.itemNumber, '| id:', r.id);
      console.log('sku:', d.sku);
      console.log('description:', d.description);
      console.log('drivers:', d.drivers);
      console.log('driverLines:', JSON.stringify(d.driverLines));
      console.log('category:', d.category);
      console.log('accessories:', JSON.stringify(d.accessories?.slice(0,2)));
    }
  }
  await conn.end();
  console.log('Done');
}
main().catch(console.error);
