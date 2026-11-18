// GET /api/grafik - publiczne terminy dla formularza rezerwacji.
// Liczone na serwerze z grafiku ustawianego w panelu.
import { wczytajGrafik, terminy, json } from '../lib/wyszynk.mjs';

export default async function handler(request) {
  if (request.method !== 'GET') return new Response(null, { status: 405, headers: { Allow: 'GET' } });
  try {
    return json(terminy(await wczytajGrafik()));
  } catch (e) {
    console.error('api-grafik', e);
    return json({ blad: 'niedostepne' }, 503);
  }
}

export const config = { path: '/api/grafik' };
