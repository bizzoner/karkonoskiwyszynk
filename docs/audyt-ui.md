# Kontrola układu i czytelności — 18.09.2026

Zakres: lokalna strona główna `index.html`, po aktualizacji menu. Bez publikacji.
Podstrony QR `/witaj/` i `/gosc/` pozostają bez zmian.

## Układ

- Kolejność: hero → krótkie wprowadzenie → menu → Pilsner → galeria → kontakt.
- Pełna historia miejsca jest dostępna w rozwijanym elemencie `details`.
- Główna akcja hero: „Zobacz menu”; obok rezerwacja telefoniczna.
- Dziesięć kategorii WWW, wszystkie dania główne w jednym panelu.
- Na telefonie natywny wybór kategorii zamiast wielorzędowych zakładek.
- Wysokość nawigacji kategorii przy 390 px: około 100 px, wcześniej 336 px.
- Zmiana kategorii przewija do początku menu, także po wybraniu jej z końca listy.

## Kontrast

Obliczenia według względnej luminancji sRGB, na podstawie kolorów CSS
odczytanych w Chrome. Próg porównania: 4,5:1 dla zwykłego tekstu;
WCAG dopuszcza 3:1 dla dużego tekstu.

| Zastosowanie | Kolory | Wynik |
| --- | --- | --- |
| Ceny, znaczniki, małe złote nagłówki na papierze | `#7A5F12` / `#F5EDD8` | 5,18:1 |
| Nazwy dań na papierze | `#1F4A2E` / `#F5EDD8` | 8,66:1 |
| Opisy na papierze | `#5C3D1E` / `#F5EDD8` | 8,40:1 |
| Jasne złoto na zieleni | `#E8C45A` / `#1F4A2E` | 6,01:1 |
| Tekst hero na przyciemnionym zdjęciu | kość słoniowa, brązowa warstwa 72% | ≥ 5,44:1 |

Hero policzono zachowawczo dla białego piksela fotografii pod przyciemnieniem,
bez polegania na aktualnym kadrze. Przyciski mają własne jednolite tło.
Usunięto zanikanie tekstu w hero i przejścia kolorów aktywnych języków/kategorii,
które chwilowo obniżały kontrast. Obramowania kontrolek i fokus otrzymały
kolory o wyraźnym kontraście; dekoracyjne linie pozostają delikatne.

## Rozmiary i grafiki

- Nazwy dań: 22 px mobile / 23 px desktop; opisy: 18 / 19 px; interlinia 1,55.
- Ceny: 20 px mobile / 20,8 px desktop; gramatury: 16 px; znaczniki: 13 px.
- Przyciski języków: co najmniej 28 × 44 px mobile; wybór kategorii: 48 px wysokości.
- Hamburger i zamknięcie zdjęcia: 44 × 44 px. Podstawowe przyciski: minimum 44 px wysokości.
- Logo SVG zachowuje proporcje, szerokości: 104 px w nagłówku, do 360 px w hero,
  160 px w stopce. Nie jest rozciągane do zadanego prostokąta.
- Wszystkie osiem zdjęć galerii: 600 × 600 px. Przy szerokości 1024 px miniatura
  ma około 229 × 229 px; przy maksymalnej szerokości kontenera około 272 px.
  To wystarcza również do tych miniaturek przy gęstości 2×.
- Podgląd zdjęcia używa `object-fit: contain`; okno ma ograniczenie wysokości
  i własne przewijanie, aby zdjęcie i przycisk zamknięcia pozostawały dostępne.
- Zdjęcie budynku: źródło 700 × 876 px, świadomy kadr 4:3, bez rozciągania.
  Przy dużym wyświetleniu na ekranie 2× nie ma pełnego zapasu rozdzielczości;
  wyższej jakości nie da się odzyskać samą zmianą CSS.

## Weryfikacja i ograniczenia

- Wszystkie 10 kategorii przy 320 px: PL, EN, DE i CZ, bez poziomego przewijania.
- Kontrola menu przy 390 px oraz oględziny na tablecie 768 px i desktopie 1024 px.
- Sprawdzenie kolorów tekstu renderowanego w przeglądarce: bez niezgodności
  w ustalonych stanach sprawdzonych elementów strony głównej.
- Zawijanie wszystkich opisów wariantów frytek, także w tłumaczeniach.
- Kompletność kluczy tłumaczeń, 71 pozycji z nazwą dania/napoju, 5 sezonowych zegarów,
  składnia skryptów inline oraz `git diff --check`.

To kontrola wskazanych cech interfejsu w Chrome, nie certyfikat zgodności całej
strony z WCAG. Nie obejmuje zawartości zewnętrznej mapy Google, wszystkich
technologii asystujących ani osobnych podstron QR. Ocena hierarchii zdjęć i logo
jest oceną projektową; WCAG nie narzuca jednej właściwej wielkości tych elementów.

Źródła kryteriów:
- https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
