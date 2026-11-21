// GET /llms.txt - opis restauracji dla asystentów AI. Godziny z wizytówki Google.
// Tekst edytuj tutaj (plik statyczny llms.txt nie istnieje - generuje go ta funkcja).
import { godziny, opisAngielski } from '../lib/godziny.mjs';

const TRESC = `# Karkonoski Wyszynk

> Restaurant and tavern in the centre of Szklarska Poręba, Poland, on the ground
> floor of Villa Bożena, a building from 1892. Karkonosze regional cuisine with
> Czech influences: pork knuckle, ribs, hand-made pierogi made daily, Czech dishes
> (Hermelín, kulajda, smažený sýr) and Pilsner Urquell on tap. Karkonoski Wyszynk
> has operated here since 2026.

- Address: ul. Jedności Narodowej 18, 58-580 Szklarska Poręba (ground floor, Villa Bożena)
- Phone: +48 793 066 186
- Opening hours (synced from the Google Business Profile): {{GODZINY}}
- Live opening hours and today's status: https://karkonoskiwyszynk.pl/api/godziny
- Typical spend: 40-60 PLN per person
- Walk-ins welcome; table booking online is optional and confirmed by e-mail
- Groups over 12 people: please call
- Vegetarian dishes available; garden seating (seasonal)
- Staff speak Polish and English; the menu is available in Polish, English, German and Czech

## Menu and prices
- [Menu (website)](https://karkonoskiwyszynk.pl/#menu)
- [Menu as JSON](https://karkonoskiwyszynk.pl/menu.json): all dishes with prices in PLN, generated from the website

## Booking
- [Book a table](https://karkonoskiwyszynk.pl/rezerwacja/): online booking at least one hour ahead
- [Table availability API](https://karkonoskiwyszynk.pl/api/grafik): free booking times (Europe/Warsaw)

## Private events
- [Event configurator](https://karkonoskiwyszynk.pl/imprezy/): company Christmas parties, birthdays, communions, christenings, weddings, anniversaries; 10-60 guests, room can be booked exclusively; food from the menu, set menu per person or buffet; DJ, live music, projector, sound system, childcare and photo booth can be arranged. The restaurant replies with an offer.

## Christmas catering
- [Order Christmas catering](https://karkonoskiwyszynk.pl/catering/): orders until 20 December, pickup on 24 December 12:00-15:00
- [Catering menu as JSON](https://karkonoskiwyszynk.pl/catering/menu.json)

## Other
- [History of the building](https://karkonoskiwyszynk.pl/historia/)
- [API description (OpenAPI)](https://karkonoskiwyszynk.pl/openapi.json)
- [Terms and privacy](https://karkonoskiwyszynk.pl/regulamin/)
`;

export default async function handler() {
  let opis = 'see the Google Business Profile';
  try { opis = opisAngielski(await godziny()); } catch (e) { console.error('llms: godziny', e.message); }
  return new Response(TRESC.replace('{{GODZINY}}', opis), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=600', 'Netlify-CDN-Cache-Control': 'public, s-maxage=600', 'Access-Control-Allow-Origin': '*' }
  });
}

export const config = { path: '/llms.txt' };
