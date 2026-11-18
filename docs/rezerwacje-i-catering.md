# Rezerwacje stolików, catering świąteczny i panel

Przygotowane 18 listopada 2026. Działa na tym, co już jest w projekcie:
Netlify Functions + Netlify Blobs (magazyn `wyszynk`). Maile przez Resend.

## Przebieg rezerwacji

1. Gość na `/rezerwacja/` wybiera dzień z kalendarza (tylko dni i godziny z grafiku),
   liczbę osób (1-12, większe grupy telefonicznie) i podaje imię, nazwisko,
   telefon, e-mail (wszystkie obowiązkowe) oraz opcjonalne uwagi.
2. `POST /api/rezerwacja` sprawdza termin z grafikiem po stronie serwera, zapisuje
   rezerwację ze statusem `oczekuje` i wysyła dwa maile:
   - do restauracji (`MAIL_RESTAURACJA`) z przyciskami **Potwierdź / Odrzuć**,
     odpowiedź na maila trafia do gościa (Reply-To),
   - do gościa: „otrzymaliśmy prośbę, potwierdzenie wyślemy osobno”.
3. Pracownik decyduje z maila albo z panelu. Gość dostaje maila „Rezerwacja
   potwierdzona” albo „Przykro nam” z powodem. Przy odrzuceniu można od razu
   oznaczyć dzień jako „brak miejsc”.

Linki w mailu są podpisane (HMAC, `PANEL_SEKRET`). Wejście w link **nie zmienia**
statusu - otwiera stronę z przyciskiem (skanery linków w Outlooku/Gmailu same
otwierają linki). Decyzja jest jednorazowa: druga (np. z panelu po mailu) nic nie zmienia.

## Grafik (panel → Grafik)

- Główny wyłącznik rezerwacji online.
- Szablon tygodnia: dla każdego dnia otwarte/zamknięte i godziny od-do.
- Wyjątki na konkretne dni: **zamknięte**, **brak miejsc**, **inne godziny**.
  Wyjątek ma pierwszeństwo przed tygodniem.
- Ostatnia rezerwacja X min przed zamknięciem (domyślnie 60), horyzont w dniach
  (domyślnie 90). Dziś można rezerwować najwcześniej za godzinę, co 30 min.
- Dostępność liczy wyłącznie `dzien()` w `netlify/lib/wyszynk.mjs`. Formularz
  dostaje gotowe terminy z `GET /api/grafik`, więc logika jest w jednym miejscu.
- Nie ma limitu miejsc - pracownik odrzuca albo zaznacza „brak miejsc tego dnia”.

## Catering

- Menu, ceny, termin zamówień (`koniecZamowien`) i opis odbioru: `catering/menu.json`.
  Ten sam plik czyta strona i serwer - **ceny i sumy liczy serwer**.
- Numeracja roczna `46/2026`, `47/2026`... (start 46 w 2026, od 2027 od 1) -
  `PIERWSZY_NUMER` w `netlify/functions/api-catering.mjs`. Licznik używa zapisu
  warunkowego Blobs (etag), więc dwa równoczesne zamówienia nie dostaną tego samego numeru.
- Po 20 grudnia strona i serwer przestają przyjmować zamówienia, popup na
  stronie głównej znika (data w `index.html`, szukaj `popup-catering`).
- Panel → Catering - obsługa zamówień (`netlify/lib/catering.mjs`):
  - **etap**: Przyjęte → Gotowe do odbioru → Wydane, albo **Anulowane** (powód
    obowiązkowy, opcjonalnie mail do klienta z powodem; anulowane można przywrócić),
  - **płatność**: Nieopłacone / Opłacone,
  - każda zmiana trafia do **historii** zamówienia (data + co się zmieniło),
  - filtry etapu i płatności z licznikami, wyszukiwanie (numer, nazwisko, e-mail,
    fragment telefonu), sortowanie (numer, etap, płatność, nazwisko, kwota).
- Druk obejmuje **widoczne** (przefiltrowane) zamówienia bez anulowanych:
  **Drukuj** (jedno zamówienie na kartce A4, z etapem, płatnością i kratkami do
  odhaczania przy pakowaniu), **Drukuj widoczne zamówienia** (każde na osobnej kartce),
  **Zestawienie dla kuchni** - suma każdej pozycji w kolejności menu, w porcjach/sztukach
  i przeliczona na **kg i litry**, z sumą końcową (gołąbki/krokiety orientacyjnie
  wg `wagaSzt` z menu.json).
- Alergeny: informacja na życzenie przed zamówieniem (telefon, restauracja) i wykaz przy odbiorze.
- Regulamin i informacja RODO: `/regulamin/` (dane spółki RELAX-TOUR Sp. z o.o.
  z Wykazu podatników VAT MF, sprawdzone 18.11.2026).

## Panel `/panel/`

Wspólne hasło (`PANEL_HASLO`), sesja 12 h w ciasteczku HttpOnly/Secure/SameSite=Strict,
limit 10 prób logowania na 15 min z jednego IP. Zmiany wymagają nagłówka `X-Panel` (CSRF).

## Dane osobowe

Funkcja `sprzatanie-danych` (codziennie 3:30 UTC) usuwa rezerwacje 30 dni po
terminie wizyty, zamówienia cateringu 30 dni po 24 grudnia roku złożenia
i stare liczniki antyspamowe.

## Wdrożenie - lista kontrolna

1. **Resend:** domena wysyłkowa `mail.karkonoskiwyszynk.pl` (region eu-west-1,
   bez śledzenia otwarć/kliknięć). DNS strefy karkonoskiwyszynk.pl jest w Netlify:
   - TXT `resend._domainkey.mail` - klucz DKIM z panelu Resend,
   - MX `send.mail` → `feedback-smtp.eu-west-1.amazonses.com` (priorytet 10),
   - TXT `send.mail` → `v=spf1 include:amazonses.com ~all`,
   - CNAME `rsend.mail` → `send.forge.rmta.net`,
   - TXT `_dmarc` → `v=DMARC1; p=none;`.
   `MAIL_FROM` = `Karkonoski Wyszynk <rezerwacje@mail.karkonoskiwyszynk.pl>`.
2. **Netlify → Environment variables:** `RESEND_API_KEY`, `MAIL_FROM`,
   `MAIL_RESTAURACJA`, `PANEL_HASLO`, `PANEL_SEKRET` (wzór: `.env.example`).
3. Deploy, potem test na produkcji: rezerwacja na prawdziwy adres → mail do
   restauracji → Potwierdź → mail do gościa. To samo dla cateringu.
4. Pierwsze prawdziwe zamówienie powinno dostać numer `46/2026`.

## Lokalny podgląd

```
npm run dev     # http://localhost:8955
```
Panel: `/panel/` (hasło lokalnie `wyszynk-test`, chyba że ustawisz `PANEL_HASLO` w `.env`).
Maile nie wychodzą - podgląd: `/dev/maile`. Dane: `.netlify/dev/` (usuń katalog, żeby zacząć od zera).
Uwaga: bez `PANEL_SEKRET` w `.env` sekret losuje się przy każdym starcie serwera,
więc linki z maili z poprzedniego uruchomienia przestają działać.
