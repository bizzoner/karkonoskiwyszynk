// Obsługa zamówień cateringu po stronie restauracji: etap realizacji,
// płatność, anulowanie z powodem, historia zmian.
import { magazyn, wyslijMail, ustawienia, tekst } from './wyszynk.mjs';
import { mailZamowienieAnulowane } from './maile.mjs';

// Etap realizacji: przyjete → gotowe (do odbioru) → wydane; albo anulowane.
export const ETAPY = { przyjete: 'Przyjęte', gotowe: 'Gotowe do odbioru', wydane: 'Wydane', anulowane: 'Anulowane' };
export const PLATNOSCI = { nieoplacone: 'Nieopłacone', oplacone: 'Opłacone' };
const ID = /^\d{8}-[0-9a-f]{10}$/;
export const kluczZamowienia = (id) => `catering/${id}`;

// Starsze zapisy (sprzed statusów) traktujemy jak "przyjęte, nieopłacone".
export function uzupelnij(z) {
  return { etap: 'przyjete', platnosc: 'nieoplacone', historia: [], ...z };
}

export async function wszystkieZamowienia() {
  const m = await magazyn();
  return (await Promise.all((await m.list('catering/')).map((k) => m.get(k)))).filter(Boolean).map(uzupelnij);
}

export async function zmienZamowienie(id, { etap, platnosc, powod, powiadom }) {
  if (!ID.test(String(id))) return { blad: 'nie-ma' };
  const m = await magazyn();
  const surowe = await m.get(kluczZamowienia(id));
  if (!surowe) return { blad: 'nie-ma' };
  const z = uzupelnij(surowe);
  const kiedy = new Date().toISOString();
  const wpisy = [];

  if (etap !== undefined && etap !== z.etap) {
    if (!Object.hasOwn(ETAPY, etap)) return { blad: 'zly-etap' };
    if (etap === 'anulowane') {
      const p = tekst(powod, 300);
      if (!p) return { blad: 'brak-powodu' };
      z.powodAnulowania = p;
      wpisy.push(`Anulowane: ${p}`);
    } else {
      if (z.etap === 'anulowane') { wpisy.push('Przywrócone po anulowaniu'); delete z.powodAnulowania; }
      wpisy.push(`Etap: ${ETAPY[etap]}`);
    }
    z.etap = etap;
  }
  if (platnosc !== undefined && platnosc !== z.platnosc) {
    if (!Object.hasOwn(PLATNOSCI, platnosc)) return { blad: 'zla-platnosc' };
    z.platnosc = platnosc;
    wpisy.push(`Płatność: ${PLATNOSCI[platnosc]}`);
  }
  if (!wpisy.length) return { zamowienie: z };

  z.historia = [...z.historia, ...wpisy.map((co) => ({ kiedy, co }))];
  z.zmieniono = kiedy;
  await m.set(kluczZamowienia(id), z);

  if (etap === 'anulowane' && powiadom) {
    const mail = mailZamowienieAnulowane(z);
    try {
      await wyslijMail({ do: z.email, temat: mail.temat, html: mail.html, text: mail.text, odpowiedzDo: ustawienia().mailRestauracji });
      z.historia.push({ kiedy, co: 'Wysłano klientowi maila o anulowaniu' });
    } catch (e) {
      console.error('Mail o anulowaniu nie wyszedł', id, e.message);
      z.historia.push({ kiedy, co: 'UWAGA: mail o anulowaniu NIE wyszedł - zadzwoń do klienta' });
    }
    await m.set(kluczZamowienia(id), z);
  }
  return { zamowienie: z };
}
