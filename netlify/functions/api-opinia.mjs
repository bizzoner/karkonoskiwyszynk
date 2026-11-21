// POST /api/opinia - wiadomość od gościa po wizycie (link z maila z prośbą o opinię).
// Link jest podpisany HMAC, więc pisać może tylko gość tej rezerwacji.
import { magazyn, zgodnyPodpis, wyslijMail, ustawienia, cialoJson, json, tekstWielolinijkowy, przekroczonyLimit } from '../lib/wyszynk.mjs';
import { pobierzRezerwacje, kluczRezerwacji } from '../lib/rezerwacje.mjs';
import { mailWiadomoscPoWizycie } from '../lib/maile.mjs';

export default async function handler(request) {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  const b = await cialoJson(request);
  if (!b || !zgodnyPodpis(`opinia.${b.id}`, b.s)) return json({ blad: 'link' }, 403);
  const tresc = tekstWielolinijkowy(b.tresc, 2000);
  if (tresc.length < 3) return json({ blad: 'walidacja', pola: ['tresc'] }, 422);
  if (await przekroczonyLimit(request, 'opinia', 5)) return json({ blad: 'limit' }, 429);
  const r = await pobierzRezerwacje(b.id);
  if (!r) return json({ blad: 'nie-ma' }, 404);

  r.wiadomosciPoWizycie = [...(r.wiadomosciPoWizycie || []), { kiedy: new Date().toISOString(), tresc }];
  await (await magazyn()).set(kluczRezerwacji(r.id), r);
  const mail = mailWiadomoscPoWizycie(r, tresc);
  try {
    await wyslijMail({ do: ustawienia().mailRestauracji, temat: mail.temat, html: mail.html, text: mail.text, odpowiedzDo: r.email });
  } catch (e) { console.error('api-opinia: mail', r.id, e.message); }
  return json({ ok: true, imie: r.imie });
}

export const config = { path: '/api/opinia' };
