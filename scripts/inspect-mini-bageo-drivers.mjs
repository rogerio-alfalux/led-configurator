import { fetchAllAlfaluxProducts } from "../server/alfaluxApiService.ts";
const products = await fetchAllAlfaluxProducts(true);
const matches = products.filter((p) => String(p.sku).toUpperCase() === "LDP-4912.180.40P" || /MINI BAGEO P LED Ø1800MM 113W/i.test(String(p.name)));
for (const p of matches) {
  const keys = Object.keys(p).filter((key) => /driver|fonte|compos|equip/i.test(key));
  console.log(JSON.stringify({ sku: p.sku, name: p.name, familia: p.familia, instalacao: p.instalacao, fields: Object.fromEntries(keys.map((key) => [key, p[key]])) }, null, 2));
}
console.log(`matches=${matches.length}`);
