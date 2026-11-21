// POST /api/impreza - zapytanie o imprezę z konfiguratora /imprezy/.
import { daneKontaktowe, przekroczonyLimit, wyslijMail, magazyn, noweId, ustawienia, terazWPolsce, cialoJson, json, zrodloWizyty } from '../lib/wyszynk.mjs';
import { daneImprezy, kluczImprezy } from '../lib/imprezy.mjs';
import { mailNowaImpreza, mailImprezaPrzyjeta } from '../lib/maile.mjs';

export default async function handler(request) {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  const body = await cialoJson(request);
  if (!body) return json({ blad: 'zle-dane' }, 400);
  if (body.firma) return json({ ok: true }); // honeypot

  const kontakt = daneKontaktowe(body);
  const impreza = daneImprezy(body, terazWPolsce().data);
  const bledy = [...impreza.bledy, ...kontakt.bledy];
  if (bledy.length) return json({ blad: 'walidacja', pola: bledy }, 422);
  if (await przekroczonyLimit(request, 'impreza', 3)) return json({ blad: 'limit' }, 429);

  const teraz = new Date().toISOString();
  const z = {
    id: noweId(), status: 'nowe', utworzono: teraz, ...impreza.dane, ...kontakt.dane,
    zrodlo: zrodloWizyty(body.zrodlo), historia: [{ kiedy: teraz, co: 'Zapytanie z konfiguratora online' }]
  };
  const m = await magazyn();
  await m.set(kluczImprezy(z.id), z);

  const u = ustawienia();
  const doRestauracji = mailNowaImpreza(z);
  const doGoscia = mailImprezaPrzyjeta(z);
  const wyniki = await Promise.allSettled([
    wyslijMail({ do: u.mailRestauracji, temat: doRestauracji.temat, html: doRestauracji.html, text: doRestauracji.text, odpowiedzDo: z.email }),
    wyslijMail({ do: z.email, temat: doGoscia.temat, html: doGoscia.html, text: doGoscia.text, odpowiedzDo: u.mailRestauracji })
  ]);
  wyniki.forEach((w, i) => { if (w.status === 'rejected') console.error('Mail imprezy', i ? 'gość' : 'restauracja', z.id, w.reason?.message); });
  z.mailDoRestauracjiWyslany = wyniki[0].status === 'fulfilled';
  z.mailDoGosciaWyslany = wyniki[1].status === 'fulfilled';
  if (!z.mailDoRestauracjiWyslany || !z.mailDoGosciaWyslany) await m.set(kluczImprezy(z.id), z);

  return json({ ok: true, id: z.id });
}

export const config = { path: '/api/impreza' };
