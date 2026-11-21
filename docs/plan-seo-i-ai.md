# SEO, wizytówka Google i AI: co zrobione, co dalej

Lista robocza. Aktualizuj po każdej zmianie: przenieś zadanie do „Zrobione” z datą.
Plik jest w `docs/`, więc nie jest publiczny (netlify.toml zwraca 404).

## Do zrobienia

### Strona (kod)
- [ ] Przyjmowanie rezerwacji przez agentów AI (`POST /api/rezerwacja` w
  `openapi.json`). Technicznie działa (limit 5/h na IP, każdą zatwierdza
  pracownik). Udostępnić świadomie, gdy będzie widać ruch od asystentów AI.
- [ ] Dane strukturalne dla cateringu (oferta sezonowa z datą końca zamówień).

### Wizytówka Google i konta (robi właściciel / Krystian)
- [ ] **Google Ads: „Nie można obciążyć Twojej formy płatności”** - reklamy
  prawdopodobnie stoją (widoczne 21.11.2026). Marek zajmuje się płatnością (pon. 23.11).
- [ ] Sprawdzić, czy w wizytówce pojawił się przycisk rezerwacji (link dodany
  21.11.2026, czekał na weryfikację Google). Jeśli brak do ~25.11 - szukać
  komunikatu o odrzuceniu.
- [ ] **Po sezonie (po 24.12): usunąć link „Zamawianie jedzenia” → /catering/**
  z wizytówki.
- [ ] Wpis w wizytówce „Catering świąteczny” z przyciskiem „Zamów online”
  (sezonowo, listopad-grudzień).
- [ ] Godziny świąteczne w wizytówce (Wigilia, Święta, Sylwester) - strona pobierze je sama.
- [ ] Odpowiadać na nowe opinie na bieżąco (wizytówka pokazuje licznik).

### Kontrola (za 1-2 tygodnie od 21.11.2026)
- [ ] Search Console: czy /en/, /de/, /cs/ są zindeksowane i czy pojawiają się
  wyświetlenia z Czech i Niemiec (Skuteczność → Kraje).
- [ ] Search Console → Strony: czy `/rezerwacja/`, `/catering/`, `/historia/` są
  zindeksowane (prośby wysłane 21.11.2026; wcześniej Google ich nie znał).
- [ ] Search Console → Skuteczność: CTR fraz „pierogi szklarska poręba”,
  „bar mleczny szklarska poręba” po zmianie opisu strony (przed: 0-6%).
- [ ] Czy adres `http://karkonoskiwyszynk.pl/` znika z raportu (wizytówka ma od
  21.11 adres https, strona ma canonical).

## Stałe zasady
- Po każdej zmianie dań lub cen: `npm run menu` (generuje `/menu.json` i
  schema.org `Menu`). Sprawdzenie: `npm run menu -- --check`.
- `llms.txt` opisuje restaurację dla AI - aktualizuj przy zmianie godzin,
  cen orientacyjnych, języków obsługi, sezonu cateringu.
- Obsługa mówi po polsku i angielsku (nie po czesku/niemiecku); menu jest w 4
  językach. Ogródek tylko w sezonie. (Potwierdzone przez Krystiana 21.11.2026.)
- Teksty dla gości (strona, maile, odpowiedzi na opinie) pokazujemy do akceptacji
  przed publikacją.

## Zrobione
- 2026-11-21: raport poranny dla restauracji + kontrola wysyłki maili i godzin z Google,
  komunikat o awarii w panelu.
- 2026-11-21: szablony grafiku rezerwacji (tygodnia i dnia) w panelu; grafik celowo
  niezależny od godzin z Google. Data otwarcia w wizytówce (2022, z Pierogarnią Bożena)
  potwierdzona jako prawidłowa.
- 2026-11-21: wersje językowe /en/, /de/, /cs/ (strona główna i historia) generowane
  `npm run jezyki`, hreflang, sitemap z alternatywami; zgodność z tłumaczeniem w
  przeglądarce sprawdzona element po elemencie (0 różnic).
- 2026-11-21: prośba o opinię dzień po wizycie (za zgodą), strona /opinia/ „Napisz do
  nas”, regulamin uzupełniony o zgodę i zapytania o imprezy.
- 2026-11-21: godziny otwarcia synchronizowane z wizytówki Google (Places API) na
  stronie, w danych strukturalnych i llms.txt; ostrzeżenie w panelu o niezgodnym grafiku.
- 2026-11-21: konfigurator imprez /imprezy/ (10-60 osób) z obsługą w panelu; link w
  nawigacji i kontakcie (4 języki), sitemap, llms.txt.
- 2026-11-21: statystyki w panelu (źródła wizyt z UTM/QR/referera, dni, godziny,
  catering) i zanonimizowane archiwum do statystyk po terminie RODO.
- 2026-11-21: link rezerwacji w wizytówce (z UTM), `ReserveAction` w danych strony.
- 2026-11-21: informacja „można przyjść bez rezerwacji” na /rezerwacja/ i w kontakcie.
- 2026-11-21: Search Console - prośby o indeksowanie 3 podstron, ponownie
  zgłoszona mapa witryny (5 stron); canonical na stronie głównej.
- 2026-11-21: wizytówka - adres strony na https, link Zamawianie → /catering/,
  Instagram, odpowiedzi na 5 opinii.
- 2026-11-21: nowy opis strony (meta description) pod frazy pierogi / domowe obiady.
- 2026-11-21: blokada publicznego dostępu do docs/, kodu funkcji, skryptów i
  konfiguracji; cache zdjęć 7 dni; aktualne daty w sitemap.
- 2026-11-21: `/menu.json`, schema.org `Menu` (71 pozycji), `/openapi.json`,
  `/llms.txt`; `knowsLanguage` poprawione na pl, en.
