// Lokalny podgląd całej strony razem z funkcjami (bez Netlify CLI i kont w chmurze).
//   node scripts/dev-server.mjs            → http://localhost:8955
// Dane i "wysłane" maile lądują w .netlify/dev/ (ignorowane przez Git).
// Podgląd maili: http://localhost:8955/dev/maile
// Hasło panelu lokalnie: z .env (PANEL_HASLO) albo domyślnie "wyszynk-test".

import http from 'node:http';
import path from 'node:path';
import { readFile, readdir, stat } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 8955);
const DEV = path.join(ROOT, '.netlify', 'dev');

// .env (opcjonalnie) - proste KEY=VALUE
try {
  for (const linia of (await readFile(path.join(ROOT, '.env'), 'utf8')).split('\n')) {
    const m = linia.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}
process.env.WYSZYNK_DEV_DIR = DEV;
process.env.SITE_URL = `http://localhost:${PORT}`;
process.env.PANEL_HASLO ||= 'wyszynk-test';
process.env.PANEL_SEKRET ||= randomBytes(32).toString('hex');
if (process.env.RESEND_API_KEY) console.log('UWAGA: RESEND_API_KEY ustawiony - maile pójdą naprawdę!');

const FUNKCJE = [
  ['/api/grafik', 'api-grafik'],
  ['/api/rezerwacja', 'api-rezerwacja'],
  ['/api/catering', 'api-catering'],
  ['/api/impreza', 'api-impreza'],
  ['/api/godziny', 'api-godziny'],
  ['/llms.txt', 'llms'],
  ['/rezerwacja/decyzja', 'decyzja'],
  ['/api/panel/', 'api-panel', true]
];
const TYPY = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };

async function funkcja(nazwa) {
  return (await import(pathToFileURL(path.join(ROOT, 'netlify/functions', nazwa + '.mjs')).href)).default;
}

async function podgladMaili(res, plik) {
  const katalog = path.join(DEV, 'maile');
  if (plik) {
    const p = path.join(katalog, path.basename(decodeURIComponent(plik)));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(await readFile(p));
  }
  let pliki = [];
  try { pliki = (await readdir(katalog)).filter((f) => f.endsWith('.html')).sort().reverse(); } catch {}
  const wiersze = await Promise.all(pliki.map(async (f) => {
    const naglowek = (await readFile(path.join(katalog, f), 'utf8')).split('\n')[0];
    const [, doK, , temat] = naglowek.match(/DO: (.*?) \| ODPOWIEDZ-DO: (.*?) \| TEMAT: (.*?) -->/) || [];
    return `<tr><td>${new Date(Number(f.split('-')[0])).toLocaleString('pl-PL')}</td><td>${doK || ''}</td><td><a href="/dev/maile/${encodeURIComponent(f)}" target="podglad">${temat || f}</a></td></tr>`;
  }));
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><meta charset="utf-8"><title>Maile (lokalnie)</title>
<body style="margin:0;font-family:system-ui;display:grid;grid-template-columns:minmax(380px,40%) 1fr;height:100vh">
<div style="overflow:auto;padding:12px"><h2 style="margin:4px 0 10px">Wysłane maile (tryb lokalny)</h2>
<table style="font-size:13px;border-collapse:collapse" cellpadding="6" border="1"><tr><th>Kiedy</th><th>Do</th><th>Temat</th></tr>${wiersze.join('') || '<tr><td colspan=3>Brak</td></tr>'}</table></div>
<iframe name="podglad" style="border:0;border-left:1px solid #ccc;width:100%;height:100%"></iframe></body>`);
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname === '/dev/maile' || url.pathname.startsWith('/dev/maile/')) return await podgladMaili(res, url.pathname.slice('/dev/maile/'.length));

    const trafienie = FUNKCJE.find(([p, , prefiks]) => (prefiks ? url.pathname.startsWith(p) : url.pathname === p));
    if (trafienie) {
      const cialo = await new Promise((ok) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => ok(Buffer.concat(c))); });
      const naglowki = new Headers();
      for (const [k, v] of Object.entries(req.headers)) naglowki.set(k, Array.isArray(v) ? v.join(', ') : v);
      naglowki.set('x-nf-client-connection-ip', req.socket.remoteAddress || '');
      const request = new Request(url, { method: req.method, headers: naglowki, body: ['GET', 'HEAD'].includes(req.method) ? undefined : cialo });
      const odp = await (await funkcja(trafienie[1]))(request, {});
      const h = {};
      odp.headers.forEach((v, k) => { h[k] = v; });
      res.writeHead(odp.status, h);
      return res.end(Buffer.from(await odp.arrayBuffer()));
    }

    let plik = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
    if (!plik.startsWith(ROOT) || /[\\/]\.(git|env|netlify)/.test(plik.slice(ROOT.length))) { res.writeHead(403); return res.end(); }
    try { if ((await stat(plik)).isDirectory()) plik = path.join(plik, 'index.html'); } catch {}
    const dane = await readFile(plik);
    res.writeHead(200, { 'Content-Type': TYPY[path.extname(plik)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(dane);
  } catch (e) {
    if (e.code !== 'ENOENT') console.error(e);
    res.writeHead(e.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(e.code === 'ENOENT' ? 'Nie znaleziono' : 'Błąd serwera');
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Podgląd: http://localhost:${PORT}  |  panel: /panel/ (hasło: ${process.env.PANEL_HASLO})  |  maile: /dev/maile`);
});
