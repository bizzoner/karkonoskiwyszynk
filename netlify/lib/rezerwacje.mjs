// Rezerwacje: zapis, linki decyzji z maila, potwierdzanie/odrzucanie.
import { magazyn, ustawienia, podpisz, zgodnyPodpis, wyslijMail, wczytajGrafik, tekst } from './wyszynk.mjs';
import { mailRezerwacjaPotwierdzona, mailRezerwacjaOdrzucona, POWODY_ODRZUCENIA } from './maile.mjs';

export const kluczRezerwacji = (id) => `rezerwacja/${id}`;
const ID = /^\d{8}-[0-9a-f]{10}$/;

export async function pobierzRezerwacje(id) {
  if (!ID.test(String(id))) return null;
  return (await magazyn()).get(kluczRezerwacji(id));
}

// Linki w mailu do restauracji (podpisane HMAC):
//  potwierdz     - decyzja od razu po kliknięciu (strona sama ją zatwierdza),
//  odrzuc-brak   - odrzucenie z powodem „brak miejsc”, też od razu,
//  odrzuc        - formularz z wyborem powodu.
// Samo pobranie strony (GET) niczego nie zmienia - decyzję zatwierdza skrypt
// w otwartej karcie (POST), więc skanery linków w poczcie nie podejmą jej same.
export const AKCJE_LINKU = ['potwierdz', 'odrzuc-brak', 'odrzuc'];
export function linkiDecyzji(id) {
  const { adresStrony } = ustawienia();
  const link = (akcja) => `${adresStrony}/rezerwacja/decyzja?id=${id}&a=${akcja}&s=${podpisz(`decyzja.${id}.${akcja}`)}`;
  return { potwierdz: link('potwierdz'), odrzucBrak: link('odrzuc-brak'), odrzuc: link('odrzuc'), panel: `${adresStrony}/panel/` };
}
export const poprawnyLinkDecyzji = (id, akcja, s) => ID.test(String(id)) && AKCJE_LINKU.includes(akcja) && zgodnyPodpis(`decyzja.${id}.${akcja}`, s);

// Jedyne miejsce zmiany statusu. Idempotentne: druga decyzja nic nie robi.
export async function zdecyduj(id, akcja, { powod, powodTekst, oznaczPelne, zrodlo } = {}) {
  const m = await magazyn();
  const r = await pobierzRezerwacje(id);
  if (!r) return { blad: 'nie-ma' };
  if (r.status !== 'oczekuje') return { juz: true, rezerwacja: r };

  r.status = akcja === 'potwierdz' ? 'potwierdzona' : 'odrzucona';
  r.decyzjaO = new Date().toISOString();
  r.decyzjaZrodlo = zrodlo || 'panel';
  if (r.status === 'odrzucona') {
    r.powod = Object.hasOwn(POWODY_ODRZUCENIA, powod) ? powod : 'brak-miejsc';
    r.powodTekst = r.powod === 'inny' ? tekst(powodTekst, 300) : '';
  }
  await m.set(kluczRezerwacji(id), r);

  if (r.status === 'odrzucona' && oznaczPelne) await ustawDzienPelny(r.data, true);

  const mail = r.status === 'potwierdzona' ? mailRezerwacjaPotwierdzona(r) : mailRezerwacjaOdrzucona(r);
  try {
    await wyslijMail({ do: r.email, temat: mail.temat, html: mail.html, text: mail.text, odpowiedzDo: ustawienia().mailRestauracji });
    r.mailDoGosciaWyslany = true;
  } catch (e) {
    console.error('Mail do gościa nie wyszedł', id, e.message);
    r.mailDoGosciaWyslany = false;
  }
  await m.set(kluczRezerwacji(id), r);
  return { rezerwacja: r };
}

export async function ustawDzienPelny(data, pelny) {
  const m = await magazyn();
  const grafik = await wczytajGrafik();
  if (pelny) grafik.wyjatki[data] = { typ: 'pelne' };
  else if (grafik.wyjatki[data]?.typ === 'pelne') delete grafik.wyjatki[data];
  await m.set('grafik', grafik);
  return grafik;
}

export async function wszystkieRezerwacje() {
  const m = await magazyn();
  const klucze = await m.list('rezerwacja/');
  const lista = (await Promise.all(klucze.map((k) => m.get(k)))).filter(Boolean);
  return lista.sort((a, b) => (a.data + a.godzina).localeCompare(b.data + b.godzina));
}
