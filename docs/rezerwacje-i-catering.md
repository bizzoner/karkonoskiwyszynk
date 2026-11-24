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

W mailu do restauracji są trzy przyciski (linki podpisane HMAC, `PANEL_SEKRET`):
**Potwierdź** i **Odrzuć - brak miejsc** decydują od razu po kliknięciu, a
**Odrzuć z innym powodem** otwiera formularz. Samo pobranie strony (GET) niczego
nie zmienia - decyzję wysyła skrypt (POST) tylko w widocznej, aktywnej karcie
przeglądarki bez `navigator.webdriver`. Chroni to przed skanerami linków w poczcie,
które pobierają strony bez JS. Ryzyko szczątkowe: skaner uruchamiający JS
i udający człowieka mógłby zatwierdzić decyzję - wtedy widać to w panelu
(źródło decyzji „z maila” i godzina). Decyzja jest jednorazowa: druga nic nie zmienia.

**Termin minął bez decyzji.** Rezerwacja `oczekuje` zostaje w „Do decyzji” także
po swojej godzinie, z oznaczeniem „termin minął”. Zamiast Potwierdź/Odrzuć ma
przycisk **Zamknij bez maila** (status `zamknieta`, gość nie dostaje maila).
Linki z maila po terminie już nie decydują, tylko odsyłają do panelu.

**Nieudana wysyłka maili.** Wynik wysyłki zapisuje się przy rezerwacji
(`mailDoRestauracjiWyslany`, `mailPrzyjecieWyslany`, `mailDoGosciaWyslany`) i przy
zamówieniu (`mailDoRestauracjiWyslany`, `mailDoKlientaWyslany` + wpis w historii).
Panel pokazuje wtedy czerwone „UWAGA”. Log funkcji Netlify znika po około dobie,
więc ten zapis jest jedynym trwałym śladem. 20.11.2026 klucz Resend przestał
działać (401) i rezerwacja przepadła niezauważona; klucz wymieniono 21.11.2026.

## Grafik (panel → Grafik)

**Szablony** (Blobs `grafik-szablony`, `wczytajSzablony`/`sprawdzSzablony` w `wyszynk.mjs`):
- tygodnia (np. Sezon, Poza sezonem, Zima) - „Wczytaj do tabeli” wypełnia tabelę, można
  poprawić ręcznie; obowiązuje dopiero po „Zapisz grafik”. Nazwa wczytanego szablonu
  zapisuje się w `grafik.szablon` (z dopiskiem „(zmieniony)” po ręcznej poprawce);
- dnia (np. Sylwester, Wigilia, Impreza zamknięta) - uzupełniają formularz wyjątku.
Domyślne (gdy brak zapisu): Sezon, Poza sezonem; Impreza zamknięta, Brak miejsc.

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
- Po 20 grudnia strona i serwer przestają przyjmować zamówienia. Na stronie głównej
  znikają: popup (`popup-catering`), pasek ogłoszenia nad nawigacją (`.ogloszenie`)
  i pozycja „Catering” w menu - oba ostatnie przez atrybut `data-do="2026-12-20"`
  (skrypt „Elementy sezonowe” w `index.html`; ten sam atrybut działa na każdym elemencie).
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

Wspólne hasło (`PANEL_HASLO`), sesja 7 dni (przedłużana przy każdym otwarciu panelu) w ciasteczku HttpOnly/Secure/SameSite=Strict,
limit 10 prób logowania na 15 min z jednego IP. Zmiany wymagają nagłówka `X-Panel` (CSRF).

## Imprezy okolicznościowe (konfigurator `/imprezy/`, panel → Imprezy)

Gość wybiera datę (od jutra), liczbę gości (10-60, sala do 60 osób), wyłączność sali,
rodzaj imprezy, format jedzenia (z karty / menu stałe / bufet) i dodatki organizowane
z partnerami. `POST /api/impreza` zapisuje `impreza/<id>` i wysyła maile do restauracji
(Reply-To: gość) i do gościa. To zapytanie, nie rezerwacja - termin ustala się po kontakcie.
Panel: statusy Nowe / W kontakcie / Potwierdzone / Odrzucone. Słowniki opcji:
`netlify/lib/imprezy.mjs` (serwer, maile) - lista w `imprezy/index.html` i `panel/index.html`
musi mieć te same klucze. Dane osobowe usuwane 30 dni po terminie imprezy (archiwum anonimowe).

## Raport poranny i stan systemu

`raport-poranny` (codziennie 8:00 UTC = 9:00 zimą, 10:00 latem) sprawdza klucz Resend
(pusty POST: 422 = OK, 401 = zły klucz) i pobieranie godzin z Google, po czym wysyła na
`MAIL_RESTAURACJA` raport: rezerwacje na dziś, do decyzji, nowe zapytania o imprezy,
potwierdzone imprezy w tygodniu, catering. Gdy wszystko jest zerem i nie ma problemów,
raport nie wychodzi. Przy trwającej awarii raport idzie też na
`MAIL_ADMIN` (ustawiony na adres Krystiana).

Każda awaria wysyłki (401/403/5xx, brak połączenia) i pobierania godzin zapisuje się w
Blobs `stan-systemu` (`zapiszStanSystemu`), a pierwsza udana operacja ją czyści. Przy
pojawieniu się problemu i po jego ustąpieniu od razu idzie mail na `MAIL_ADMIN`
(„[Wyszynk] Problem: …” / „[Wyszynk] Naprawione: …”) - poza awarią samej wysyłki,
bo wtedy żaden mail nie wyjdzie. Panel
pokazuje awarie czerwonym komunikatem na górze - gdy nie działa wysyłka maili, to jedyne
miejsce, w którym obsługa zobaczy problem (21.11.2026 zły klucz Resend przez dobę
nikt nie zauważył).

## Prośba o opinię po wizycie

Formularz rezerwacji ma opcjonalną zgodę (`zgodaOpinia`). Funkcja `prosba-o-opinie`
(codziennie 9:00 UTC) wysyła gościom z wczorajszych **potwierdzonych** rezerwacji ze
zgodą jednego maila: przycisk „Zostaw opinię w Google” (`LINK_OPINII_GOOGLE` w
`maile.mjs`) i link „Napisz do nas” do `/opinia/` (podpis HMAC `opinia.<id>`).
**Oba linki dostaje każdy** - nie wolno kierować do Google tylko zadowolonych (zasady
Google, ryzyko usunięcia opinii). Wiadomość z `/opinia/` idzie mailem do restauracji
(Reply-To: gość) i widać ją w panelu przy rezerwacji (`wiadomosciPoWizycie`).

## Statystyki (panel → Statystyki)

Zgłoszenia, potwierdzenia, goście, źródła wizyt, dni tygodnia i godziny, catering.
Źródło wizyty (`zrodlo`) ustala skrypt na stronach publicznych przy pierwszym wejściu
w karcie: `utm_source[/utm_medium]`, kod QR albo domena strony odsyłającej, inaczej
`bezposrednio`. Trzymane w `sessionStorage['wyszynk_zrodlo']` (bez ciasteczek),
dołączane do rezerwacji i zamówień. Etykiety źródeł: `ZRODLA` w `panel/index.html`.
API: `GET /api/panel/statystyki` (`netlify/lib/statystyki.mjs`) zwraca wyłącznie
pola statystyczne, nigdy dane osobowe.

## Dane osobowe

Funkcja `sprzatanie-danych` (codziennie 3:30 UTC) usuwa rezerwacje 30 dni po
terminie wizyty, zamówienia cateringu 30 dni po 24 grudnia roku złożenia
i stare liczniki antyspamowe. Przed usunięciem zapisuje zanonimizowaną kopię do
statystyk (`archiwum/rezerwacja/`, `archiwum/catering/`: status, termin, liczba osób,
suma, źródło - bez imienia, nazwiska, telefonu, e-maila i uwag).

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
