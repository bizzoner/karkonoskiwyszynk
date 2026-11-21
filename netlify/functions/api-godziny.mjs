// GET /api/godziny - godziny otwarcia z wizytówki Google + stan "teraz".
import { godziny, stanTeraz, specyfikacjaSchema, godzinyDnia } from '../lib/godziny.mjs';
import { terazWPolsce, dodajDni } from '../lib/wyszynk.mjs';

export default async function handler() {
  try {
    const g = await godziny();
    const dzis = terazWPolsce().data;
    const najblizsze = Array.from({ length: 7 }, (_, i) => dodajDni(dzis, i)).map((data) => ({ data, godziny: godzinyDnia(g, data) }));
    return Response.json(
      { tydzien: g.tydzien, najblizsze, teraz: stanTeraz(g), schema: specyfikacjaSchema(g), pobrano: g.pobrano },
      { headers: { 'Cache-Control': 'public, max-age=300', 'Netlify-CDN-Cache-Control': 'public, s-maxage=300', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (e) {
    console.error('api-godziny', e.message);
    return Response.json({ blad: 'niedostepne' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

export const config = { path: '/api/godziny' };
