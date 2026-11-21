// Codziennie 8:00 UTC (9:00 zimą, 10:00 latem): kontrola systemu i raport dnia
// dla restauracji (MAIL_RESTAURACJA). Przy awarii także alarm na MAIL_ADMIN (jeśli ustawiony).
import { terazWPolsce, dodajDni, wyslijMail, ustawienia, sprawdzWysylke, zapiszStanSystemu, stanSystemu } from '../lib/wyszynk.mjs';
import { wszystkieRezerwacje } from '../lib/rezerwacje.mjs';
import { wszystkieImprezy } from '../lib/imprezy.mjs';
import { wszystkieZamowienia } from '../lib/catering.mjs';
import { godziny } from '../lib/godziny.mjs';
import { mailRaportPoranny } from '../lib/maile.mjs';

export async function daneRaportu(teraz = terazWPolsce()) {
  // Kontrola: klucz Resend i godziny z Google (godziny() zapisuje stan sama).
  const wysylka = await sprawdzWysylke();
  await zapiszStanSystemu('mail', wysylka.ok ? null : wysylka.opis);
  try { await godziny(); } catch (e) { /* stan zapisany w godziny() */ }

  const dzis = teraz.data, zaTydzien = dodajDni(dzis, 7);
  const minuty = (g) => Number(g.slice(0, 2)) * 60 + Number(g.slice(3, 5));
  const [rez, imp, cat, stan] = await Promise.all([wszystkieRezerwacje(), wszystkieImprezy(), wszystkieZamowienia(), stanSystemu()]);
  const dzisRez = rez.filter((r) => r.data === dzis && r.status === 'potwierdzona').sort((a, b) => a.godzina.localeCompare(b.godzina));
  const wczoraj = new Date(Date.now() - 86400000).toISOString();
  const aktywne = cat.filter((z) => z.etap !== 'anulowane' && z.etap !== 'wydane');
  return {
    data: dzis, stan,
    dzis: dzisRez,
    osobDzis: dzisRez.reduce((s, r) => s + r.osoby, 0),
    doDecyzji: rez.filter((r) => r.status === 'oczekuje').map((r) => ({ ...r, poTerminie: r.data < dzis || (r.data === dzis && minuty(r.godzina) <= teraz.minuty) })),
    noweImprezy: imp.filter((z) => z.status === 'nowe'),
    imprezyTydzien: imp.filter((z) => z.status === 'potwierdzone' && z.data >= dzis && z.data <= zaTydzien),
    cateringAktywne: aktywne.length,
    cateringNowe: cat.filter((z) => z.utworzono >= wczoraj).length,
    cateringSuma: aktywne.reduce((s, z) => s + (z.suma || 0), 0)
  };
}

export default async function handler() {
  const d = await daneRaportu();
  const { mailRestauracji, mailAdmin } = ustawienia();
  const mail = mailRaportPoranny(d);
  try {
    await wyslijMail({ do: mailRestauracji, temat: mail.temat, html: mail.html, text: mail.text });
    if (mailAdmin && Object.keys(d.stan).length) await wyslijMail({ do: mailAdmin, temat: '[Wyszynk] ' + mail.temat, html: mail.html, text: mail.text });
  } catch (e) {
    console.error('raport-poranny: nie wysłano', e.message);
  }
  console.log('raport-poranny', d.data, 'rez', d.dzis.length, 'decyzja', d.doDecyzji.length, 'problemy', Object.keys(d.stan).join(',') || 'brak');
}

export const config = { schedule: '0 8 * * *' };
