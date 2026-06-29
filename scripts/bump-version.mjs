#!/usr/bin/env node
/**
 * bump-version.mjs
 * Incrementa o patch da versão no package.json (ex: 32.44 → 32.45).
 * Executado automaticamente via script "version:bump" antes de cada checkpoint/publicação.
 *
 * Formato de versão: MAJOR.PATCH (ex: 32.44)
 * - MAJOR: número da linha de produto (fixo, alterado manualmente)
 * - PATCH: incrementado automaticamente a cada bump
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = resolve(__dirname, "../package.json");

const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
const current = pkg.version ?? "32.0";

const parts = current.split(".");
if (parts.length < 2) {
  console.error(`Formato de versão inválido: "${current}". Esperado MAJOR.PATCH`);
  process.exit(1);
}

const major = parts[0];
const patch = parseInt(parts[1], 10);
if (isNaN(patch)) {
  console.error(`Patch não é um número: "${parts[1]}"`);
  process.exit(1);
}

const newVersion = `${major}.${patch + 1}`;
pkg.version = newVersion;

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
console.log(`✓ Versão atualizada: ${current} → ${newVersion}`);
