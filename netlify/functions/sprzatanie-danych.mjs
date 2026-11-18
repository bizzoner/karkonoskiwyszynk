// Codziennie usuwa dane osobowe, których już nie potrzebujemy (RODO):
// rezerwacje 30 dni po terminie, zamówienia cateringu 30 dni po dniu
// odbioru (24 grudnia roku złożenia), liczniki antyspamowe po dobie.
import { magazyn, terazWPolsce, dodajDni } from '../lib/wyszynk.mjs';

export default async function handler() {
  const m = await magazyn();
  const granica = dodajDni(terazWPolsce().data, -30);
  let usuniete = 0;
  for (const k of await m.list('rezerwacja/')) {
    const r = await m.get(k);
    if (!r || r.data < granica) { await m.del(k); usuniete++; }
  }
  for (const k of await m.list('catering/')) {
    const z = await m.get(k);
    const odbior = z && z.utworzono.slice(0, 4) + '-12-24';
    if (!z || odbior < granica) { await m.del(k); usuniete++; }
  }
  for (const k of await m.list('limit/')) {
    const l = await m.get(k);
    if (!l || Date.now() - l.start > 86400000) await m.del(k);
  }
  console.log('sprzatanie-danych: usunieto', usuniete);
}

export const config = { schedule: '30 3 * * *' };
