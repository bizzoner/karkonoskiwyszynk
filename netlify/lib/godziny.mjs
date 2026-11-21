// Godziny otwarcia z wizytówki Google (Places API New) - jedyne źródło godzin.
// Pobieramy najwyżej raz na 3 godziny i trzymamy w Blobs (`godziny`), żeby
// strona, llms.txt i dane strukturalne pokazywały to samo co Google.
// Zmienne: GOOGLE_PLACES_KEY (klucz ograniczony do Places API New), GOOGLE_PLACE_ID.
import { magazyn, terazWPolsce, dodajDni } from './wyszynk.mjs';

const WAZNOSC_MS = 3 * 3600 * 1000;
const hhmm = (p) => String(p.hour).padStart(2, '0') + ':' + String(p.minute || 0).padStart(2, '0');
const iso = (d) => `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
const naMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

// Okresy Google -> { tydzien: [7 dni, 0 = niedziela][{ od, do }], daty: { 'YYYY-MM-DD': [...] } }
export function przetworz(odp, dzis = terazWPolsce().data) {
  const tydzien = [[], [], [], [], [], [], []];
  for (const p of odp.regularOpeningHours?.periods || []) {
    if (!p.close) { tydzien[p.open.day].push({ od: '00:00', do: '24:00' }); continue; }
    tydzien[p.open.day].push({ od: hhmm(p.open), do: p.close.day === p.open.day ? hhmm(p.close) : '24:00' });
  }
  // Najbliższe 7 dni z uwzględnieniem dni specjalnych (święta itp.)
  const daty = {};
  for (const p of odp.currentOpeningHours?.periods || []) {
    if (!p.open?.date) continue;
    const d = iso(p.open.date);
    (daty[d] = daty[d] || []).push({ od: hhmm(p.open), do: p.close && p.close.day === p.open.day ? hhmm(p.close) : '24:00' });
  }
  tydzien.forEach((d) => d.sort((a, b) => a.od.localeCompare(b.od)));
  return { tydzien, daty, datyOd: dzis };
}

async function pobierzZGoogle() {
  const klucz = process.env.GOOGLE_PLACES_KEY, id = process.env.GOOGLE_PLACE_ID;
  if (!klucz || !id) throw new Error('Brak GOOGLE_PLACES_KEY lub GOOGLE_PLACE_ID.');
  const r = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`, {
    headers: { 'X-Goog-Api-Key': klucz, 'X-Goog-FieldMask': 'regularOpeningHours.periods,currentOpeningHours.periods' },
    signal: AbortSignal.timeout(8000)
  });
  if (!r.ok) throw new Error(`Places ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return przetworz(await r.json());
}

// Zwraca zapisane godziny; odświeża z Google, gdy są starsze niż 3 h.
// Gdy Google nie odpowiada, zostają ostatnie znane godziny.
export async function godziny() {
  const m = await magazyn();
  const zapis = await m.get('godziny');
  if (zapis && Date.now() - Date.parse(zapis.pobrano) < WAZNOSC_MS) return zapis;
  try {
    const nowe = { ...(await pobierzZGoogle()), pobrano: new Date().toISOString() };
    await m.set('godziny', nowe);
    return nowe;
  } catch (e) {
    console.error('godziny: nie udało się pobrać z Google', e.message);
    if (zapis) return zapis;
    throw e;
  }
}

// Godziny konkretnego dnia: dzień specjalny z najbliższego tygodnia albo zwykły grafik.
export function godzinyDnia(g, data) {
  // currentOpeningHours obejmuje 7 dni od dnia pobrania - zawiera tylko dni otwarte.
  if (g.datyOd && data >= g.datyOd && data <= dodajDni(g.datyOd, 6)) return g.daty[data] || [];
  return g.tydzien[new Date(data + 'T12:00:00Z').getUTCDay()];
}

// Stan "teraz": otwarte do X albo najbliższe otwarcie.
export function stanTeraz(g, teraz = terazWPolsce()) {
  const dzis = godzinyDnia(g, teraz.data);
  const trwa = dzis.find((p) => naMin(p.od) <= teraz.minuty && teraz.minuty < naMin(p.do));
  if (trwa) return { otwarte: true, do: trwa.do };
  for (let i = 0; i < 8; i++) {
    const data = dodajDni(teraz.data, i);
    const nast = godzinyDnia(g, data).find((p) => i > 0 || naMin(p.od) > teraz.minuty);
    if (nast) return { otwarte: false, otwarcie: { data, od: nast.od } };
  }
  return { otwarte: false };
}

// Wpis schema.org openingHoursSpecification (tydzień standardowy).
const DNI_SCHEMA = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function specyfikacjaSchema(g) {
  const out = [];
  g.tydzien.forEach((przedzialy, d) => przedzialy.forEach((p) => out.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: DNI_SCHEMA[d], opens: p.od, closes: p.do === '24:00' ? '23:59' : p.do })));
  return out;
}

// Tekst po angielsku do llms.txt, np. "Fri 13:00-20:00".
const DNI_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function opisAngielski(g) {
  const kolejnosc = [1, 2, 3, 4, 5, 6, 0];
  const opis = (d) => (g.tydzien[d].length ? g.tydzien[d].map((p) => `${p.od}-${p.do}`).join(', ') : 'closed');
  const grupy = [];
  for (const d of kolejnosc) {
    const o = opis(d), ost = grupy[grupy.length - 1];
    if (ost && ost.opis === o) ost.dni.push(d); else grupy.push({ dni: [d], opis: o });
  }
  return grupy.map((gr) => (gr.dni.length > 1 ? `${DNI_EN[gr.dni[0]]}-${DNI_EN[gr.dni[gr.dni.length - 1]]}` : DNI_EN[gr.dni[0]]) + ' ' + gr.opis).join(', ');
}
