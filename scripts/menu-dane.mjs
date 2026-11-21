// Generuje dane menu dla wyszukiwarek i asystentów AI z karty w index.html.
// Źródłem prawdy pozostaje HTML menu (sekcja #menu) - ten skrypt tylko go czyta.
//
//   npm run menu           - zapisuje /menu.json i blok schema.org Menu w index.html
//   npm run menu -- --check - kończy się błędem, jeśli dane są nieaktualne
//
// Uruchom po każdej zmianie dań lub cen.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ADRES = 'https://karkonoskiwyszynk.pl';
const START = '<!-- MENU-LD:START (generuje scripts/menu-dane.mjs - nie edytuj ręcznie) -->';
const KONIEC = '<!-- MENU-LD:END -->';

const bezTagow = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const encje = (s) => s.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const tekst = (s) => encje(bezTagow(s));

function ceny(cenaTekst) {
  // "29 zł" -> [29]; "26 / 74 zł" -> [26, 74]; "cena sezonowa" -> []
  if (!/zł/.test(cenaTekst)) return [];
  return cenaTekst.replace('zł', '').split('/').map((x) => Number(x.trim().replace(',', '.'))).filter((n) => Number.isFinite(n));
}

export function czytajMenu(html) {
  const sekcja = html.slice(html.indexOf('id="menu"'));
  const kategorie = [];
  const czesci = sekcja.split(/<div class="menu__kategoria[^"]*" id="/).slice(1);
  for (const cz of czesci) {
    const id = cz.slice(0, cz.indexOf('"'));
    const nazwa = tekst((cz.match(/<h3 class="menu__kategoria-naglowek"[^>]*>([\s\S]*?)<\/h3>/) || [])[1] || id);
    const wstep = tekst((cz.match(/<p class="menu__kategoria-wstep"[^>]*>([\s\S]*?)<\/p>/) || [])[1] || '');
    const pozycje = [];
    // Podnagłówki (np. "Szprycery (300 ml / 1 l)") opisują rozmiary cen "26 / 74 zł".
    const tokeny = cz.split(/(?=<h3 class="menu__podnaglowek")|(?=<div class="danie[ "])/);
    let podkategoria = null;
    for (const t of tokeny) {
      if (t.startsWith('<h3 class="menu__podnaglowek"')) {
        const h = t.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)[1];
        const rozm = (h.match(/<span class="danie__gramatura">\(([^)]*)\)<\/span>/) || [])[1] || '';
        podkategoria = { nazwa: tekst(h.replace(/<span class="danie__gramatura">[\s\S]*?<\/span>/, '')), rozmiary: rozm ? rozm.split('/').map((x) => x.trim()) : [] };
        continue;
      }
      if (!t.startsWith('<div class="danie')) continue;
      const n = t.match(/<h4 class="danie__nazwa"[^>]*>([\s\S]*?)<\/h4>/);
      if (!n) continue;
      const gramatura = ((n[1].match(/<span class="danie__gramatura">\(([^)]*)\)<\/span>/) || [])[1] || '').trim();
      const nazwaDania = tekst(n[1].replace(/<span class="danie__(gramatura|odznaka)[^"]*">[\s\S]*?<\/span>/g, ''));
      const cenaTekst = tekst((t.match(/<span class="danie__cena">([\s\S]*?)<\/span>/) || [])[1] || '');
      const opis = tekst((t.match(/<p class="danie__opis"[^>]*>([\s\S]*?)<\/p>/) || [])[1] || '');
      const oznaczenia = [...t.matchAll(/data-i18n="tag_(\w+)"/g)].map((m) => m[1]);
      // Rozmiary dla cen "8 / 12 zł": z podnagłówka albo z własnej porcji "(330 / 700 ml)".
      const wartosci = ceny(cenaTekst);
      let rozmiary = podkategoria?.rozmiary || [];
      if (wartosci.length > 1 && !rozmiary.length && gramatura.includes('/')) {
        const jedn = (gramatura.match(/[a-zA-Z]+\s*$/) || [''])[0].trim();
        rozmiary = gramatura.split('/').map((x) => x.trim()).map((x) => (/[a-zA-Z]/.test(x) ? x : `${x} ${jedn}`.trim()));
      }
      let listaCen = wartosci.map((c, i) => ({ zl: c, ...(wartosci.length > 1 && rozmiary[i] ? { rozmiar: rozmiary[i] } : {}) }));
      // Warianty (np. frytki): <li><span>Klasyczne (350g)</span><span>26 zł</span></li>
      for (const w of t.matchAll(/<li>\s*<span[^>]*>([\s\S]*?)<\/span>\s*<span>([^<]*zł)<\/span>\s*<\/li>/g)) {
        const c = ceny(w[2]);
        if (c.length) listaCen.push({ zl: c[0], rozmiar: tekst(w[1]) });
      }
      // Wina: <p class="danie__ceny-wina"><span>Karafka 1 l — 75 zł</span> · ...</p>
      const wina = t.match(/<p class="danie__ceny-wina">([\s\S]*?)<\/p>/);
      if (wina) {
        for (const kawalek of tekst(wina[1]).split('·')) {
          const m = kawalek.match(/^(.*?)\s*[—-]\s*(\d+(?:[.,]\d+)?)\s*zł/);
          if (m) listaCen.push({ zl: Number(m[2].replace(',', '.')), rozmiar: m[1].trim() });
        }
      }
      pozycje.push({
        nazwa: nazwaDania,
        ...(gramatura ? { porcja: gramatura } : {}),
        cena: cenaTekst || listaCen.map((c) => `${c.rozmiar}: ${c.zl} zł`).join(', '),
        ceny: listaCen,
        ...(opis ? { opis } : {}),
        ...(podkategoria ? { podkategoria: podkategoria.nazwa } : {}),
        ...(oznaczenia.includes('vege') ? { wegetarianskie: true } : {}),
        ...(oznaczenia.includes('sezon') ? { sezonowe: true } : {})
      });
    }
    kategorie.push({ id, nazwa, ...(wstep ? { wstep } : {}), pozycje });
  }
  return kategorie;
}

function menuJson(kategorie) {
  return {
    restauracja: 'Karkonoski Wyszynk',
    adres: 'ul. Jedności Narodowej 18, 58-580 Szklarska Poręba (parter Villa Bożena)',
    strona: `${ADRES}/#menu`,
    waluta: 'PLN',
    uwagi: 'Ceny w złotych. Karta może się zmieniać sezonowo - aktualna wersja zawsze na stronie. Rezerwacja: ' + ADRES + '/rezerwacja/ (można też przyjść bez rezerwacji).',
    kategorie
  };
}

function schemaMenu(kategorie) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    '@id': `${ADRES}/#menu`,
    name: 'Karta Karkonoskiego Wyszynku',
    url: `${ADRES}/#menu`,
    inLanguage: 'pl',
    hasMenuSection: kategorie.map((k) => ({
      '@type': 'MenuSection',
      name: k.nazwa,
      ...(k.wstep ? { description: k.wstep } : {}),
      hasMenuItem: k.pozycje.map((p) => ({
        '@type': 'MenuItem',
        name: p.nazwa + (p.porcja ? ` (${p.porcja})` : ''),
        ...(p.opis ? { description: p.opis } : {}),
        ...(p.wegetarianskie ? { suitableForDiet: 'https://schema.org/VegetarianDiet' } : {}),
        ...(p.ceny.length ? {
          offers: p.ceny.map((c) => ({ '@type': 'Offer', price: c.zl.toFixed(2), priceCurrency: 'PLN', ...(c.rozmiar ? { name: c.rozmiar } : {}) }))
        } : {})
      }))
    }))
  };
}

async function main() {
  const sprawdz = process.argv.includes('--check');
  const plikHtml = path.join(ROOT, 'index.html');
  const plikJson = path.join(ROOT, 'menu.json');
  const html = await readFile(plikHtml, 'utf8');
  const kategorie = czytajMenu(html);
  const liczba = kategorie.reduce((s, k) => s + k.pozycje.length, 0);
  if (!liczba) throw new Error('Nie znaleziono dań w index.html - zmieniła się struktura menu?');

  const json = JSON.stringify(menuJson(kategorie), null, 2) + '\n';
  const blok = `${START}\n<script type="application/ld+json">\n${JSON.stringify(schemaMenu(kategorie), null, 2)}\n</script>\n${KONIEC}`;
  const i = html.indexOf(START), j = html.indexOf(KONIEC);
  if (i === -1 || j === -1) throw new Error('Brak znaczników MENU-LD w index.html.');
  const nowyHtml = html.slice(0, i) + blok + html.slice(j + KONIEC.length);

  if (sprawdz) {
    const staryJson = await readFile(plikJson, 'utf8').catch(() => '');
    if (staryJson !== json || nowyHtml !== html) { console.error('Dane menu są nieaktualne - uruchom: npm run menu'); process.exit(1); }
    console.log(`Dane menu aktualne (${kategorie.length} kategorii, ${liczba} pozycji).`);
    return;
  }
  await writeFile(plikJson, json);
  if (nowyHtml !== html) await writeFile(plikHtml, nowyHtml);
  console.log(`Zapisano menu.json i schema.org Menu: ${kategorie.length} kategorii, ${liczba} pozycji.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
