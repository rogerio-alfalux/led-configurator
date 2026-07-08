import { createConnection } from 'mysql2/promise';
const conn = await createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(
  "SELECT id, itemData FROM quote_items WHERE itemData LIKE '%EQ00396%' LIMIT 1"
);
for (const row of rows) {
  try {
    const parsed = JSON.parse(row.itemData);
    console.log('--- item', row.id, '---');
    console.log('ALL KEYS:', Object.keys(parsed));
    // Mostrar todos os campos que contêm "driver" ou "EQ"
    for (const [k, v] of Object.entries(parsed)) {
      const str = JSON.stringify(v);
      if (str && (str.includes('EQ00396') || str.includes('driver') || str.includes('Driver'))) {
        console.log(`  ${k}:`, JSON.stringify(v).substring(0, 300));
      }
    }
  } catch(e) { console.log('parse error', e.message); }
}
await conn.end();
