// Statystyki dla panelu. Dane osobowe (imię, nazwisko, telefon, e-mail, uwagi)
// nigdy tu nie trafiają: aktywne wpisy są obcinane do pól statystycznych,
// a po terminie RODO zostaje tylko zanonimizowana kopia w archiwum/.
import { magazyn } from './wyszynk.mjs';

export const anonimRezerwacja = (r) => ({
  id: r.id, status: r.status, utworzono: r.utworzono, data: r.data, godzina: r.godzina,
  osoby: r.osoby, zrodlo: r.zrodlo || '', ...(r.decyzjaO ? { decyzjaO: r.decyzjaO } : {})
});
export const anonimZamowienie = (z) => ({
  id: z.id, numer: z.numer, utworzono: z.utworzono, etap: z.etap || 'przyjete',
  suma: z.suma, pozycje: (z.pozycje || []).length, zrodlo: z.zrodlo || ''
});

async function wszystkie(m, prefix) {
  return (await Promise.all((await m.list(prefix)).map((k) => m.get(k)))).filter(Boolean);
}

export async function daneStatystyk() {
  const m = await magazyn();
  const [rez, rezArch, cat, catArch] = await Promise.all([
    wszystkie(m, 'rezerwacja/'), wszystkie(m, 'archiwum/rezerwacja/'),
    wszystkie(m, 'catering/'), wszystkie(m, 'archiwum/catering/')
  ]);
  return {
    rezerwacje: [...rez.map(anonimRezerwacja), ...rezArch],
    catering: [...cat.map(anonimZamowienie), ...catArch]
  };
}
