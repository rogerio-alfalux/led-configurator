/**
 * Inspeciona os campos de markup e custo retornados pela API Alfalux.
 * Executar com: node inspect_markup.mjs
 */
import https from 'https';

const url = 'https://alfaluxprod-c8zmg2fn.manus.space/api/products/all';

https.get(url, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const json = JSON.parse(data);
    const products = json.products || [];

    // 1. Todos os campos únicos que contêm markup ou custo
    const allKeys = new Set();
    products.forEach(p => Object.keys(p).forEach(k => allKeys.add(k)));
    const markupKeys = [...allKeys].filter(k => /markup/i.test(k)).sort();
    const custoKeys  = [...allKeys].filter(k => /custo/i.test(k)).sort();
    console.log('=== CAMPOS MARKUP ===');
    console.log(markupKeys.length ? markupKeys : '(nenhum)');
    console.log('\n=== CAMPOS CUSTO ===');
    console.log(custoKeys);

    // 2. Produto de perfil com custo preenchido
    const PERFIL_RE = /^(LED BAR|PERFIL FLEXIVEL|BLAZE H|MILANO|MEIA LUA|FLOOR)/i;
    const perfisComCusto = products.filter(p =>
      PERFIL_RE.test(p.familia ?? '') &&
      Object.keys(p).some(k => /custo/i.test(k) && p[k] != null && p[k] > 0)
    );
    console.log(`\n=== PERFIS COM CUSTO PREENCHIDO: ${perfisComCusto.length} ===`);

    if (perfisComCusto.length > 0) {
      const p = perfisComCusto[0];
      console.log(`\nExemplo: ${p.name} | ${p.familia}`);
      const rel = {};
      Object.keys(p)
        .filter(k => /markup|custo|preco|metro|modulo|qtd/i.test(k))
        .forEach(k => rel[k] = p[k]);
      console.log(JSON.stringify(rel, null, 2));
    } else {
      // Mostrar amostra de qualquer perfil
      const anyPerfil = products.find(p => PERFIL_RE.test(p.familia ?? ''));
      if (anyPerfil) {
        console.log(`\nAmostra (sem custo): ${anyPerfil.name} | ${anyPerfil.familia}`);
        const rel = {};
        Object.keys(anyPerfil)
          .filter(k => /markup|custo|preco|metro|modulo|qtd/i.test(k))
          .forEach(k => rel[k] = anyPerfil[k]);
        console.log(JSON.stringify(rel, null, 2));
      }
    }

    // 3. Verificar se markupPadrao/markupMinimo existem em qualquer produto
    const withMarkup = products.filter(p =>
      Object.keys(p).some(k => /markup/i.test(k) && p[k] != null)
    );
    console.log(`\n=== PRODUTOS COM MARKUP PREENCHIDO: ${withMarkup.length} ===`);
    if (withMarkup.length > 0) {
      const p = withMarkup[0];
      console.log(`Exemplo: ${p.name} | ${p.familia}`);
      const rel = {};
      Object.keys(p).filter(k => /markup/i.test(k)).forEach(k => rel[k] = p[k]);
      console.log(JSON.stringify(rel, null, 2));
    }
  });
}).on('error', e => console.error('Erro:', e.message));
