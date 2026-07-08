import { createConnection } from 'mysql2/promise';
const conn = await createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(
  "SELECT id, SUBSTRING(itemData, 1, 5000) as d FROM quote_items WHERE itemData LIKE '%EQ00396%' LIMIT 5"
);
for (const row of rows) {
  try {
    const parsed = JSON.parse(row.d);
    console.log('--- item', row.id, '---');
    console.log('driverLines:', JSON.stringify(parsed.driverLines));
    console.log('profileSegments count:', parsed.profileSegments?.length);
    console.log('totalPrice:', parsed.totalPrice);
    console.log('qty:', parsed.qty);
    if (parsed.profileSegments?.[0]) {
      const seg = parsed.profileSegments[0];
      console.log('seg[0] driverCode:', seg.driverCode, 'driverQtyPerPiece:', seg.driverQtyPerPiece, 'qty:', seg.qty);
    }
  } catch(e) { console.log('parse error', e.message); }
}
await conn.end();
