import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

const envContent = readFileSync('/home/ubuntu/led-configurator/.env', 'utf-8');
const dbUrl = envContent.split('\n').find(l => l.startsWith('DATABASE_URL'))?.split('=').slice(1).join('=')?.replace(/"/g, '');

async function main() {
  const conn = await mysql.createConnection(dbUrl!);

  const [rows1]: any = await conn.query(`SELECT COUNT(*) as cnt FROM quotes WHERE YEAR(approvedAt) = 2026 AND MONTH(approvedAt) = 7 AND status = 'approved'`);
  console.log(`Dashboard (approvedAt July 2026): ${rows1[0].cnt}`);

  const [rows2]: any = await conn.query(`SELECT COUNT(*) as cnt FROM quotes WHERE status = 'approved' AND DATE(createdAt) >= '2026-07-01' AND DATE(createdAt) <= '2026-07-31'`);
  console.log(`listQuotes (createdAt July 2026, status=approved): ${rows2[0].cnt}`);

  const [rows3]: any = await conn.query(`SELECT SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as cnt FROM quotes WHERE YEAR(createdAt) = 2026 AND MONTH(createdAt) = 7`);
  console.log(`conversionMetrics (createdAt July 2026, status=approved): ${rows3[0].cnt}`);

  const [rows4]: any = await conn.query(`SELECT COUNT(*) as cnt FROM quotes WHERE YEAR(approvedAt) = 2026 AND MONTH(approvedAt) = 7 AND status = 'approved' AND MONTH(createdAt) != 7`);
  console.log(`Approved in July but CREATED in other months: ${rows4[0].cnt}`);

  const [rows5]: any = await conn.query(`SELECT COUNT(*) as cnt FROM quotes WHERE YEAR(createdAt) = 2026 AND MONTH(createdAt) = 7 AND status = 'approved' AND (MONTH(approvedAt) != 7 OR approvedAt IS NULL)`);
  console.log(`Created in July, approved, but approvedAt NOT July: ${rows5[0].cnt}`);

  await conn.end();
}
main();
