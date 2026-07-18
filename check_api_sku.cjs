// Verificar o que a API retorna para LDS-7230.1T5.31B
const https = require('https');

const url = 'https://api.alfalux.com.br/api/produtos/all';

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const products = json.data || json.products || json;
      const arr = Array.isArray(products) ? products : [];
      const found = arr.filter(p => p.sku === 'LDS-7230.1T5.31B' || (p.codigo && p.codigo === 'LDS-7230.1T5.31B'));
      if (found.length === 0) {
        // Try partial match
        const partial = arr.filter(p => (p.sku || p.codigo || '').includes('LDS-7230'));
        console.log('Partial matches:', partial.map(p => ({ sku: p.sku || p.codigo, driver220: p.driver220, driverBivolt: p.driverBivolt })));
      } else {
        for (const p of found) {
          console.log('SKU:', p.sku || p.codigo);
          console.log('driver220:', JSON.stringify(p.driver220));
          console.log('driverBivolt:', JSON.stringify(p.driverBivolt));
          console.log('driverQtd220:', p.driverQtd220);
          console.log('driverQtdBivolt:', p.driverQtdBivolt);
        }
      }
    } catch(e) {
      console.error('Parse error:', e.message);
      console.log('First 500 chars:', data.substring(0, 500));
    }
  });
}).on('error', e => console.error('HTTP error:', e.message));
