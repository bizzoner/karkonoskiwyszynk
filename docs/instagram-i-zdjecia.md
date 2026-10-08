# Zdjęcia i Instagram

Przygotowanie zmian: 8 października 2026. Po sprawdzeniu lokalnego podglądu
właściciel wydał polecenie publikacji. Zakres: zdjęcia wnętrza, sezonowe menu,
galeria i przygotowana, nadal ukryta integracja Meta.

Wybrany przez właściciela wariant: bezpośrednie API Meta przez Netlify Functions.
Nie korzystamy z Elfsight ani z osobnego hostingu filmów. Netlify przechowuje
metadane i autoryzację; przeglądarka pobiera film z CDN Meta dopiero po kliknięciu.
Integracja pozostaje niepodłączona do czasu autoryzacji konta.
Na późniejsze polecenie właściciela cała sekcja Instagrama jest tymczasowo ukryta
atrybutem `hidden` na `#zajrzyj`. Skrypt kończy pracę przed inicjalizacją, także
przy zapisanej zgodzie. Aby ją uruchomić po podłączeniu konta, usuń ten atrybut
i ponownie sprawdź prawdziwe rolki. Samo dodanie tokenu nie odsłania sekcji.

## Synchronizacja

Repozytorium: https://github.com/bizzoner/karkonoskiwyszynk

Gałąź: `main`, wskazana w `CLAUDE.md` jako gałąź wdrożeniowa Netlify.
Przed edycją wykonano `git fetch origin main` i `git merge --ff-only origin/main`.
Punkt wyjścia: `50f9abf61cf55f74c7f47df505e1e1a1c42e67f0`.
HEAD i origin/main były identyczne, katalog roboczy czysty. Nie było lokalnych
zmian ani niewysłanych commitów wymagających kopii. Pliki ignorowane zachowano.
Ustawień gałęzi w panelu Netlify nie zweryfikowano niezależnie od instrukcji repo.

## Co działa lokalnie

- Duże zdjęcia golonki i żeberek przy menu, opisy na podstawie bieżącej karty.
- Zdjęcie wnętrza między sekcjami i galeria o różnych proporcjach kadrów.
- Natywne okno powiększenia: poprzednie/następne, strzałki klawiatury, Escape,
  kliknięcie tła, blokada przewijania i przywrócenie fokusu.
- Sekcja „Zajrzyj do Wyszynku” jest przygotowana, ale obecnie ukryta.
  Po jej odsłonięciu dostępne będą zgoda na treści Meta, jej cofnięcie oraz
  zdjęcie restauracji z linkiem do profilu przy braku połączenia lub błędzie.
- Warstwa rolek i serwerowa integracja z oficjalnym API są przygotowane.
  Konto nie jest podłączone. Dane testowe nie są częścią strony.

W wersji pobranej z GitHuba nie było mechanizmu zgód. Nowa zgoda dotyczy
wyłącznie Instagrama, ma ważność 180 dni i nie zmienia istniejącej mapy Google
ani fontów. Przed zgodą strona nie wysyła żądań do Instagrama lub jego CDN.
Okładki ładowane są po zgodzie; adres filmu pobierany jest dopiero po kliknięciu.
Odtwarzany może być jeden film. Zamknięcie usuwa odtwarzacz i przerywa pobieranie.
Napisy publikacji pozostają w języku autora, interfejs ma PL/EN/DE/CS.

## Porównanie integracji

### Elfsight: najprostsza obsługa

Gotowy widget wymaga konta Elfsight, autoryzacji profilu Instagram Business lub
Creator przez **Business (API)** i identyfikatora `elfsight-app-…`.
Nie wybierać publicznego źródła opartego wyłącznie na nazwie użytkownika.
W panelu wybrać tylko Reels, kolejność od najnowszych, 4 kolumny, układ mobilny
przewijany, odtwarzanie po kliknięciu. Własny wygląd i zachowanie widgetu wymagają
sprawdzenia po podłączeniu. Nie dodano skryptu Elfsight ani nie kupiono planu.

Cennik sprawdzony 8.10.2026: Free 0 USD, 1 widget, 200 wyświetleń miesięcznie
i branding; Basic 4 USD/mies. przy płatności rocznej (48 USD/rok),
3 widgety i 5000 wyświetleń, bez reklam. Strona pokazuje również cenę 6 USD
obok wariantu rocznego; końcową cenę i podatki należy sprawdzić przed zakupem.
Przekroczenie limitu może wyłączyć widget. Odświeżanie Instagrama co 48 godzin.

Źródła:
- https://elfsight.com/instagram-feed-instashow/pricing/
- https://help.elfsight.com/article/1375-instagram-feed-connection-types-benefits-and-differences
- https://help.elfsight.com/article/214-new-posts-dont-show-up-in-the-instagram-feed-widget-on-your-website

### Meta + Netlify: przygotowany wariant bez abonamentu widgetu

Więcej pracy przy pierwszej autoryzacji, pełna kontrola wyglądu i zgód. Wykorzystuje
Instagram API with Instagram Login, konto profesjonalne Business/Creator oraz
uprawnienie `instagram_business_basic`. W tym wariancie strona na Facebooku
nie jest wymagana. Nie używa wycofanego Basic Display API.

Brak opłaty za widget. Funkcje, żądania i pamięć Netlify rozliczają się według
planu właściciela; możliwe 0 USD dodatkowo w ramach dostępnych limitów, ale
nie jest to gwarancja darmowego hostingu. Nie sprawdzono rozliczeń tego konta.

Oficjalna kolekcja Meta potwierdza typ konta i zakres uprawnień. Pełna strona
logowania w dokumentacji Meta wymaga zalogowania, dlatego wybór wersji API
i wymagania App Review trzeba potwierdzić w panelu przy autoryzacji. Dla własnego
konta dodanego do ról aplikacji możliwy jest dostęp standardowy; obsługa kont
spoza ról aplikacji może wymagać Advanced Access, App Review i weryfikacji firmy.

Źródła:
- https://www.postman.com/meta/instagram/folder/6raa77c/instagram-api-with-instagram-login
- https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login/
- https://docs.netlify.com/build/functions/scheduled-functions/
- https://docs.netlify.com/build/data-and-storage/netlify-blobs/
- https://www.netlify.com/pricing/

## Podłączenie przygotowanego wariantu Meta

Lista wymaganych zmiennych jest również w `.env.example`, bez sekretów.
Ewentualne dane do testów lokalnych zapisuj w ignorowanym przez Git pliku `.env`.
Samo dodanie `.env` nie uruchamia synchronizacji ani nie konfiguruje Netlify.
Nie stosuj tokenu Page Access Token z wariantu Facebook Login: przygotowany kod
obsługuje Instagram User Access Token z Instagram Login.

1. W Meta for Developers skonfiguruj aplikację z Instagram API with Instagram
   Login. Podłącz `karkonoskiwyszynk`, zaakceptuj przypisanie roli, jeśli panel
   tego wymaga, i nadaj `instagram_business_basic`. Nie są potrzebne uprawnienia
   publikowania ani wiadomości.
2. Wygeneruj **nowy token długoterminowy** dla tego konta. Zapisz ID użytkownika
   API oraz obsługiwaną wersję API wskazaną w panelu. Token krótkoterminowy nie
   nadaje się do tego harmonogramu. Nie wklejaj tokenu do HTML, Gita ani czatu.
3. W Netlify, Project configuration > Environment variables, ustaw w kontekście
   Production i zakresie Functions:
   - `INSTAGRAM_ACCESS_TOKEN`: token długoterminowy;
   - `INSTAGRAM_USER_ID`: numeryczny identyfikator konta API;
   - `INSTAGRAM_API_VERSION`: wersja w formacie `vNN.0` zgodna z aplikacją.
4. Dopiero po akceptacji zmian przez właściciela opublikuj kod. Repo nadal ma
   statyczny HTML i nie wymaga budowania frontendu. `npm install` instaluje tylko
   serwerową bibliotekę `@netlify/blobs`; `netlify.toml` definiuje funkcje.
5. W panelu Netlify uruchom `instagram-sync` przez Run now albo poczekaj do
   17. minuty najbliższej godziny. Harmonogram działa wyłącznie dla produkcyjnego
   wdrożenia, nigdy automatycznie w tym lokalnym podglądzie.
6. Sprawdź po zgodzie cztery prawdziwe rolki, okładki, dźwięk, odtwarzanie i
   cofnięcie zgody. Sprawdź też log funkcji i ponownie po nowej publikacji.

Nie uruchamiaj kroku 4 bez osobnej zgody właściciela na wdrożenie.

## Odświeżanie i odporność

`instagram-sync` raz na godzinę pobiera metadane do 150 najnowszych publikacji
(maks. 3 strony po 50), wybiera do czterech rolek, sortuje po dacie i zapisuje
wynik w Netlify Blobs. Nie pobiera plików wideo i nie scrapuje profilu.
Jeżeli w tym zakresie są tylko dwie rolki, wyświetlone zostaną dwie, bez atrap.
Należy sprawdzić zakres, jeśli konto publikuje bardzo dużo zdjęć pomiędzy rolkami.

Token jest odnawiany co 7 dni przez serwerowe `refresh_access_token` i zapisywany
w prywatnym magazynie Blobs. Nie jest częścią odpowiedzi publicznych funkcji.
Nowy token w zmiennej środowiskowej zastępuje zapisany token po zmianie jego
odcisku. Cofnięcie uprawnień lub zmiana hasła może wymagać ponownej autoryzacji.

Publiczny endpoint czyta gotowy cache, więc odwiedziny nie mnożą zapytań do Meta.
Cache CDN trwa do 5 minut. Otwarta i widoczna sekcja może odświeżyć listę po
godzinie; nigdy w trakcie otwartego odtwarzacza. Nowa rolka pojawi się zwykle do
około godziny i 5 minut po publikacji. Gdy Meta nie odpowiada, ostatnie dane są
dostępne maksymalnie 6 godzin, potem wraca neutralna sekcja z linkiem do profilu.
Nieaktualny adres filmu skutkuje komunikatem i linkiem do oryginalnej rolki.

Kontroluj nieudane uruchomienia `instagram-sync` w Netlify, szczególnie po zmianie
hasła lub uprawnień. Nie zapisuj adresów żądań Meta ani tokenów w logach.

## Zdjęcia

Nowe rozmiary WebP pochodzą z oryginalnych materiałów w `assets/img/`.
Nie dodano stocków ani wygenerowanych obrazów. Oryginały pozostają bez zmian.
Kadry mają wymiary i proporcje zarezerwowane w HTML/CSS, `loading="lazy"`,
`srcset` i `sizes` tam, gdzie dostępne są różne rozdzielczości.

Właściciel dostarczył 27 oryginalnych zdjęć w sąsiednim folderze
`materialy-do-strony`. Wybrano 9 kadrów i przygotowano po 3 rozmiary WebP:
360, 720 i 1200 px szerokości. Razem 27 plików pochodnych zajmuje 2,35 MB;
przeglądarka wybiera odpowiedni rozmiar, a pełny podgląd ładuje po kliknięciu.
Oryginały pozostają bez zmian w folderze źródłowym.

| Oryginał | Zastosowanie / nazwa plików WebP |
| --- | --- |
| `_VM43367.jpg` | Krem z dyni / `jesien-krem-dyniowy-*` |
| `_VM43417.jpg` | Kluski dyniowe / `jesien-kluski-dyniowe-*` |
| `_VM43464.jpg` | Pierogi z dynią i soczewicą / `jesien-pierogi-dyniowe-*` |
| `_VM43477.jpg` | Kurczak / `jesien-kurczak-*` |
| `_VM43379.jpg` | Niewyświetlany obecnie kadr / `wnetrze-przy-oknie-*` |
| `_VM43392.jpg` | Detal okna / `wnetrze-witraz-*` |
| `_VM43397.jpg` | Oświetlenie / `wnetrze-lampy-*` |
| `_VM43385.jpg` | Wnętrze między sekcjami i w galerii / `wnetrze-drewno-*` |
| `_VM43371.jpg` | Drewniane drzwi w galerii / `wnetrze-drzwi-*` |

Na początku menu jest blok `#dania-sezonowe` z czterema daniami, opisami i cenami:
krem 27 zł, kluski 52 zł, pierogi 45 zł, kurczak 62 zł. Nazwy wykorzystują
istniejące tłumaczenia karty; nowe krótkie opisy dań mają PL/EN/DE/CS.
`data-menu-price` synchronizuje ceny z właściwymi wierszami pełnej karty.
Przy zmianie cen aktualizuj też tekst HTML kafelków dla widoku bez JavaScript.
Golonka i żeberka pozostają wyróżnione dużymi zdjęciami pod pełną kartą.
Na telefonie nie ma napisu „Powiększ zdjęcie”; zdjęcia otwiera się dotknięciem.

Między sekcjami dominuje szeroki widok sali i stołów (`wnetrze-desktop.webp`),
obok znajduje się drugi kadr wnętrza. Zbliżenia okna i lamp pozostają w galerii.
Zdjęcia wnętrza nie mają widocznych podpisów, również w powiększeniu.
Podpisy zdjęć jedzenia i opisy dań pozostają widoczne.
Teksty alternatywne wnętrz są neutralne, a zdjęcia dań korzystają z nazw z karty.

Nadal przydatne byłyby zdjęcia podawania dań, nalewania piwa i większy oryginał
zdjęcia żeberek (obecnie 600 × 600 px).

## Weryfikacja lokalna

Testy przeglądarki obejmują desktop 1440 px i telefon 390 px, 10 kategorii menu,
4 języki, brak poziomego przepełnienia, obrazy, powiększenie, strzałki, Escape,
przywrócenie fokusu, odmowę/cofnięcie zgody i fallback bez skonfigurowanego konta.
Na jawnych danych testowych sprawdzono cztery kafelki, przewijany tor mobilny,
brak pobrania wideo przed kliknięciem, jeden odtwarzacz i błąd pliku wideo.
To nie zastępuje testu połączenia z prawdziwym kontem i produkcyjnego harmonogramu.

Po dodaniu sezonowej sekcji i ukryciu Instagrama ponownie sprawdzono szerokości
320–1920 px, zgodność czterech cen, 10 kategorii, cztery języki, nowe zdjęcia,
powiększanie, strzałki, Escape i ograniczenie ruchu. Brak błędów konsoli i brak
nieudanych pobrań zasobów. Instagram nie wykonuje żądań również z zapisaną zgodą.

Podgląd bez funkcji: `python -m http.server 8777 --bind 127.0.0.1` w katalogu repo.
W tym trybie próba pobrania rolek zakończy się bezpiecznym fallbackiem.
Pełny lokalny podgląd funkcji: Netlify Dev po zainstalowaniu Netlify CLI;
nie uruchamiaj lokalnie harmonogramu z produkcyjnym tokenem bez potrzeby.
