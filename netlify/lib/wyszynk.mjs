// Wspólna logika rezerwacji, cateringu i panelu.
// Dane: Netlify Blobs (magazyn "wyszynk"). Maile: Resend (REST API, bez SDK).
// Lokalnie (scripts/dev-server.mjs) magazyn i poczta działają na plikach
// w .netlify/dev-*, żeby dało się wszystko przetestować bez kont w chmurze.

import { createHmac, createHash, timingSafeEqual, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile, readdir, rm, rename } from 'node:fs/promises';
import path from 'node:path';

export const STREFA = 'Europe/Warsaw';
export const TELEFON = '+48 793 066 186';
export const ADRES = 'ul. Jedności Narodowej 18, 58-580 Szklarska Poręba (parter Villa Bożena)';

// ---------------------------------------------------------------------------
// Konfiguracja ze zmiennych środowiskowych (panel Netlify → Environment)
// ---------------------------------------------------------------------------
export function ustawienia() {
  const env = process.env;
  return {
    resendKlucz: env.RESEND_API_KEY || '',
    nadawca: env.MAIL_FROM || 'Karkonoski Wyszynk <rezerwacje@mail.karkonoskiwyszynk.pl>',
    mailRestauracji: env.MAIL_RESTAURACJA || 'anastasia.vilk@relaxtour.pl',
    panelHaslo: env.PANEL_HASLO || '',
    sekret: env.PANEL_SEKRET || '',
    adresStrony: (env.SITE_URL || env.URL || 'https://karkonoskiwyszynk.pl').replace(/\/$/, ''),
    devMagazyn: env.WYSZYNK_DEV_DIR || ''
  };
}

// ---------------------------------------------------------------------------
// Magazyn danych
// ---------------------------------------------------------------------------
let magazynCache;
export async function magazyn() {
  if (magazynCache) return magazynCache;
  const { devMagazyn } = ustawienia();
  if (devMagazyn) {
    magazynCache = magazynPlikowy(path.join(devMagazyn, 'blobs'));
  } else {
    const { getStore } = await import('@netlify/blobs');
    const store = getStore({ name: 'wyszynk', consistency: 'strong' });
    magazynCache = {
      get: (k) => store.get(k, { type: 'json' }),
      set: (k, v) => store.setJSON(k, v),
      del: (k) => store.delete(k),
      list: async (prefix) => (await store.list({ prefix })).blobs.map((b) => b.key),
      // Licznik bez duplikatów: zapis warunkowy (etag) + ponowienie przy kolizji.
      async zwieksz(k, start) {
        for (let proba = 0; proba < 8; proba++) {
          const obecny = await store.getWithMetadata(k, { type: 'json' });
          const nastepny = obecny ? obecny.data.ostatni + 1 : start;
          const wynik = obecny
            ? await store.setJSON(k, { ostatni: nastepny }, { onlyIfMatch: obecny.etag })
            : await store.setJSON(k, { ostatni: nastepny }, { onlyIfNew: true });
          if (wynik.modified) return nastepny;
          await new Promise((r) => setTimeout(r, 40 + Math.random() * 120));
        }
        throw new Error('Nie udało się nadać numeru zamówienia.');
      }
    };
  }
  return magazynCache;
}

function magazynPlikowy(katalog) {
  const plik = (k) => path.join(katalog, encodeURIComponent(k) + '.json');
  // Licznik jak w produkcji: operacje po kolei (kolejka w procesie) i zapis atomowy.
  let kolejka = Promise.resolve();
  const poKolei = (fn) => (kolejka = kolejka.then(fn, fn));
  return {
    async get(k) {
      try { return JSON.parse(await readFile(plik(k), 'utf8')); } catch { return null; }
    },
    async set(k, v) {
      await mkdir(katalog, { recursive: true });
      const tmp = plik(k) + '.' + randomBytes(4).toString('hex') + '.tmp';
      await writeFile(tmp, JSON.stringify(v, null, 2));
      await rename(tmp, plik(k));
    },
    async del(k) { await rm(plik(k), { force: true }); },
    zwieksz(k, start) {
      return poKolei(async () => {
        const obecny = await this.get(k);
        const nastepny = obecny ? obecny.ostatni + 1 : start;
        await this.set(k, { ostatni: nastepny });
        return nastepny;
      });
    },
    async list(prefix) {
      try {
        return (await readdir(katalog))
          .filter((f) => f.endsWith('.json'))
          .map((f) => decodeURIComponent(f.slice(0, -5)))
          .filter((k) => k.startsWith(prefix));
      } catch { return []; }
    }
  };
}

// ---------------------------------------------------------------------------
// Czas w Polsce (funkcje Netlify działają w UTC)
// ---------------------------------------------------------------------------
export function terazWPolsce(data = new Date()) {
  const czesci = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: STREFA, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(data).map((p) => [p.type, p.value])
  );
  return { data: `${czesci.year}-${czesci.month}-${czesci.day}`, minuty: Number(czesci.hour) * 60 + Number(czesci.minute) };
}
export function dodajDni(iso, n) {
  const [r, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(r, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}
export function dzienTygodnia(iso) {
  const [r, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(r, m - 1, d)).getUTCDay(); // 0 = niedziela
}
export const naMinuty = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export const naHHMM = (min) => String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
const DNI = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
const MIESIACE = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
export function dataSlownie(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return `${DNI[dzienTygodnia(iso)]}, ${d} ${MIESIACE[m - 1]}`;
}

// ---------------------------------------------------------------------------
// Grafik: szablon tygodnia + wyjątki na konkretne dni
// ---------------------------------------------------------------------------
export const DOMYSLNY_GRAFIK = {
  wlaczone: true,            // główny wyłącznik rezerwacji online
  krokMin: 30,
  ostatniaPrzedZamknieciemMin: 60,
  buforDzisMin: 60,          // dziś: najwcześniej za godzinę
  dniDoPrzodu: 90,
  // klucz = numer dnia tygodnia (0 = niedziela)
  tydzien: {
    1: { otwarte: true, od: '12:00', do: '20:00' },
    2: { otwarte: true, od: '12:00', do: '20:00' },
    3: { otwarte: true, od: '12:00', do: '20:00' },
    4: { otwarte: true, od: '12:00', do: '20:00' },
    5: { otwarte: true, od: '12:00', do: '21:00' },
    6: { otwarte: true, od: '12:00', do: '21:00' },
    0: { otwarte: true, od: '12:00', do: '18:00' }
  },
  // "2026-12-24": { typ: "zamkniete" | "godziny" | "pelne", od?, do?, notka? }
  wyjatki: {}
};

export async function wczytajGrafik() {
  const m = await magazyn();
  const zapisany = await m.get('grafik');
  return zapisany ? { ...DOMYSLNY_GRAFIK, ...zapisany, tydzien: { ...DOMYSLNY_GRAFIK.tydzien, ...zapisany.tydzien } } : structuredClone(DOMYSLNY_GRAFIK);
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
export function sprawdzGrafik(g) {
  const bledy = [];
  if (typeof g !== 'object' || !g) return ['Nieprawidłowe dane grafiku.'];
  const wynik = {
    wlaczone: g.wlaczone !== false,
    krokMin: DOMYSLNY_GRAFIK.krokMin,
    ostatniaPrzedZamknieciemMin: [0, 30, 60, 90, 120].includes(Number(g.ostatniaPrzedZamknieciemMin)) ? Number(g.ostatniaPrzedZamknieciemMin) : 60,
    buforDzisMin: DOMYSLNY_GRAFIK.buforDzisMin,
    dniDoPrzodu: Math.min(365, Math.max(7, Number(g.dniDoPrzodu) || 90)),
    tydzien: {},
    wyjatki: {}
  };
  for (let d = 0; d < 7; d++) {
    const w = (g.tydzien || {})[d] || {};
    const otwarte = !!w.otwarte;
    if (otwarte && (!HHMM.test(w.od) || !HHMM.test(w.do) || naMinuty(w.od) >= naMinuty(w.do))) bledy.push(`Godziny dnia: ${DNI[d]} są nieprawidłowe.`);
    wynik.tydzien[d] = { otwarte, od: HHMM.test(w.od) ? w.od : '12:00', do: HHMM.test(w.do) ? w.do : '20:00' };
  }
  for (const [data, w] of Object.entries(g.wyjatki || {})) {
    if (!ISO.test(data) || !w || !['zamkniete', 'godziny', 'pelne'].includes(w.typ)) { bledy.push(`Nieprawidłowy wyjątek: ${data}.`); continue; }
    if (w.typ === 'godziny' && (!HHMM.test(w.od) || !HHMM.test(w.do) || naMinuty(w.od) >= naMinuty(w.do))) { bledy.push(`Nieprawidłowe godziny w dniu ${data}.`); continue; }
    wynik.wyjatki[data] = { typ: w.typ, ...(w.typ === 'godziny' ? { od: w.od, do: w.do } : {}), ...(w.notka ? { notka: String(w.notka).slice(0, 80) } : {}) };
  }
  return bledy.length ? bledy : wynik;
}

// Status dnia i wolne godziny - JEDYNE miejsce, gdzie liczymy dostępność.
export function dzien(grafik, iso, teraz = terazWPolsce()) {
  const wyj = grafik.wyjatki[iso];
  if (iso < teraz.data || iso > dodajDni(teraz.data, grafik.dniDoPrzodu)) return { status: 'poza' };
  if (wyj?.typ === 'zamkniete') return { status: 'zamkniete', notka: wyj.notka };
  if (wyj?.typ === 'pelne') return { status: 'pelne', notka: wyj.notka };
  const godz = wyj?.typ === 'godziny' ? { od: wyj.od, do: wyj.do } : grafik.tydzien[dzienTygodnia(iso)];
  if (!godz || (wyj?.typ !== 'godziny' && !godz.otwarte)) return { status: 'zamkniete' };
  const od = naMinuty(godz.od), ostatnia = naMinuty(godz.do) - grafik.ostatniaPrzedZamknieciemMin;
  const najwczesniej = iso === teraz.data ? teraz.minuty + grafik.buforDzisMin : 0;
  const sloty = [];
  for (let t = od; t <= ostatnia; t += grafik.krokMin) if (t >= najwczesniej) sloty.push(naHHMM(t));
  return sloty.length ? { status: 'otwarte', sloty, godziny: godz } : { status: iso === teraz.data ? 'po-czasie' : 'zamkniete' };
}

export function terminy(grafik, teraz = terazWPolsce()) {
  const dni = {};
  for (let i = 0; i <= grafik.dniDoPrzodu; i++) {
    const iso = dodajDni(teraz.data, i);
    const d = dzien(grafik, iso, teraz);
    dni[iso] = d.status === 'otwarte' ? { s: d.sloty } : { st: d.status };
  }
  return { wlaczone: grafik.wlaczone, od: teraz.data, dni };
}

// ---------------------------------------------------------------------------
// Walidacja danych od gościa
// ---------------------------------------------------------------------------
export const tekst = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
export const tekstWielolinijkowy = (v, max) => String(v ?? '').replace(/\r/g, '').trim().slice(0, max);
export function poprawnyTelefon(v) { const c = String(v || '').replace(/\D/g, ''); return c.length >= 9 && c.length <= 15; }
export function poprawnyEmail(v) { return /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/.test(v) && v.length <= 160; }

export function daneKontaktowe(body) {
  const d = {
    imie: tekst(body.imie, 60),
    nazwisko: tekst(body.nazwisko, 80),
    telefon: tekst(body.telefon, 30),
    email: tekst(body.email, 160).toLowerCase(),
    uwagi: tekstWielolinijkowy(body.uwagi, 600)
  };
  const bledy = [];
  if (!d.imie) bledy.push('imie');
  if (!d.nazwisko) bledy.push('nazwisko');
  if (!poprawnyTelefon(d.telefon)) bledy.push('telefon');
  if (!poprawnyEmail(d.email)) bledy.push('email');
  return { dane: d, bledy };
}

// ---------------------------------------------------------------------------
// Ochrona przed spamem: honeypot + limit zgłoszeń z jednego IP
// ---------------------------------------------------------------------------
export async function przekroczonyLimit(request, rodzaj, max, oknoMin = 60) {
  const ip = request.headers.get('x-nf-client-connection-ip') || request.headers.get('x-forwarded-for') || 'lokalne';
  const klucz = `limit/${rodzaj}/${createHash('sha256').update(ip + ustawienia().sekret).digest('hex').slice(0, 24)}`;
  const m = await magazyn();
  const teraz = Date.now();
  const wpis = (await m.get(klucz)) || { start: teraz, ile: 0 };
  if (teraz - wpis.start > oknoMin * 60000) { wpis.start = teraz; wpis.ile = 0; }
  wpis.ile++;
  await m.set(klucz, wpis);
  return wpis.ile > max;
}

// ---------------------------------------------------------------------------
// Podpisy (linki w mailach, sesja panelu)
// ---------------------------------------------------------------------------
function wymagajSekretu() {
  const { sekret } = ustawienia();
  if (!sekret || sekret.length < 32) throw new Error('PANEL_SEKRET nie jest ustawiony (min. 32 znaki).');
  return sekret;
}
export const podpisz = (tresc) => createHmac('sha256', wymagajSekretu()).update(tresc).digest('base64url');
export function zgodnyPodpis(tresc, podpis) {
  const a = Buffer.from(podpisz(tresc)), b = Buffer.from(String(podpis || ''));
  return a.length === b.length && timingSafeEqual(a, b);
}
export const noweId = () => {
  const t = terazWPolsce();
  return t.data.replace(/-/g, '') + '-' + randomBytes(5).toString('hex');
};

const COOKIE = 'wyszynk_panel';
const SESJA_GODZ = 12;
export function utworzSesje() {
  const wygasa = Date.now() + SESJA_GODZ * 3600000;
  const wartosc = `${wygasa}.${podpisz('sesja.' + wygasa)}`;
  return `${COOKIE}=${wartosc}; Path=/api/panel; HttpOnly;${secure()} SameSite=Strict; Max-Age=${SESJA_GODZ * 3600}`;
}
export const usunSesje = () => `${COOKIE}=; Path=/api/panel; HttpOnly;${secure()} SameSite=Strict; Max-Age=0`;
// Lokalny podgląd działa po http, więc tam bez flagi Secure.
const secure = () => (ustawienia().devMagazyn ? '' : ' Secure;');
export function zalogowany(request) {
  const cookie = (request.headers.get('cookie') || '').split(/;\s*/).find((c) => c.startsWith(COOKIE + '='));
  if (!cookie) return false;
  const [wygasa, podpis] = cookie.slice(COOKIE.length + 1).split('.');
  return Number(wygasa) > Date.now() && zgodnyPodpis('sesja.' + wygasa, podpis);
}
export function poprawneHaslo(haslo) {
  const { panelHaslo } = ustawienia();
  if (!panelHaslo) return false;
  const a = createHash('sha256').update(String(haslo || '')).digest();
  const b = createHash('sha256').update(panelHaslo).digest();
  return timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Poczta
// ---------------------------------------------------------------------------
export async function wyslijMail({ do: adresat, temat, html, text, odpowiedzDo }) {
  const u = ustawienia();
  if (!u.resendKlucz) {
    if (!u.devMagazyn) throw new Error('Brak RESEND_API_KEY.');
    // Tryb lokalny: zapis do pliku zamiast wysyłki
    const katalog = path.join(u.devMagazyn, 'maile');
    await mkdir(katalog, { recursive: true });
    const nazwa = `${Date.now()}-${temat.replace(/[^\p{L}\d]+/gu, '-').slice(0, 50)}.html`;
    await writeFile(path.join(katalog, nazwa), `<!-- DO: ${adresat} | ODPOWIEDZ-DO: ${odpowiedzDo || '-'} | TEMAT: ${temat} -->\n${html}`);
    return { id: 'dev-' + nazwa };
  }
  const odp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${u.resendKlucz}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: u.nadawca, to: [adresat], subject: temat, html, text, ...(odpowiedzDo ? { reply_to: odpowiedzDo } : {}) }),
    signal: AbortSignal.timeout(8000)
  });
  if (!odp.ok) throw new Error(`Resend ${odp.status}: ${(await odp.text()).slice(0, 200)}`);
  return odp.json();
}

// ---------------------------------------------------------------------------
// Odpowiedzi HTTP
// ---------------------------------------------------------------------------
export const BEZ_CACHE = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
export const json = (dane, status = 200, naglowki = {}) => Response.json(dane, { status, headers: { ...BEZ_CACHE, ...naglowki } });
export async function cialoJson(request, maxBajtow = 20000) {
  if (!(request.headers.get('content-type') || '').includes('application/json')) return null;
  const tekstCiala = await request.text();
  if (tekstCiala.length > maxBajtow) return null;
  try { return JSON.parse(tekstCiala); } catch { return null; }
}
