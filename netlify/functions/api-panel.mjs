// /api/panel/* - API panelu pracowników (logowanie wspólnym hasłem).
import { zalogowany, poprawneHaslo, utworzSesje, usunSesje, przekroczonyLimit, wczytajGrafik, sprawdzGrafik, magazyn, cialoJson, json } from '../lib/wyszynk.mjs';
import { wszystkieRezerwacje, zdecyduj, ustawDzienPelny } from '../lib/rezerwacje.mjs';
import { wszystkieZamowienia, zmienZamowienie } from '../lib/catering.mjs';
import { daneStatystyk } from '../lib/statystyki.mjs';

const czekaj = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function handler(request) {
  const trasa = new URL(request.url).pathname.replace(/^\/api\/panel\/?/, '');
  const metoda = request.method;

  // Zmiany wymagają nagłówka niedostępnego dla zwykłych formularzy z innych stron (CSRF).
  if (metoda !== 'GET' && request.headers.get('x-panel') !== '1') return json({ blad: 'csrf' }, 403);

  try {
    if (trasa === 'logowanie' && metoda === 'POST') {
      if (await przekroczonyLimit(request, 'logowanie', 10, 15)) return json({ blad: 'limit' }, 429);
      const body = await cialoJson(request, 2000);
      if (!poprawneHaslo(body?.haslo)) { await czekaj(800); return json({ blad: 'haslo' }, 401); }
      return json({ ok: true }, 200, { 'Set-Cookie': utworzSesje() });
    }
    if (trasa === 'wyloguj' && metoda === 'POST') return json({ ok: true }, 200, { 'Set-Cookie': usunSesje() });

    if (!zalogowany(request)) return json({ blad: 'sesja' }, 401);

    if (trasa === 'sesja' && metoda === 'GET') return json({ ok: true });

    if (trasa === 'rezerwacje' && metoda === 'GET') return json({ rezerwacje: await wszystkieRezerwacje() });

    if (trasa === 'decyzja' && metoda === 'POST') {
      const b = await cialoJson(request);
      if (!b || !['potwierdz', 'odrzuc', 'zamknij'].includes(b.akcja)) return json({ blad: 'zle-dane' }, 400);
      const w = await zdecyduj(b.id, b.akcja, { powod: b.powod, powodTekst: b.powodTekst, oznaczPelne: !!b.pelne, zrodlo: 'panel' });
      return w.blad ? json(w, 404) : json(w);
    }

    if (trasa === 'grafik' && metoda === 'GET') return json({ grafik: await wczytajGrafik() });
    if (trasa === 'grafik' && metoda === 'PUT') {
      const wynik = sprawdzGrafik(await cialoJson(request, 60000));
      if (Array.isArray(wynik)) return json({ blad: 'walidacja', komunikaty: wynik }, 422);
      await (await magazyn()).set('grafik', wynik);
      return json({ grafik: wynik });
    }
    if (trasa === 'pelny' && metoda === 'POST') {
      const b = await cialoJson(request);
      if (!b || !/^\d{4}-\d{2}-\d{2}$/.test(b.data)) return json({ blad: 'zle-dane' }, 400);
      return json({ grafik: await ustawDzienPelny(b.data, !!b.pelny) });
    }

    if (trasa === 'statystyki' && metoda === 'GET') return json(await daneStatystyk());

    if (trasa === 'catering' && metoda === 'GET') return json({ zamowienia: await wszystkieZamowienia() });
    if (trasa === 'catering-status' && metoda === 'POST') {
      const b = await cialoJson(request);
      if (!b) return json({ blad: 'zle-dane' }, 400);
      const w = await zmienZamowienie(b.id, { etap: b.etap, platnosc: b.platnosc, powod: b.powod, powiadom: !!b.powiadom });
      return w.blad ? json(w, w.blad === 'nie-ma' ? 404 : 422) : json(w);
    }

    return json({ blad: 'nie-ma' }, 404);
  } catch (e) {
    console.error('api-panel', trasa, e);
    return json({ blad: 'serwer' }, 500);
  }
}

export const config = { path: '/api/panel/*' };
