#!/usr/bin/env python3
"""Adiciona preço no resumo de orçamento de painéis, arandelas e spots."""

with open("client/src/pages/Home.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# ─── Painel ──────────────────────────────────────────────────────────────────
old = "{`${panelResult.product.name} ${panelResult.cct} ${panelResult.tensao}`.toUpperCase()}"
new = """{(() => {
                          const preco = getPrecoForControle(panelResult.product, panelResult.controle, panelResult.tensao);
                          const lines = [`${panelResult.product.name} ${panelResult.cct} ${panelResult.tensao}`.toUpperCase()];
                          if (preco !== null) lines.push(`PREÇO: ${formatBRL(preco)}`);
                          return lines.join("\\n");
                        })()}"""
assert old in content, "PAINEL display not found"
content = content.replace(old, new, 1)

old2 = "const txt = `${panelResult.product.name} ${panelResult.cct} ${panelResult.tensao}`.toUpperCase();\n                        navigator.clipboard.writeText(txt);"
new2 = """const preco = getPrecoForControle(panelResult.product, panelResult.controle, panelResult.tensao);
                        const lines = [`${panelResult.product.name} ${panelResult.cct} ${panelResult.tensao}`.toUpperCase()];
                        if (preco !== null) lines.push(`PREÇO: ${formatBRL(preco)}`);
                        const txt = lines.join("\\n");
                        navigator.clipboard.writeText(txt);"""
assert old2 in content, "PAINEL copy not found"
content = content.replace(old2, new2, 1)

# ─── Arandela ────────────────────────────────────────────────────────────────
old3 = "{`${arandelaResult.product.name} ${arandelaResult.cct} ${arandelaResult.tensao}`.toUpperCase()}"
new3 = """{(() => {
                          const preco = getPrecoForControle(arandelaResult.product, arandelaResult.controle, arandelaResult.tensao);
                          const lines = [`${arandelaResult.product.name} ${arandelaResult.cct} ${arandelaResult.tensao}`.toUpperCase()];
                          if (preco !== null) lines.push(`PREÇO: ${formatBRL(preco)}`);
                          return lines.join("\\n");
                        })()}"""
assert old3 in content, "ARANDELA display not found"
content = content.replace(old3, new3, 1)

old4 = "const txt = `${arandelaResult.product.name} ${arandelaResult.cct} ${arandelaResult.tensao}`.toUpperCase();\n                        navigator.clipboard.writeText(txt);"
new4 = """const preco = getPrecoForControle(arandelaResult.product, arandelaResult.controle, arandelaResult.tensao);
                        const lines = [`${arandelaResult.product.name} ${arandelaResult.cct} ${arandelaResult.tensao}`.toUpperCase()];
                        if (preco !== null) lines.push(`PREÇO: ${formatBRL(preco)}`);
                        const txt = lines.join("\\n");
                        navigator.clipboard.writeText(txt);"""
assert old4 in content, "ARANDELA copy not found"
content = content.replace(old4, new4, 1)

# ─── Spot ─────────────────────────────────────────────────────────────────────
old5 = "{`${spotResult.product.name} ${spotResult.cct} ${spotResult.tensao}`.toUpperCase()}"
new5 = """{(() => {
                          const preco = getPrecoForControle(spotResult.product, spotResult.controle, spotResult.tensao);
                          const lines = [`${spotResult.product.name} ${spotResult.cct} ${spotResult.tensao}`.toUpperCase()];
                          if (preco !== null) lines.push(`PREÇO: ${formatBRL(preco)}`);
                          return lines.join("\\n");
                        })()}"""
assert old5 in content, "SPOT display not found"
content = content.replace(old5, new5, 1)

old6 = "const txt = `${spotResult.product.name} ${spotResult.cct} ${spotResult.tensao}`.toUpperCase();\n                        navigator.clipboard.writeText(txt);"
new6 = """const preco = getPrecoForControle(spotResult.product, spotResult.controle, spotResult.tensao);
                        const lines = [`${spotResult.product.name} ${spotResult.cct} ${spotResult.tensao}`.toUpperCase()];
                        if (preco !== null) lines.push(`PREÇO: ${formatBRL(preco)}`);
                        const txt = lines.join("\\n");
                        navigator.clipboard.writeText(txt);"""
assert old6 in content, "SPOT copy not found"
content = content.replace(old6, new6, 1)

with open("client/src/pages/Home.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done: Painel + Arandela + Spot orçamento updated")
