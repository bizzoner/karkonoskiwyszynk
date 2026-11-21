// Zapytania o imprezy okolicznościowe (konfigurator /imprezy/).
// Słowniki opcji są jedynym źródłem: czyta je serwer (walidacja), maile i panel.
import { magazyn, tekst } from './wyszynk.mjs';

export const GOSCIE_MIN = 10;
export const GOSCIE_MAX = 60;
export const RODZAJE = {
  wigilia: 'Wigilia firmowa', urodziny: 'Urodziny', komunia: 'Komunia', chrzciny: 'Chrzciny', slub: 'Ślub',
  jubileusz: 'Jubileusz', integracja: 'Integracja', szkolenie: 'Szkolenie', inne: 'Inne'
};
export const FORMATY = { karta: 'Wybór z karty', menu: 'Menu stałe na osobę', bufet: 'Bufet' };
export const DODATKI = {
  wystroj: 'Wystrój sali', dj: 'DJ', muzyka: 'Muzyka na żywo', rzutnik: 'Rzutnik i ekran',
  naglosnienie: 'Nagłośnienie', opiekun: 'Opiekun dla dzieci', fotobudka: 'Fotobudka'
};
export const STATUSY_IMPREZY = { nowe: 'Nowe', kontakt: 'W kontakcie', potwierdzone: 'Potwierdzone', odrzucone: 'Odrzucone' };

const ID = /^\d{8}-[0-9a-f]{10}$/;
export const kluczImprezy = (id) => `impreza/${id}`;

// Walidacja części dotyczącej imprezy (dane kontaktowe sprawdza daneKontaktowe).
export function daneImprezy(body, dzis) {
  const bledy = [];
  const data = /^\d{4}-\d{2}-\d{2}$/.test(body.data) ? body.data : '';
  if (!data || data <= dzis) bledy.push('data');
  const goscie = Number(body.goscie);
  if (!Number.isInteger(goscie) || goscie < GOSCIE_MIN || goscie > GOSCIE_MAX) bledy.push('goscie');
  const rodzaj = Object.hasOwn(RODZAJE, body.rodzaj) ? body.rodzaj : '';
  if (!rodzaj) bledy.push('rodzaj');
  const format = Object.hasOwn(FORMATY, body.format) ? body.format : '';
  if (!format) bledy.push('format');
  const godzina = /^\d{2}:\d{2}$/.test(body.godzina) ? body.godzina : '';
  const dodatki = [...new Set((Array.isArray(body.dodatki) ? body.dodatki : []).filter((d) => Object.hasOwn(DODATKI, d)))];
  return {
    bledy,
    dane: {
      data, goscie, rodzaj, format, dodatki, godzina,
      rodzajInny: rodzaj === 'inne' ? tekst(body.rodzajInny, 80) : '',
      wylacznosc: !!body.wylacznosc,
      nazwaFirmy: tekst(body.nazwaFirmy, 120)
    }
  };
}

export const opisRodzaju = (z) => (z.rodzaj === 'inne' && z.rodzajInny ? `Inne: ${z.rodzajInny}` : RODZAJE[z.rodzaj] || z.rodzaj);

export async function wszystkieImprezy() {
  const m = await magazyn();
  const lista = (await Promise.all((await m.list('impreza/')).map((k) => m.get(k)))).filter(Boolean);
  return lista.sort((a, b) => a.data.localeCompare(b.data));
}

export async function zmienStatusImprezy(id, status) {
  if (!ID.test(String(id)) || !Object.hasOwn(STATUSY_IMPREZY, status)) return { blad: 'zle-dane' };
  const m = await magazyn();
  const z = await m.get(kluczImprezy(id));
  if (!z) return { blad: 'nie-ma' };
  if (z.status !== status) {
    z.status = status;
    z.historia = [...(z.historia || []), { kiedy: new Date().toISOString(), co: `Status: ${STATUSY_IMPREZY[status]}` }];
    await m.set(kluczImprezy(id), z);
  }
  return { impreza: z };
}
