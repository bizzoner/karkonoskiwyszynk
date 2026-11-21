// POST /api/catering - zamówienie cateringu świątecznego.
// Ceny i sumy liczy serwer z catering/menu.json - przeglądarce nie ufamy.
import menu from '../../catering/menu.json' with { type: 'json' };
import { daneKontaktowe, przekroczonyLimit, wyslijMail, magazyn, noweId, ustawienia, terazWPolsce, cialoJson, json } from '../lib/wyszynk.mjs';
import { mailNoweZamowienieCatering, mailZamowienieCateringPrzyjete } from '../lib/maile.mjs';

// Numeracja zamówień: seria roczna "46/2026". W 2026 zaczynamy od 46
// (kontynuacja numeracji restauracji), od 2027 każdy rok od 1.
const PIERWSZY_NUMER = { 2026: 46 };
async function nadajNumer() {
  const rok = Number(terazWPolsce().data.slice(0, 4));
  const n = await (await magazyn()).zwieksz(`licznik/catering/${rok}`, PIERWSZY_NUMER[rok] || 1);
  return `${n}/${rok}`;
}

const POZYCJE = new Map(menu.kategorie.flatMap((k) => k.pozycje.map((p) => ({ ...p, kategoria: k.nazwa }))).map((p) => [p.id, p]));

// Masa (g) lub objętość (ml) pozycji - do zestawienia dla kuchni w kg i litrach.
function masaIObjetosc(p, q) {
  if (p.jedn === 'g') return { masaG: q };
  if (p.jedn === 'porcja') return { masaG: q * 500 };
  if (p.jedn === 'szt') return p.wagaSzt ? { masaG: q * p.wagaSzt, masaPrzyblizona: true } : {};
  if (p.jedn === 'ml') return { objMl: q };
  return {};
}

function iloscSlownie(p, q) {
  const pl = (n) => n.toLocaleString('pl-PL');
  if (p.jedn === 'g') return q >= 1000 ? pl(q / 1000) + ' kg' : q + ' g';
  if (p.jedn === 'ml') return q >= 1000 ? pl(q / 1000) + ' l' : q + ' ml';
  if (p.jedn === 'szt') return q + ' szt.';
  if (p.jedn === 'porcja') return q + ' × 500 g';
  return String(q);
}

export default async function handler(request) {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  const body = await cialoJson(request);
  if (!body) return json({ blad: 'zle-dane' }, 400);
  if (body.firma) return json({ ok: true });
  if (terazWPolsce().data > menu.koniecZamowien) return json({ blad: 'zamkniete' }, 409);

  const { dane, bledy } = daneKontaktowe(body);
  const pozycje = [];
  for (const [id, q] of Object.entries(body.ilosci || {})) {
    const p = POZYCJE.get(id);
    if (!p || !Number.isInteger(q) || q <= 0 || q % p.krok !== 0 || q > p.krok * 50) { bledy.push('pozycje'); break; }
    pozycje.push({ id, nazwa: p.n, kategoria: p.kategoria, ilosc: iloscSlownie(p, q), q, jedn: p.jedn, ...masaIObjetosc(p, q), waga: !!p.waga, wartosc: Math.round((q / p.cenaZa) * p.cena * 100) / 100 });
  }
  if (!pozycje.length) bledy.push('pozycje');
  if (bledy.length) return json({ blad: 'walidacja', pola: [...new Set(bledy)] }, 422);
  if (await przekroczonyLimit(request, 'catering', 4)) return json({ blad: 'limit' }, 429);

  const z = {
    id: noweId(), numer: await nadajNumer(), utworzono: new Date().toISOString(),
    etap: 'przyjete', platnosc: 'nieoplacone', historia: [{ kiedy: new Date().toISOString(), co: 'Złożone online' }],
    ...dane, pozycje,
    suma: Math.round(pozycje.reduce((s, p) => s + p.wartosc, 0) * 100) / 100,
    saWagowe: pozycje.some((p) => p.waga), odbior: menu.odbior
  };
  await (await magazyn()).set(`catering/${z.id}`, z);

  const u = ustawienia();
  const doRestauracji = mailNoweZamowienieCatering(z);
  const doKlienta = mailZamowienieCateringPrzyjete(z);
  const wyniki = await Promise.allSettled([
    wyslijMail({ do: u.mailRestauracji, temat: doRestauracji.temat, html: doRestauracji.html, text: doRestauracji.text, odpowiedzDo: z.email }),
    wyslijMail({ do: z.email, temat: doKlienta.temat, html: doKlienta.html, text: doKlienta.text, odpowiedzDo: u.mailRestauracji })
  ]);
  wyniki.forEach((w, i) => { if (w.status === 'rejected') console.error('Mail cateringu', i ? 'klient' : 'restauracja', z.id, w.reason?.message); });
  z.mailDoRestauracjiWyslany = wyniki[0].status === 'fulfilled';
  z.mailDoKlientaWyslany = wyniki[1].status === 'fulfilled';
  if (!z.mailDoRestauracjiWyslany || !z.mailDoKlientaWyslany) {
    const kiedy = new Date().toISOString();
    if (!z.mailDoRestauracjiWyslany) z.historia.push({ kiedy, co: 'UWAGA: powiadomienie mailowe do restauracji NIE wyszło' });
    if (!z.mailDoKlientaWyslany) z.historia.push({ kiedy, co: 'UWAGA: potwierdzenie do klienta NIE wyszło - zadzwoń do klienta' });
    await (await magazyn()).set(`catering/${z.id}`, z);
  }

  return json({ ok: true, id: z.id, numer: z.numer, suma: z.suma, saWagowe: z.saWagowe });
}

export const config = { path: '/api/catering' };
