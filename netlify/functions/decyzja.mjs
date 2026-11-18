// /rezerwacja/decyzja - strona otwierana z przycisków w mailu do restauracji.
// GET niczego nie zmienia (skanery linków w poczcie same otwierają linki).
// Dla „Potwierdź” i „Odrzuć - brak miejsc” strona od razu wysyła POST
// skryptem w widocznej karcie przeglądarki - dla człowieka decyzja zapada
// jednym kliknięciem w mailu. Automat bez JS (lub z navigator.webdriver)
// zobaczy tylko przycisk. „Odrzuć” (inny powód) zawsze pokazuje formularz.
import { BEZ_CACHE, dataSlownie } from '../lib/wyszynk.mjs';
import { pobierzRezerwacje, poprawnyLinkDecyzji, zdecyduj } from '../lib/rezerwacje.mjs';
import { esc, osoby } from '../lib/maile.mjs';

function strona(tytul, tresc) {
  return new Response(`<!DOCTYPE html><html lang="pl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>${esc(tytul)} - Karkonoski Wyszynk</title>
<style>
:root{--forest:#1F4A2E;--gold:#9B7A1A;--gold-dark:#7A5F12;--gold-light:#C49A22;--gold-lighter:#E8C45A;--brown:#2E1F0E;--ivory:#F5EDD8;--ivory-alt:#EDE0C4}
*{box-sizing:border-box}body{margin:0;background:var(--ivory);color:#1C1409;font-family:"Cormorant Garamond",Georgia,serif;font-size:1.15rem;line-height:1.55}
.pasek{background:var(--forest);border-bottom:1px solid rgba(232,196,90,.25);padding:.9rem 1rem;text-align:center}
.pasek img{height:34px;filter:brightness(0) invert(1)}
main{max-width:560px;margin:0 auto;padding:2rem 1rem 3rem}
.eyebrow{text-transform:uppercase;letter-spacing:.18em;font-size:.78rem;font-weight:600;color:var(--gold-dark)}
h1{font-family:"Playfair Display",Georgia,serif;color:var(--forest);margin:.2rem 0 1rem;font-size:1.9rem;line-height:1.2}
.karta{background:#FBF6EA;border:1px solid var(--gold);border-radius:2px;padding:1.4rem 1.2rem}
dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:.35rem 1rem}dt{color:var(--gold-dark);font-size:.85rem;text-transform:uppercase;letter-spacing:.1em;padding-top:.2rem}dd{margin:0}
fieldset{border:none;padding:0;margin:1.2rem 0 0}legend{font-weight:700;color:var(--forest);margin-bottom:.3rem}
label{display:flex;gap:.5rem;align-items:flex-start;margin:.35rem 0}input[type=radio],input[type=checkbox]{width:1.1rem;height:1.1rem;margin-top:.3rem;accent-color:var(--forest)}
textarea{width:100%;font:inherit;font-size:1rem;border:1px solid #DFD0A8;border-bottom:2px solid var(--gold);border-radius:2px;padding:.5rem;min-height:70px;background:#fff}
button{display:block;width:100%;margin-top:1.4rem;font:inherit;font-weight:700;text-transform:uppercase;letter-spacing:.14em;font-size:.95rem;padding:1rem;border-radius:2px;cursor:pointer;border:1px solid var(--gold-light);background:var(--gold-light);color:var(--brown)}
button.odrzuc{background:var(--forest);border-color:var(--forest);color:var(--ivory)}
.status{border-left:3px solid var(--gold-light);padding:.4rem .8rem;background:#FBF6EA;margin:1rem 0}
a{color:var(--forest);font-weight:600}
</style></head><body><div class="pasek"><img src="/assets/img/logokrzywe.svg" alt="Karkonoski Wyszynk" height="34"></div>
<main>${tresc}<p style="margin-top:1.6rem"><a href="/panel/">Otwórz panel rezerwacji →</a></p></main></body></html>`,
  { headers: { ...BEZ_CACHE, 'Content-Type': 'text/html; charset=utf-8', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' } });
}

const szczegoly = (r) => `<dl>
<dt>Termin</dt><dd><strong>${esc(dataSlownie(r.data))}, ${esc(r.godzina)}</strong></dd>
<dt>Osoby</dt><dd>${esc(osoby(r.osoby))}</dd>
<dt>Gość</dt><dd>${esc(r.imie)} ${esc(r.nazwisko)}</dd>
<dt>Telefon</dt><dd><a href="tel:${esc(r.telefon)}">${esc(r.telefon)}</a></dd>
<dt>E-mail</dt><dd>${esc(r.email)}</dd>
${r.uwagi ? `<dt>Uwagi</dt><dd>${esc(r.uwagi)}</dd>` : ''}</dl>`;

const opisStatusu = (r) => r.status === 'potwierdzona'
  ? `Ta rezerwacja jest już <strong>potwierdzona</strong>${r.mailDoGosciaWyslany === false ? ' - ale mail do gościa NIE wyszedł, zadzwoń do niego.' : ', gość dostał maila.'}`
  : `Ta rezerwacja została <strong>odrzucona</strong>${r.mailDoGosciaWyslany === false ? ' - ale mail do gościa NIE wyszedł, zadzwoń do niego.' : ', gość dostał maila.'}`;

export default async function handler(request) {
  const url = new URL(request.url);
  let id, a, s, form;
  if (request.method === 'POST') {
    form = await request.formData();
    id = form.get('id'); a = form.get('a'); s = form.get('s');
  } else if (request.method === 'GET') {
    id = url.searchParams.get('id'); a = url.searchParams.get('a'); s = url.searchParams.get('s');
  } else return new Response(null, { status: 405, headers: { Allow: 'GET, POST' } });

  if (!poprawnyLinkDecyzji(id, a, s)) return strona('Nieprawidłowy link', '<h1>Nieprawidłowy link</h1><p>Ten link jest niepełny lub uszkodzony. Otwórz rezerwację w panelu.</p>');
  const r = await pobierzRezerwacje(id);
  if (!r) return strona('Brak rezerwacji', '<h1>Nie znaleziono rezerwacji</h1><p>Mogła zostać już usunięta.</p>');

  if (request.method === 'POST') {
    const szybkie = a === 'odrzuc-brak';
    const wynik = await zdecyduj(id, szybkie ? 'odrzuc' : a, {
      powod: szybkie ? 'brak-miejsc' : form.get('powod'),
      powodTekst: form.get('powodTekst'),
      oznaczPelne: form.get('pelne') === '1',
      zrodlo: 'mail'
    });
    const rr = wynik.rezerwacja;
    const naglowek = wynik.juz ? 'Decyzja była już podjęta' : (rr.status === 'potwierdzona' ? 'Rezerwacja potwierdzona' : 'Rezerwacja odrzucona');
    return strona(naglowek, `<span class="eyebrow">Rezerwacja online</span><h1>${naglowek}</h1><div class="status">${opisStatusu(rr)}</div><div class="karta">${szczegoly(rr)}</div>`);
  }

  if (r.status !== 'oczekuje') return strona('Decyzja podjęta', `<span class="eyebrow">Rezerwacja online</span><h1>Decyzja była już podjęta</h1><div class="status">${opisStatusu(r)}</div><div class="karta">${szczegoly(r)}</div>`);

  const ukryte = `<input type="hidden" name="id" value="${esc(id)}"><input type="hidden" name="a" value="${esc(a)}"><input type="hidden" name="s" value="${esc(s)}">`;

  // Decyzja jednym kliknięciem w mailu: auto-zatwierdzenie w widocznej karcie.
  if (a === 'potwierdz' || a === 'odrzuc-brak') {
    const potw = a === 'potwierdz';
    const tytul = potw ? 'Potwierdzam rezerwację…' : 'Odrzucam rezerwację (brak miejsc)…';
    return strona(tytul, `<span class="eyebrow">Rezerwacja online</span><h1 id="naglowek">${tytul}</h1>
<div class="karta">${szczegoly(r)}
<form method="post" id="auto">${ukryte}
<button type="submit" id="przycisk" class="${potw ? '' : 'odrzuc'}">${potw ? 'Potwierdź i wyślij maila do gościa' : 'Odrzuć i wyślij maila do gościa'}</button></form></div>
<script>
(function () {
  var f = document.getElementById('auto'), wyslane = false;
  function wyslij() {
    // Tylko karta widoczna i aktywna (na wierzchu u człowieka); automaty bez
    // fokusu albo z navigator.webdriver zobaczą sam przycisk.
    if (wyslane || navigator.webdriver || document.prerendering || document.visibilityState !== 'visible' || !document.hasFocus()) return;
    wyslane = true;
    document.getElementById('przycisk').disabled = true;
    document.getElementById('przycisk').textContent = 'Zapisywanie…';
    f.submit();
  }
  wyslij();
  document.addEventListener('visibilitychange', wyslij);
  window.addEventListener('focus', wyslij);
})();
</script>`);
  }

  const formularz = `<form method="post">${ukryte}
<fieldset><legend>Powód (trafi do gościa)</legend>
<label><input type="radio" name="powod" value="brak-miejsc" checked> Brak wolnych stolików w tym terminie</label>
<label><input type="radio" name="powod" value="zamkniete"> Lokal nieczynny / wydarzenie zamknięte</label>
<label><input type="radio" name="powod" value="inny"> Inny - wpisz poniżej</label>
<textarea name="powodTekst" maxlength="300" placeholder="Treść dla gościa (przy „Inny”)"></textarea>
</fieldset>
<label style="margin-top:1rem"><input type="checkbox" name="pelne" value="1"> Oznacz ${esc(dataSlownie(r.data))} jako <strong>brak miejsc</strong> - zniknie z formularza rezerwacji</label>
<button type="submit" class="odrzuc">Odrzuć i wyślij maila do gościa</button></form>`;

  return strona('Odrzucić rezerwację?',
    `<span class="eyebrow">Rezerwacja online</span><h1>Odrzucić rezerwację?</h1><div class="karta">${szczegoly(r)}${formularz}</div>`);
}

export const config = { path: '/rezerwacja/decyzja' };
