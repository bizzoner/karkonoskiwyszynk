// Generuje statyczne wersje językowe: /en/, /de/, /cs/ oraz /en/historia/ itd.
// Źródłem prawdy są polskie strony (index.html, historia/index.html) i ich
// słowniki inline (I18N_DANE, HISTORY_COPY). Tłumaczenie odtwarza dokładnie to,
// co robi skrypt w przeglądarce, tylko po stronie serwera - Google widzi treść
// w każdym języku pod własnym adresem (hreflang, canonical, sitemap).
//
//   npm run jezyki            - zapisuje wersje językowe i bloki hreflang
//   npm run jezyki -- --check - błąd, jeśli coś jest nieaktualne
//
// Uruchamiaj po każdej zmianie index.html lub historia/index.html
// (po `npm run menu`, bo menu też żyje w index.html).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ADRES = 'https://karkonoskiwyszynk.pl';
const JEZYKI = ['en', 'de', 'cs'];
const LOCALE = { pl: 'pl_PL', en: 'en_GB', de: 'de_DE', cs: 'cs_CZ' };
const HREF_START = '<!-- HREFLANG:START (generuje scripts/jezyki.mjs) -->';
const HREF_KONIEC = '<!-- HREFLANG:END -->';

// Tytuły i opisy strony głównej (słownik I18N_DANE nie obejmuje <head>).
const GLOWNA_HEAD = {
  en: {
    title: 'Karkonoski Wyszynk – Restaurant and tavern | Szklarska Poręba',
    description: 'Karkonoski Wyszynk in Szklarska Poręba: home-style lunches, hand-made pierogi, pork knuckle and Pilsner Urquell on tap. Town centre, ground floor of Villa Bożena. Book a table online.'
  },
  de: {
    title: 'Karkonoski Wyszynk – Restaurant und Gasthaus | Szklarska Poręba (Schreiberhau)',
    description: 'Karkonoski Wyszynk in Szklarska Poręba (Schreiberhau): Hausmannskost, handgemachte Piroggen, Schweinshaxe und Pilsner Urquell vom Fass. Im Zentrum, Erdgeschoss der Villa Bożena. Tisch online reservieren.'
  },
  cs: {
    title: 'Karkonoski Wyszynk – Restaurace a hospoda | Szklarska Poręba',
    description: 'Karkonoski Wyszynk ve Szklarské Porębě: domácí obědy, ručně dělané pirohy, vepřové koleno a čepovaný Pilsner Urquell. Centrum města, přízemí Villa Bożena. Rezervujte si stůl online.'
  }
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => esc(s).replace(/"/g, '&quot;');
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

// Słownik z inline'owego <script>: kod od `var NAZWA = {` do granicy (bez IIFE z DOM).
function slownik(html, nazwa, granica) {
  const i = html.indexOf(`var ${nazwa} = {`);
  const j = html.indexOf(granica, i);
  if (i === -1 || j === -1) throw new Error(`Nie znaleziono słownika ${nazwa}.`);
  const ctx = {};
  vm.runInNewContext(html.slice(i, j) + `\nthis.${nazwa} = ${nazwa};`, ctx);
  return ctx[nazwa];
}

// Zakres [start, koniec) poza <script> i <style> - tylko tam szukamy atrybutów i18n.
function zakresyHtml(html) {
  const out = [];
  const re = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi;
  let pos = 0, m;
  while ((m = re.exec(html))) { out.push([pos, m.index]); pos = m.index + m[0].length; }
  out.push([pos, html.length]);
  return out;
}

// Indeks końca elementu (początek tagu zamykającego) z uwzględnieniem zagnieżdżeń.
function koniecElementu(html, od, tag) {
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
  re.lastIndex = od;
  let gl = 1, m;
  while ((m = re.exec(html))) {
    if (m[1]) { if (--gl === 0) return m.index; } else if (!m[0].endsWith('/>')) gl++;
  }
  throw new Error(`Brak zamknięcia <${tag}>.`);
}

// Przetłumacz atrybuty data-i18n / -alt / -aria. `tresc(el)` zwraca nowy HTML środka elementu.
function tlumacz(html, d, trybGlowna) {
  const wynik = [];
  let kursor = 0;
  for (const [a, b] of zakresyHtml(html)) {
    const re = /<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
    re.lastIndex = a;
    let m;
    while ((m = re.exec(html)) && m.index < b) {
      const [tagCaly, tag, attrs] = m;
      let nowyTag = tagCaly;
      const alt = attrs.match(/\bdata-i18n-alt="([^"]+)"/);
      if (alt && typeof d[alt[1]] === 'string') nowyTag = nowyTag.replace(/\balt="[^"]*"/, `alt="${escAttr(d[alt[1]])}"`);
      const aria = attrs.match(/\bdata-i18n-aria="([^"]+)"/);
      if (aria && typeof d[aria[1]] === 'string') nowyTag = nowyTag.replace(/\baria-label="[^"]*"/, `aria-label="${escAttr(d[aria[1]])}"`);
      const klucz = attrs.match(/\bdata-i18n="([^"]+)"/);
      if (!klucz || typeof d[klucz[1]] !== 'string' || VOID.has(tag.toLowerCase())) {
        if (nowyTag !== tagCaly) { wynik.push(html.slice(kursor, m.index), nowyTag); kursor = m.index + tagCaly.length; }
        continue;
      }
      const tekst = d[klucz[1]];
      const start = m.index + tagCaly.length;
      const koniec = koniecElementu(html, start, tag);
      const srodek = html.slice(start, koniec);
      let nowy;
      if (trybGlowna) {
        // Jak zastosujTlumaczenia(): podmień pierwszy węzeł tekstowy, resztę zostaw
        // i skanuj dalej (w środku mogą być kolejne elementy z data-i18n).
        const t = srodek.match(/^[^<]*/)[0];
        if (t.length) {
          wynik.push(html.slice(kursor, m.index), nowyTag, esc(tekst) + (t.length < srodek.length ? ' ' : ''));
          kursor = re.lastIndex = start + t.length;
          continue;
        }
        nowy = esc(tekst);
      } else {
        // Jak setLanguage() w historii: cała treść, [1]-[4] jako odnośniki do źródeł.
        nowy = tekst.split(/(\[[1-4]\])/).map((cz) => (/^\[[1-4]\]$/.test(cz) ? `<a href="#source-${cz[1]}" class="ref">${cz}</a>` : esc(cz))).join('');
      }
      wynik.push(html.slice(kursor, m.index), nowyTag, nowy);
      kursor = koniec;
      re.lastIndex = koniec;
    }
  }
  wynik.push(html.slice(kursor));
  return wynik.join('');
}

const adresJezyka = (jezyk, sciezka) => (jezyk === 'pl' ? sciezka : `/${jezyk}${sciezka}`);
function blokHreflang(sciezka) {
  return HREF_START + '\n' +
    ['pl', ...JEZYKI].map((j) => `<link rel="alternate" hreflang="${j}" href="${ADRES}${adresJezyka(j, sciezka)}">`).join('\n') +
    `\n<link rel="alternate" hreflang="x-default" href="${ADRES}${sciezka}">\n` + HREF_KONIEC;
}
function wstawHreflang(html, sciezka) {
  const blok = blokHreflang(sciezka);
  const i = html.indexOf(HREF_START);
  if (i !== -1) return html.slice(0, i) + blok + html.slice(html.indexOf(HREF_KONIEC) + HREF_KONIEC.length);
  return html.replace(/(<link rel="canonical"[^>]*>)/, `$1\n${blok}`);
}

function ustawHead(html, jezyk, sciezka, { title, description }) {
  const url = ADRES + adresJezyka(jezyk, sciezka);
  return html
    .replace(/<html lang="[^"]*"/, `<html lang="${jezyk}"`)
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escAttr(description)}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escAttr(title)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escAttr(description)}">`)
    .replace(/<meta property="og:locale" content="[^"]*">/, `<meta property="og:locale" content="${LOCALE[jezyk]}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`);
}

// Linki wewnętrzne do stron, które mają wersję językową, kierujemy do tego języka.
function linkiJezykowe(html, jezyk) {
  return html
    .replace(/href="\/(#[^"]*)?"/g, (_, h) => `href="/${jezyk}/${h || ''}"`)
    .replace(/href="\/historia\/(#[^"]*)?"/g, (_, h) => `href="/${jezyk}/historia/${h || ''}"`)
    // Ścieżki względne do zasobów działają tylko z katalogu głównego.
    .replace(/(["'\s,(])assets\//g, '$1/assets/');
}

async function generuj() {
  const pliki = {};
  // Strona główna
  const glowna = await readFile(path.join(ROOT, 'index.html'), 'utf8');
  const I18N = slownik(glowna, 'I18N_DANE', '(function () {\n  var JEZYKI');
  pliki['index.html'] = wstawHreflang(glowna, '/');
  for (const j of JEZYKI) {
    let h = tlumacz(pliki['index.html'], I18N[j], true);
    h = ustawHead(h, j, '/', GLOWNA_HEAD[j]);
    pliki[`${j}/index.html`] = linkiJezykowe(h, j);
  }
  // Historia
  const historia = await readFile(path.join(ROOT, 'historia/index.html'), 'utf8');
  const HIST = slownik(historia, 'HISTORY_COPY', '(function(){');
  pliki['historia/index.html'] = wstawHreflang(historia, '/historia/');
  for (const j of JEZYKI) {
    const d = HIST[j];
    let h = tlumacz(pliki['historia/index.html'], d, false);
    h = ustawHead(h, j, '/historia/', { title: `${d.title} | Karkonoski Wyszynk`, description: d.lead });
    h = h.replace(/(<button type="button" data-lang="(\w+)" aria-pressed=")(true|false)/g, (_, p, l) => p + String(l === j));
    pliki[`${j}/historia/index.html`] = linkiJezykowe(h, j);
  }
  return pliki;
}

async function main() {
  const sprawdz = process.argv.includes('--check');
  const pliki = await generuj();
  const nieaktualne = [];
  for (const [rel, tresc] of Object.entries(pliki)) {
    const p = path.join(ROOT, rel);
    const stara = await readFile(p, 'utf8').catch(() => null);
    if (stara === tresc) continue;
    nieaktualne.push(rel);
    if (!sprawdz) { await mkdir(path.dirname(p), { recursive: true }); await writeFile(p, tresc); }
  }
  if (sprawdz && nieaktualne.length) { console.error('Nieaktualne wersje językowe: ' + nieaktualne.join(', ') + ' - uruchom: npm run jezyki'); process.exit(1); }
  console.log(sprawdz ? 'Wersje językowe aktualne.' : `Zapisano: ${nieaktualne.join(', ') || 'bez zmian'}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
