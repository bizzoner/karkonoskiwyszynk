// Szablony maili. Układ tabelaryczny + style inline, bo tylko tak wygląda
// tak samo w Gmailu, Outlooku i Apple Mail. Estetyka jak na stronie:
// zieleń, złote linie włosowe, krój szeryfowy, zero cieni i zaokrągleń.

import { ustawienia, dataSlownie, TELEFON, ADRES } from './wyszynk.mjs';

const K = {
  forest: '#1F4A2E', gold: '#9B7A1A', goldDark: '#7A5F12', goldLight: '#C49A22', goldLighter: '#E8C45A',
  brown: '#2E1F0E', ivory: '#F5EDD8', ivoryAlt: '#EDE0C4', papier: '#FBF6EA', tekst: '#1C1409'
};
const SZERYF = "Georgia, 'Times New Roman', serif";
const NAGLOWKOWY = "'Playfair Display', Georgia, 'Times New Roman', serif";
const MAPA = 'https://maps.app.goo.gl/uMgw76Eg7TdJMY2r9';

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[z]));
const nl2br = (v) => esc(v).replace(/\n/g, '<br>');
export const osoby = (n) => `${n} ${n === 1 ? 'osoba' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'osoby' : 'osób')}`;
export const zl = (k) => (Math.round(k * 100) / 100).toLocaleString('pl-PL', { minimumFractionDigits: k % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' zł';

// ---------------------------------------------------------------------------
// Klocki
// ---------------------------------------------------------------------------
function przycisk(href, etykieta, wariant = 'zloty') {
  const tlo = wariant === 'zloty' ? K.goldLight : K.papier;
  const kolor = wariant === 'zloty' ? K.brown : K.forest;
  const ramka = wariant === 'zloty' ? K.goldLight : K.forest;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;margin:6px 6px 6px 0;"><tr>
<td style="background:${tlo};border:1px solid ${ramka};border-radius:2px;">
<a href="${esc(href)}" style="display:inline-block;padding:14px 26px;font-family:${SZERYF};font-size:14px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${kolor};text-decoration:none;">${esc(etykieta)}</a>
</td></tr></table>`;
}

function tabelaDanych(wiersze) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${K.goldLight};margin:8px 0 4px;">
${wiersze.filter(Boolean).map(([etykieta, wartosc]) => `<tr>
<td style="padding:11px 12px 11px 0;border-bottom:1px solid ${K.ivoryAlt};font-family:${SZERYF};font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:${K.goldDark};vertical-align:top;width:34%;">${esc(etykieta)}</td>
<td style="padding:11px 0;border-bottom:1px solid ${K.ivoryAlt};font-family:${SZERYF};font-size:16px;color:${K.tekst};vertical-align:top;">${wartosc}</td>
</tr>`).join('')}
</table>`;
}

function separator() {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0;"><tr>
<td style="border-top:1px solid ${K.goldLight};font-size:0;line-height:0;">&nbsp;</td>
<td width="26" align="center" style="font-family:${SZERYF};font-size:11px;line-height:11px;color:${K.goldLight};padding:0 8px;">&#9670;</td>
<td style="border-top:1px solid ${K.goldLight};font-size:0;line-height:0;">&nbsp;</td>
</tr></table>`;
}

const akapit = (html, styl = '') => `<p style="margin:0 0 16px;font-family:${SZERYF};font-size:17px;line-height:1.6;color:${K.tekst};${styl}">${html}</p>`;

// ---------------------------------------------------------------------------
// Szkielet
// ---------------------------------------------------------------------------
function szablon({ zajawka, eyebrow, tytul, tresc, stopkaDlaGoscia = true }) {
  const { adresStrony } = ustawienia();
  return `<!DOCTYPE html>
<html lang="pl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>${esc(tytul)}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
<style>
  @media (max-width:620px){ .karta{padding:28px 20px !important;} .tytul{font-size:26px !important;} }
  a{color:${K.forest};}
</style>
</head>
<body style="margin:0;padding:0;background:${K.ivoryAlt};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(zajawka)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${K.ivoryAlt};">
<tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border:1px solid ${K.gold};background:${K.papier};">

<tr><td align="center" style="background:${K.forest};padding:26px 20px 22px;border-bottom:1px solid ${K.goldLighter};">
<img src="${adresStrony}/assets/img/logo-mail.png" width="180" alt="KARKONOSKI WYSZYNK" style="display:block;width:180px;max-width:60%;height:auto;border:0;font-family:${NAGLOWKOWY};font-size:24px;font-weight:bold;letter-spacing:3px;color:${K.ivory};">
<div style="font-family:${SZERYF};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${K.goldLighter};margin-top:12px;">Szklarska Poręba</div>
</td></tr>

<tr><td class="karta" style="padding:40px 44px 34px;">
<div style="font-family:${SZERYF};font-size:12px;letter-spacing:3px;text-transform:uppercase;color:${K.goldDark};margin-bottom:8px;">${esc(eyebrow)}</div>
<h1 class="tytul" style="margin:0 0 20px;font-family:${NAGLOWKOWY};font-size:30px;line-height:1.2;font-weight:bold;color:${K.forest};">${esc(tytul)}</h1>
${tresc}
</td></tr>

<tr><td style="background:${K.brown};padding:24px 30px;text-align:center;">
<div style="font-family:${SZERYF};font-size:14px;line-height:1.7;color:${K.ivoryAlt};">
Karkonoski Wyszynk · ${esc(ADRES)}<br>
<a href="tel:${TELEFON.replace(/\s/g, '')}" style="color:${K.goldLighter};text-decoration:none;">${TELEFON}</a> &nbsp;·&nbsp;
<a href="${adresStrony}" style="color:${K.goldLighter};text-decoration:none;">karkonoskiwyszynk.pl</a>
</div>
${stopkaDlaGoscia ? `<div style="font-family:${SZERYF};font-size:12px;line-height:1.6;color:#B9AC90;margin-top:10px;">Wiadomość dotyczy Twojego zgłoszenia na naszej stronie. Możesz po prostu na nią odpowiedzieć.</div>` : ''}
</td></tr>

</table>
</td></tr></table>
</body></html>`;
}

const tekstowa = (linie) => linie.filter((l) => l !== null && l !== undefined).join('\n');

// ---------------------------------------------------------------------------
// REZERWACJE
// ---------------------------------------------------------------------------
const kiedy = (r) => `${dataSlownie(r.data)}, godz. ${r.godzina}`;
const krotkaData = (iso) => iso.slice(8, 10) + '.' + iso.slice(5, 7);

function wierszeRezerwacji(r, zKontaktem) {
  return [
    ['Termin', `<strong>${esc(kiedy(r))}</strong>`],
    ['Liczba osób', esc(osoby(r.osoby))],
    ['Na nazwisko', esc(`${r.imie} ${r.nazwisko}`)],
    zKontaktem && ['Telefon', `<a href="tel:${esc(r.telefon.replace(/[^\d+]/g, ''))}" style="color:${K.forest};">${esc(r.telefon)}</a>`],
    zKontaktem && ['E-mail', `<a href="mailto:${esc(r.email)}" style="color:${K.forest};">${esc(r.email)}</a>`],
    r.uwagi && ['Uwagi', nl2br(r.uwagi)]
  ];
}

export function mailNowaRezerwacja(r, linki) {
  return {
    temat: `Nowa rezerwacja: ${krotkaData(r.data)} ${r.godzina}, ${osoby(r.osoby)} - ${r.imie} ${r.nazwisko}`,
    html: szablon({
      zajawka: `${kiedy(r)} · ${osoby(r.osoby)} · czeka na potwierdzenie`,
      eyebrow: 'Rezerwacja online · do decyzji',
      tytul: 'Nowa prośba o rezerwację',
      stopkaDlaGoscia: false,
      tresc: tabelaDanych(wierszeRezerwacji(r, true)) +
        `<div style="margin:26px 0 8px;">${przycisk(linki.potwierdz, 'Potwierdź')}${przycisk(linki.odrzucBrak, 'Odrzuć - brak miejsc', 'jasny')}</div>` +
        akapit(`<a href="${esc(linki.odrzuc)}" style="color:${K.forest};font-weight:bold;">Odrzuć z innym powodem →</a>`, 'font-size:15px;margin:6px 0 0;') +
        akapit(`Kliknięcie „Potwierdź” lub „Odrzuć - brak miejsc” od razu wysyła gościowi maila z decyzją. Odpowiedź na tę wiadomość trafi bezpośrednio do gościa. Wszystkie rezerwacje: <a href="${esc(linki.panel)}" style="color:${K.forest};">panel</a>.`, `font-size:14px;color:${K.brown};margin-top:14px;`)
    }),
    text: tekstowa([`Nowa prośba o rezerwację`, '', `Termin: ${kiedy(r)}`, `Osoby: ${r.osoby}`, `Gość: ${r.imie} ${r.nazwisko}`, `Telefon: ${r.telefon}`, `E-mail: ${r.email}`, r.uwagi ? `Uwagi: ${r.uwagi}` : null, '', `Potwierdź: ${linki.potwierdz}`, `Odrzuć (brak miejsc): ${linki.odrzucBrak}`, `Odrzuć z innym powodem: ${linki.odrzuc}`])
  };
}

export function mailRezerwacjaPrzyjeta(r) {
  return {
    temat: `Otrzymaliśmy Twoją prośbę o rezerwację - ${krotkaData(r.data)}, ${r.godzina}`,
    html: szablon({
      zajawka: 'Sprawdzamy dostępność stolika. Potwierdzenie wyślemy mailem.',
      eyebrow: 'Rezerwacja stolika',
      tytul: `Dziękujemy, ${r.imie}!`,
      tresc: akapit('Otrzymaliśmy Twoją prośbę o rezerwację. Sprawdzamy dostępność stolika - <strong>potwierdzenie wyślemy osobnym mailem</strong>.') +
        tabelaDanych(wierszeRezerwacji(r, false)) +
        separator() +
        akapit(`Coś się zmieniło? Odpowiedz na tę wiadomość albo zadzwoń: <a href="tel:${TELEFON.replace(/\s/g, '')}" style="color:${K.forest};font-weight:bold;">${TELEFON}</a>.`, 'font-size:15px;')
    }),
    text: tekstowa([`Dziękujemy, ${r.imie}!`, '', 'Otrzymaliśmy Twoją prośbę o rezerwację. Potwierdzenie wyślemy osobnym mailem.', '', `Termin: ${kiedy(r)}`, `Osoby: ${r.osoby}`, '', `Pytania: ${TELEFON}`])
  };
}

export function mailRezerwacjaPotwierdzona(r) {
  return {
    temat: `Rezerwacja potwierdzona - ${dataSlownie(r.data)}, ${r.godzina}`,
    html: szablon({
      zajawka: `Czekamy na Was ${kiedy(r)}.`,
      eyebrow: 'Rezerwacja potwierdzona',
      tytul: 'Stolik czeka na Was',
      tresc: akapit(`${esc(r.imie)}, z przyjemnością potwierdzamy rezerwację. Do zobaczenia w Wyszynku!`) +
        tabelaDanych([...wierszeRezerwacji(r, false), ['Gdzie', esc(ADRES)]]) +
        `<div style="margin:24px 0 6px;">${przycisk(MAPA, 'Jak dojechać')}</div>` +
        separator() +
        akapit(`Spóźnicie się albo zmienią się plany? Daj nam znać - odpowiedz na tego maila lub zadzwoń: <a href="tel:${TELEFON.replace(/\s/g, '')}" style="color:${K.forest};font-weight:bold;">${TELEFON}</a>.`, 'font-size:15px;')
    }),
    text: tekstowa([`Rezerwacja potwierdzona`, '', `${r.imie}, czekamy na Was:`, `${kiedy(r)}, ${osoby(r.osoby)}`, ADRES, '', `Zmiana planów: ${TELEFON}`])
  };
}

export const POWODY_ODRZUCENIA = {
  'brak-miejsc': 'Niestety w tym terminie nie mamy już wolnych stolików.',
  'zamkniete': 'Niestety w tym terminie lokal jest nieczynny lub zarezerwowany na wydarzenie zamknięte.',
  'inny': ''
};

export function mailRezerwacjaOdrzucona(r) {
  const powod = r.powodTekst || POWODY_ODRZUCENIA[r.powod] || POWODY_ODRZUCENIA['brak-miejsc'];
  return {
    temat: `Rezerwacja na ${krotkaData(r.data)}, ${r.godzina} - brak możliwości`,
    html: szablon({
      zajawka: 'Niestety nie możemy przyjąć rezerwacji w wybranym terminie.',
      eyebrow: 'Rezerwacja stolika',
      tytul: 'Przykro nam',
      tresc: akapit(`${esc(r.imie)}, dziękujemy za chęć odwiedzin. ${esc(powod)}`) +
        tabelaDanych(wierszeRezerwacji(r, false).slice(0, 2)) +
        akapit('Chętnie ugościmy Was w innym terminie - wybierz go na stronie albo zadzwoń, a coś znajdziemy.', 'margin-top:20px;') +
        `<div style="margin:8px 0 6px;">${przycisk(ustawienia().adresStrony + '/rezerwacja/', 'Wybierz inny termin')}</div>`
    }),
    text: tekstowa([`Przykro nam, ${r.imie}.`, powod, '', `Termin: ${kiedy(r)}`, '', `Inny termin: ${ustawienia().adresStrony}/rezerwacja/ lub ${TELEFON}`])
  };
}

// ---------------------------------------------------------------------------
// CATERING
// ---------------------------------------------------------------------------
function tabelaZamowienia(z) {
  const wiersze = z.pozycje.map((p) => `<tr>
<td style="padding:10px 10px 10px 0;border-bottom:1px solid ${K.ivoryAlt};font-family:${SZERYF};font-size:16px;color:${K.tekst};">${esc(p.nazwa)}<br><span style="font-size:14px;color:${K.brown};">${esc(p.ilosc)}</span></td>
<td align="right" style="padding:10px 0;border-bottom:1px solid ${K.ivoryAlt};font-family:${SZERYF};font-size:16px;color:${K.tekst};white-space:nowrap;vertical-align:top;">${p.waga ? 'ok. ' : ''}${zl(p.wartosc)}</td>
</tr>`).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${K.goldLight};margin:8px 0 0;">${wiersze}
<tr><td style="padding:14px 0 4px;font-family:${NAGLOWKOWY};font-size:20px;font-weight:bold;color:${K.forest};">Razem</td>
<td align="right" style="padding:14px 0 4px;font-family:${NAGLOWKOWY};font-size:20px;font-weight:bold;color:${K.forest};white-space:nowrap;">${z.saWagowe ? 'ok. ' : ''}${zl(z.suma)}</td></tr>
</table>
${z.saWagowe ? akapit('Ryby i ciasta rozliczamy wg rzeczywistej wagi przy odbiorze.', `font-size:14px;font-style:italic;color:${K.brown};margin-top:6px;`) : ''}
${akapit(`Informację o alergenach w zamówionych potrawach przekażemy na prośbę (telefon lub odpowiedź na tego maila), a wykaz alergenów otrzymasz przy odbiorze.`, `font-size:14px;color:${K.brown};margin-top:6px;`)}`;
}

export function mailNoweZamowienieCatering(z) {
  return {
    temat: `Catering nr ${z.numer}: ${z.imie} ${z.nazwisko} - ${z.saWagowe ? 'ok. ' : ''}${zl(z.suma)}`,
    html: szablon({
      zajawka: `${z.pozycje.length} poz. · ${zl(z.suma)} · ${z.telefon}`,
      eyebrow: 'Catering świąteczny · nowe zamówienie',
      tytul: `Zamówienie nr ${z.numer}`,
      stopkaDlaGoscia: false,
      tresc: tabelaDanych([
        ['Zamawia', esc(`${z.imie} ${z.nazwisko}`)],
        ['Telefon', `<a href="tel:${esc(z.telefon.replace(/[^\d+]/g, ''))}" style="color:${K.forest};">${esc(z.telefon)}</a>`],
        ['E-mail', `<a href="mailto:${esc(z.email)}" style="color:${K.forest};">${esc(z.email)}</a>`],
        ['Odbiór', esc(z.odbior)],
        z.uwagi && ['Uwagi', nl2br(z.uwagi)]
      ]) + separator() + tabelaZamowienia(z) +
        akapit('Klient dostał automatyczne potwierdzenie przyjęcia zamówienia. Odpowiedź na tę wiadomość trafi bezpośrednio do niego.', `font-size:14px;color:${K.brown};margin-top:18px;`)
    }),
    text: tekstowa([`Zamówienie cateringu nr ${z.numer}`, `${z.imie} ${z.nazwisko}, tel. ${z.telefon}, ${z.email}`, z.uwagi ? `Uwagi: ${z.uwagi}` : null, '', ...z.pozycje.map((p) => `- ${p.nazwa}: ${p.ilosc} = ${zl(p.wartosc)}`), '', `Razem: ${z.saWagowe ? 'ok. ' : ''}${zl(z.suma)}`])
  };
}

export function mailZamowienieAnulowane(z) {
  return {
    temat: `Zamówienie świąteczne nr ${z.numer} zostało anulowane`,
    html: szablon({
      zajawka: `Zamówienie nr ${z.numer} anulowane.`,
      eyebrow: 'Catering świąteczny 2026',
      tytul: 'Zamówienie anulowane',
      tresc: akapit(`${esc(z.imie)}, Twoje zamówienie nr <strong>${esc(z.numer)}</strong> zostało anulowane.`) +
        tabelaDanych([['Powód', esc(z.powodAnulowania)], ['Numer zamówienia', esc(z.numer)]]) +
        akapit(`Jeśli to pomyłka albo chcesz złożyć nowe zamówienie, odpowiedz na tę wiadomość lub zadzwoń: <a href="tel:${TELEFON.replace(/\s/g, '')}" style="color:${K.forest};font-weight:bold;">${TELEFON}</a>.`, 'margin-top:20px;font-size:15px;')
    }),
    text: tekstowa([`Zamówienie nr ${z.numer} zostało anulowane.`, `Powód: ${z.powodAnulowania}`, '', `Pytania: ${TELEFON}`])
  };
}

export function mailZamowienieCateringPrzyjete(z) {
  return {
    temat: `Twoje zamówienie świąteczne nr ${z.numer} - Karkonoski Wyszynk`,
    html: szablon({
      zajawka: `Odbiór: ${z.odbior}. Razem ${z.saWagowe ? 'ok. ' : ''}${zl(z.suma)}.`,
      eyebrow: 'Catering świąteczny 2026',
      tytul: `Dziękujemy, ${z.imie}!`,
      tresc: akapit('Przyjęliśmy Twoje zamówienie. Jeśli będziemy mieć pytania, zadzwonimy. Płatność przy odbiorze.') +
        tabelaDanych([['Numer zamówienia', `<strong>${esc(z.numer)}</strong>`], ['Odbiór', `<strong>${esc(z.odbior)}</strong>`], ['Gdzie', esc(ADRES)]]) +
        separator() + tabelaZamowienia(z) + separator() +
        akapit(`Chcesz coś zmienić? Odpowiedz na tę wiadomość lub zadzwoń: <a href="tel:${TELEFON.replace(/\s/g, '')}" style="color:${K.forest};font-weight:bold;">${TELEFON}</a>. Zmiany i rezygnację przyjmujemy do 20 grudnia. Potrawy przygotowujemy na konkretny dzień, dlatego od zamówienia nie przysługuje prawo odstąpienia (art. 38 ust. 1 pkt 4 ustawy o prawach konsumenta).`, 'font-size:15px;')
    }),
    text: tekstowa([`Dziękujemy, ${z.imie}!`, `Przyjęliśmy Twoje zamówienie nr ${z.numer}. Płatność przy odbiorze.`, `Odbiór: ${z.odbior}, ${ADRES}`, '', ...z.pozycje.map((p) => `- ${p.nazwa}: ${p.ilosc} = ${zl(p.wartosc)}`), '', `Razem: ${z.saWagowe ? 'ok. ' : ''}${zl(z.suma)}`, '', `Zmiany: ${TELEFON}`])
  };
}
