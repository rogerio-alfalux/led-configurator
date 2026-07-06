/**
 * Script de manutenção: corrige driverTotalPrice nos itens do banco
 * Executa: node fix-driver-totals.mjs
 */
import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Ler DATABASE_URL do .env
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  try {
    const envPath = resolve(__dirname, ".env");
    const envContent = readFileSync(envPath, "utf-8");
    const match = envContent.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
    if (match) dbUrl = match[1];
  } catch {}
}

if (!dbUrl) {
  console.error("DATABASE_URL não encontrada. Execute: DATABASE_URL=... node fix-driver-totals.mjs");
  process.exit(1);
}

// Função: corrige driverLines de um item
function fixItemData(itemDataStr) {
  try {
    const d = JSON.parse(itemDataStr);
    if (!d || !d.driverLines || !Array.isArray(d.driverLines) || d.driverLines.length === 0) {
      return { changed: false, fixedData: itemDataStr, total: d?.totalPrice ?? 0 };
    }

    const qty = d.qty ?? 1;
    let changed = false;

    const fixedDriverLines = d.driverLines.map((dl) => {
      if (dl.driverUnitPrice != null && dl.driverQty != null && dl.driverQty > 0) {
        const expectedTotal = Math.round(dl.driverUnitPrice * dl.driverQty * 100) / 100;
        const currentTotal = dl.driverTotalPrice ?? 0;
        // Se o total atual é igual ao preço unitário (bug: qty=1) ou difere do esperado
        if (Math.abs(currentTotal - expectedTotal) > 0.02) {
          console.log(`  Driver ${dl.driverModel ?? dl.driverCode}: driverTotalPrice ${currentTotal} → ${expectedTotal} (driverUnitPrice=${dl.driverUnitPrice}, driverQty=${dl.driverQty})`);
          changed = true;
          return { ...dl, driverTotalPrice: expectedTotal };
        }
      }
      return dl;
    });

    // Calcular total da luminária
    let lumTotal = 0;
    if (d.priceWithoutDriver != null) {
      const isUnitOnly = d.unitPriceLuminaria != null &&
        Math.abs(d.priceWithoutDriver - d.unitPriceLuminaria) < 0.02 &&
        qty > 1;
      lumTotal = isUnitOnly ? d.unitPriceLuminaria * qty : d.priceWithoutDriver;
      if (isUnitOnly) {
        console.log(`  priceWithoutDriver corrigido: ${d.priceWithoutDriver} → ${lumTotal} (unitPriceLuminaria=${d.unitPriceLuminaria} × qty=${qty})`);
        changed = true;
      }
    } else {
      const unitLum = d.unitPriceLuminaria ?? d.unitPrice ?? null;
      lumTotal = unitLum != null ? unitLum * qty : (d.totalPrice ?? 0);
    }

    const drvTotal = fixedDriverLines.reduce((s, dl) => s + (dl.driverTotalPrice ?? 0), 0);
    const newTotal = Math.round((lumTotal + drvTotal) * 100) / 100;

    if (changed || Math.abs((d.totalPrice ?? 0) - newTotal) > 0.02) {
      changed = true;
      const fixedD = {
        ...d,
        driverLines: fixedDriverLines,
        priceWithoutDriver: Math.round(lumTotal * 100) / 100,
        totalPrice: newTotal,
      };
      return { changed: true, fixedData: JSON.stringify(fixedD), total: newTotal };
    }

    return { changed: false, fixedData: itemDataStr, total: d.totalPrice ?? 0 };
  } catch (e) {
    console.error("Erro ao parsear itemData:", e.message);
    return { changed: false, fixedData: itemDataStr, total: 0 };
  }
}

async function main() {
  console.log("Conectando ao banco de dados...");
  const conn = await createConnection(dbUrl);
  console.log("Conectado!\n");

  // Buscar todos os itens que têm driverLines
  const [items] = await conn.execute(
    `     SELECT qi.id, qi.itemData, qi.quoteVersionId,
            qv.quoteId, qv.version, qv.totalAmount, qv.totalFinal, qv.headerSnapshot,
            q.quoteNumber, q.revisionCount
     FROM quote_items qi
     JOIN quote_versions qv ON qv.id = qi.quoteVersionId
     JOIN quotes q ON q.id = qv.quoteId
     WHERE qi.itemData LIKE '%driverLines%'
     ORDER BY q.quoteNumber, q.revisionCount, qv.version, qi.id`
  );

  console.log(`Encontrados ${items.length} itens com driverLines.\n`);

  let itemsFixed = 0;
  let quotesFixed = new Set();

  for (const item of items) {
    const { changed, fixedData, total } = fixItemData(item.itemData);
    if (changed) {
      console.log(`Orçamento ${item.quoteNumber}-${item.revisionCount} (versão ${item.version}), item ID ${item.id}:`);
      await conn.execute(
        `UPDATE quote_items SET itemData = ? WHERE id = ?`,
        [fixedData, item.id]
      );
      itemsFixed++;
      quotesFixed.add(`${item.quoteId}-${item.quoteVersionId}`);
      console.log(`  ✓ Item corrigido. Novo totalPrice: ${total}\n`);
    }
  }

  console.log(`\n${itemsFixed} itens corrigidos em ${quotesFixed.size} versões de orçamento.`);

  // Agora recalcular totalAmount e totalFinal para todas as versões afetadas
  if (quotesFixed.size > 0) {
    console.log("\nRecalculando totais dos orçamentos afetados...");

    // Buscar versões únicas afetadas
    const affectedVersionIds = [...new Set([...quotesFixed].map(k => k.split('-')[1]))];

    for (const versionId of affectedVersionIds) {
      // Buscar todos os itens da versão
      const [vItems] = await conn.execute(
        `SELECT qi.itemData FROM quote_items qi WHERE qi.quoteVersionId = ?`,
        [versionId]
      );

      // Calcular novo totalBase
      let newTotalBase = 0;
      for (const vi of vItems) {
        const d = JSON.parse(vi.itemData);
        if (d.driverLines && d.driverLines.length > 0) {
          const lumTotal = d.priceWithoutDriver ?? (d.unitPriceLuminaria != null ? d.unitPriceLuminaria * (d.qty ?? 1) : 0);
          const drvTotal = d.driverLines.reduce((s, dl) => s + (dl.driverTotalPrice ?? 0), 0);
          newTotalBase += lumTotal + drvTotal;
        } else {
          newTotalBase += d.totalPrice ?? 0;
        }
      }

      // Buscar snapshot para RT, margem, frete, DIFAL, FCP
      const [[version]] = await conn.execute(
        `SELECT headerSnapshot, quoteId FROM quote_versions WHERE id = ?`,
        [versionId]
      );

      let rtPct = 0, marginPct = 0, freteValor = 0, difalVal = 0, fcpVal = 0;
      try {
        const snap = JSON.parse(version.headerSnapshot);
        rtPct = snap.rtPercent ? parseFloat(String(snap.rtPercent)) : 0;
        marginPct = snap.marginPercent ? parseFloat(String(snap.marginPercent)) : 0;
        freteValor = (snap.freteIncluded && snap.freteValue) ? parseFloat(String(snap.freteValue)) : 0;
        difalVal = (snap.difalEnabled && snap.difalValue) ? parseFloat(String(snap.difalValue)) : 0;
        fcpVal = (snap.fcpEnabled && snap.fcpValue) ? parseFloat(String(snap.fcpValue)) : 0;
      } catch {}

      const totalComRT = rtPct > 0 ? newTotalBase / (1 - rtPct) : newTotalBase;
      const totalFinalCalc = marginPct > 0 ? totalComRT / (1 - marginPct) : totalComRT;
      const newTotalFinal = Math.round((totalFinalCalc + freteValor + difalVal + fcpVal) * 100) / 100;
      const newTotalAmount = Math.round(newTotalBase * 100) / 100;

      await conn.execute(
        `UPDATE quote_versions SET totalAmount = ?, totalFinal = ? WHERE id = ?`,
        [String(newTotalAmount), String(newTotalFinal), versionId]
      );

      // Atualizar também a tabela quotes para a versão mais recente
      await conn.execute(
        `UPDATE quotes SET totalAmount = ?, totalFinal = ? 
         WHERE id = ? AND currentVersion = (SELECT version FROM quote_versions WHERE id = ?)`,
        [String(newTotalAmount), String(newTotalFinal), version.quoteId, versionId]
      );

      console.log(`  Versão ${versionId}: totalBase=${newTotalAmount}, totalFinal=${newTotalFinal}`);
    }
  }

  await conn.end();
  console.log("\n✓ Concluído!");
}

main().catch(e => {
  console.error("Erro:", e);
  process.exit(1);
});
