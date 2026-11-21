// Codziennie o 10:00 (czasu polskiego zimą; 11:00 latem) wysyła prośbę o opinię
// gościom z wczorajszych potwierdzonych rezerwacji, którzy zaznaczyli na to zgodę.
// Każdy gość dostaje ją najwyżej raz (pole prosbaOOpinieWyslana).
import { magazyn, terazWPolsce, dodajDni, wyslijMail, ustawienia, podpisz } from '../lib/wyszynk.mjs';
import { mailProsbaOOpinie } from '../lib/maile.mjs';

export default async function handler() {
  const m = await magazyn();
  const wczoraj = dodajDni(terazWPolsce().data, -1);
  const { adresStrony, mailRestauracji } = ustawienia();
  let wyslane = 0;
  for (const k of await m.list('rezerwacja/')) {
    const r = await m.get(k);
    if (!r || r.status !== 'potwierdzona' || r.data !== wczoraj || !r.zgodaOpinia || r.prosbaOOpinieWyslana) continue;
    const link = `${adresStrony}/opinia/?id=${r.id}&s=${podpisz(`opinia.${r.id}`)}`;
    const mail = mailProsbaOOpinie(r, link);
    try {
      await wyslijMail({ do: r.email, temat: mail.temat, html: mail.html, text: mail.text, odpowiedzDo: mailRestauracji });
      r.prosbaOOpinieWyslana = new Date().toISOString();
      await m.set(k, r);
      wyslane++;
    } catch (e) { console.error('prosba-o-opinie', r.id, e.message); }
  }
  console.log('prosba-o-opinie: wyslano', wyslane);
}

export const config = { schedule: '0 9 * * *' };
