# Karkonoski Wyszynk — strona WWW

Statyczna strona karczmy piwnej w Szklarskiej Porębie (budynek z 1892).
Zero frameworków, zero zależności, zero build stepu. Czysty HTML + CSS + waniliowy JS.

---

## 1. NAJWAŻNIEJSZE: pliki `.css` i `.js` w repo NIE są tym, co działa

`index.html` ma **zinline'owane kopie** `style.css` i `script.js` wewnątrz
`<style>` i `<script>`. Przeglądarka **nie ładuje** osobnych plików — nie ma do
nich żadnego `<link>` ani `<script src>`. Zrobiono to celowo (oba pliki były
poniżej progu, gdzie osobne żądanie kosztuje więcej niż oszczędza).

**Konsekwencja: każdą zmianę CSS/JS nanosisz w DWÓCH miejscach.**
`index.html` jest tym, co widzi użytkownik — jeśli naniesiesz tylko do
`style.css`, zmiana nie zadziała i nikt tego od razu nie zauważy.

**Te pliki już się rozjechały.** Stan na 2026-07-29: inline w `index.html` ma
większe fonty menu niż `style.css` (`.danie__nazwa` 1.35rem vs 1.2rem,
`.danie__cena` 1.3 vs 1.15, `.danie__opis` 1.18 vs 1.02). Nigdy nie zakładaj,
że `style.css` odzwierciedla stronę na żywo — sprawdź inline.

Podstrony `/witaj/` i `/gosc/` mają własne, niezależne style inline.

---

## 2. Język wizualny jest surowy CELOWO — nie „naprawiaj" go

Ostre rogi (`--radius: 2px`), złote linie włosowe 1px, brak cieni, wszystko
szeryfowe, zero ikon, zero emoji, zero animacji. **To nie jest niedokończone
stylowanie.** Estetyka celuje w starą etykietę browarnianą, nie w interfejs
aplikacji — zaokrąglenia, miękkie cienie i kolorowe kafle natychmiast czytają
się jako „strona z 2020" i psują cały efekt.

Nie dodawaj z własnej inicjatywy: `border-radius` > 2px, `box-shadow` na
kartach, krojów bezszeryfowych, bibliotek ikon (Lucide/FontAwesome), emoji,
animacji wejścia, gradientów jako dekoracji.

Dekoracja idzie wyłącznie przez: złote linie włosowe, ornamenty narożne
(`.ornament-corners`), separator linia–romb–linia (`.divider__mark`),
uppercase z szerokim trackingiem (`.eyebrow`), romb `◆` (U+25C6) jako jedyny
dopuszczalny „ikonek".

**Źródło prawdy:** projekt w Claude Design — *Wyszynk Karkonoski Design System*,
`projectId: ca1ea99d-7278-4cc9-b245-cf08296863c6`. Plik `readme.md` w tym
projekcie opisuje paletę, typografię, ton copy i komponenty (`MenuItem`,
`VariantRow`, `CategoryHeader`, `Ornament`, `Brandmark`, `MenuPage`).
Czytaj go przez narzędzie `DesignSync` przed większymi zmianami wizualnymi.

Uwaga: komponenty DS-u są projektowane pod druk A4, gdzie nazwy dań się nie
zawijają. Przenosząc je 1:1 na web trafisz na problemy z zawijaniem — patrz
leader w menu (`align-items: flex-end`, nie `baseline`).

---

## 3. Menu — struktura i i18n

```
.menu__zakladka[data-kategoria]   → przełącznik kategorii
.menu__kategoria#<id>             → panel; UKRYTY dopóki nie ma .jest-aktywna
  .danie
    .danie__glowna                → flex: nazwa | leader ::before | cena
      .danie__nazwa               → h4; zawiera .danie__odznaka i .danie__gramatura
      .danie__cena                → też "cena sezonowa", nie zawsze liczba
    .danie__opis
    .danie__warianty li           → span label | leader ::before | span cena
```

Kropkowany leader jest pseudoelementem `::before` (HTML nietknięty), ustawiony
między nazwą a ceną przez `order: 1/2/3`. Poniżej 700px ukrywany — na wąskim
ekranie nazwa zjada całą szerokość i zostaje z niego kilkukropkowy kikut.

**i18n:** słownik `I18N_DANE` inline w `index.html`, języki `pl/en/de/cs`
(etykieta przycisku dla `cs` to **CZ**). Tłumaczenie po atrybucie `data-i18n`,
zapamiętane w `localStorage['wyszynk_jezyk']`. Podmieniany jest **tylko pierwszy
węzeł tekstowy**, żeby zagnieżdżone `<span>` (odznaka, gramatura) przetrwały.

**Dodając danie: musisz dopisać klucze do wszystkich czterech języków.** Brak
klucza = element zostaje po polsku, bez żadnego błędu.

Czeskie nazwy dań zostają w oryginale z diakrytyką (*Hermelín*, *kulajda*,
*Smažený sýr*). Ceny jako pełne złote z sufiksem (`29 zł`), gramatura w
nawiasie. Emoji — nigdy, nigdzie.

---

## 4. Podstrony QR — nie ruszać adresów

`/witaj/` i `/gosc/` to landingi kodów QR **wydrukowanych** na ekspozytorach w
Villa Bożena i OW Sudety. Adresy są zaszyte na papierze — zmiana ścieżki
unieważnia fizyczne materiały. Obie mają `noindex, nofollow` i nie są linkowane
z nawigacji. Dlatego też przełącznik języka nie zmienia URL-a.

---

## 5. Grafiki

`assets/img/` — `.webp` jest formatem serwowanym, `.jpg` to źródło/fallback.

`_KSA6568-2.jpg` i `_KSA6568poziom.jpg` to **nieużywane kopie** — nie
commituj ich, nie podpinaj, nie pytaj o nie (są w `.gitignore`).

---

## 6. Git

Jedna gałąź `main`, commity bezpośrednio na nią (repo deployuje się z `main`,
branch nic by nie dał). Komunikaty po polsku, tryb rozkazujący, zwykle bez
polskich znaków: *„Dodaj kropkowany zloty leader w wierszach menu"*.

---

## 7. Testowanie w przeglądarce — trzy pułapki

1. **Rozszerzenie Chrome nie otwiera `file://`.** Trzeba postawić serwer:
   `python -m http.server 8777 --bind 127.0.0.1` w katalogu repo.
2. **`html { scroll-behavior: smooth }`** rozwala skryptowe `scrollTo` —
   ustaw `document.documentElement.style.scrollBehavior='auto'` przed przewijaniem.
3. **`resize_window` nie działa na tej maszynie** (ultrawide, okno
   zmaksymalizowane — zwraca sukces, `innerWidth` się nie zmienia). Responsywność
   testuj wstrzykując `<iframe>` o stałej szerokości: media queries liczą się
   względem viewportu iframe'a. Do czytelnego zrzutu dodaj
   `transform: scale(3)` — nie zmienia to wewnętrznego viewportu.

Kategorie menu są `display: none` bez `.jest-aktywna`, więc `scrollIntoView` na
ukrytym panelu zwróci 0. Najpierw aktywuj kategorię, potem przewijaj.
