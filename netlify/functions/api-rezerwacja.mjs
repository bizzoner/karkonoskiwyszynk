// POST /api/rezerwacja - przyjęcie prośby o rezerwację od gościa.
import { wczytajGrafik, dzien, daneKontaktowe, przekroczonyLimit, wyslijMail, magazyn, noweId, ustawienia, cialoJson, json, zrodloWizyty } from '../lib/wyszynk.mjs';
import { kluczRezerwacji, linkiDecyzji } from '../lib/rezerwacje.mjs';
import { mailNowaRezerwacja, mailRezerwacjaPrzyjeta } from '../lib/maile.mjs';

const OSOBY_MAX = 12;

export default async function handler(request) {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  const body = await cialoJson(request);
  if (!body) return json({ blad: 'zle-dane' }, 400);

  // Honeypot: pole niewidoczne dla ludzi. Bot dostaje "sukces" i nic się nie dzieje.
  if (body.firma) return json({ ok: true });

  const { dane, bledy } = daneKontaktowe(body);
  const osoby = Number(body.osoby);
  if (!Number.isInteger(osoby) || osoby < 1 || osoby > OSOBY_MAX) bledy.push('osoby');

  const grafik = await wczytajGrafik();
  if (!grafik.wlaczone) return json({ blad: 'wylaczone' }, 409);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(body.data) ? dzien(grafik, body.data) : { status: 'poza' };
  if (d.status !== 'otwarte') bledy.push('data');
  else if (!d.sloty.includes(body.godzina)) bledy.push('godzina');
  if (bledy.length) return json({ blad: 'walidacja', pola: bledy, ...(d.status === 'pelne' ? { pelne: true } : {}) }, 422);
  // Limit liczymy dopiero dla poprawnych zgłoszeń - poprawianie błędów w formularzu nie blokuje gościa.
  if (await przekroczonyLimit(request, 'rezerwacja', 5)) return json({ blad: 'limit' }, 429);

  const r = { id: noweId(), status: 'oczekuje', utworzono: new Date().toISOString(), data: body.data, godzina: body.godzina, osoby, ...dane, zrodlo: zrodloWizyty(body.zrodlo), zgodaOpinia: body.zgodaOpinia === true };
  await (await magazyn()).set(kluczRezerwacji(r.id), r);

  const u = ustawienia();
  const doRestauracji = mailNowaRezerwacja(r, linkiDecyzji(r.id));
  const doGoscia = mailRezerwacjaPrzyjeta(r);
  const wyniki = await Promise.allSettled([
    wyslijMail({ do: u.mailRestauracji, temat: doRestauracji.temat, html: doRestauracji.html, text: doRestauracji.text, odpowiedzDo: r.email }),
    wyslijMail({ do: r.email, temat: doGoscia.temat, html: doGoscia.html, text: doGoscia.text, odpowiedzDo: u.mailRestauracji })
  ]);
  wyniki.forEach((w, i) => { if (w.status === 'rejected') console.error('Mail rezerwacji', i ? 'gość' : 'restauracja', r.id, w.reason?.message); });

  // Wynik wysyłki zapisujemy przy rezerwacji - panel pokaże ostrzeżenie, bo log
  // funkcji znika po dobie. Rezerwacja i tak jest w panelu.
  r.mailDoRestauracjiWyslany = wyniki[0].status === 'fulfilled';
  r.mailPrzyjecieWyslany = wyniki[1].status === 'fulfilled';
  if (!r.mailDoRestauracjiWyslany || !r.mailPrzyjecieWyslany) await (await magazyn()).set(kluczRezerwacji(r.id), r);
  return json({ ok: true, id: r.id });
}

export const config = { path: '/api/rezerwacja' };
