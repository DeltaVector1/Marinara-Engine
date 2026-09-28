# Panel **Chat Settings** – przegląd

Z tego przewodnika dowiesz się, do czego służy panel **Chat Settings** (ustawienia czatu), czyli miejsce, w którym dostraja się pojedynczy czat. Opisuje on podstawy ustawiane właśnie tutaj: nazwę czatu, połączenie i zapisane zestawy ustawień. Na koniec kieruje do osobnych przewodników po wszystkim, co jeszcze mieści ten panel.

Każde ustawienie z tego panelu dotyczy wyłącznie bieżącego czatu. Zmiana nie rusza pozostałych czatów.

## Otwieranie panelu **Chat Settings**

Panel otwiera się z wnętrza otwartego czatu.

1. Otwórz dowolny czat.
2. Kliknij przycisk z zębatką na pasku narzędzi czatu (podpowiedź brzmi **Chat Settings**).
3. Panel **Chat Settings** wysuwa się na ekran.

Powinien pojawić się panel o tytule **Chat Settings** z ikoną zębatki. Przy tworzeniu zupełnie nowego czatu panel otwiera się sam, żeby od razu dało się wszystko ustawić.

## Sekcja **Chat Name**

Sekcja **Chat Name** (nazwa czatu) trzyma nazwę widoczną na liście czatów. Tę nazwę widzisz tylko ty. Marinara nie wysyła jej do AI i nie wpływa ona w żaden sposób na przebieg czatu.

1. W sekcji **Chat Name** kliknij bieżącą nazwę.
2. Nazwa zamienia się w pole tekstowe.
3. Wpisz nową nazwę.
4. Naciśnij Enter albo kliknij przycisk z ptaszkiem, aby zatwierdzić.

## Sekcja **Connection**

Sekcja **Connection** (połączenie) decyduje o tym, który dostawca AI i model odpowiada w tym czacie. Połączenie to zapisany skrót do dostawcy AI, razem z kluczem API i wybranym modelem. Klucz API to tajny kod, trochę jak hasło, dzięki któremu Marinara Engine korzysta z twojego konta u danego dostawcy.

Wybierz zapisane połączenie z listy rozwijanej. Inna opcja to **Random**: za każdym razem losuje inne połączenie spośród tych oznaczonych do puli losowania.

O tym, jak w ogóle utworzyć połączenie, przeczytasz w przewodniku [Łączenie z dostawcą AI](../connections/connecting-to-a-provider.md).

## Profile ustawień

Na górze panelu znajduje się kontrolka **Profile**. Profil ustawień to zapisany zestaw ustawień czatu, który da się wykorzystać ponownie w innych czatach. Wybierz profil z listy rozwijanej, aby zastosować go do bieżącego czatu.

Profil zbiera połączenie, preset promptu, agentów, narzędzia, tłumaczenie, przywoływanie pamięci, parametry zaawansowane i inne ustawienia tego czatu. Nigdy nie rusza postaci, persony, lorebooków, sprite'ów, podsumowania, tagów ani promptu sceny. To wszystko zostaje przypisane do samego czatu.

Na pasku jest rząd małych przycisków z ikonami, bez podpisów. Po najechaniu kursorem każdy przycisk pokazuje swoją nazwę w podpowiedzi:

- Ikona dyskietki (**Save current chat settings into this profile**) zapisuje ustawienia bieżącego czatu w wybranym profilu.
- Ikona ołówka (**Rename profile**) zmienia nazwę wybranego profilu.
- Ikona pliku z plusem (**Save current chat settings as a new profile**) zapisuje ustawienia bieżącego czatu jako nowy profil.
- Ikona strzałki w dół (**Import settings profile (.json)**) wczytuje profil z pliku `.json`.
- Ikona strzałki w górę (**Export settings profile (.json)**) zapisuje wybrany profil do pliku `.json`.
- Ikona kosza (**Delete profile**) usuwa wybrany profil.

Obok listy rozwijanej stoi przycisk z gwiazdką. Kliknij go, aby profil stał się domyślny dla nowych czatów w tym trybie. Przy każdym nowym czacie w tym trybie Marinara sama zastosuje oznaczony gwiazdką profil. Domyślny może być tylko jeden profil na tryb.

Każdy tryb obsługujący tę funkcję ma wbudowany profil **Default**. Profilu **Default** nie da się przemianować, usunąć ani nadpisać zapisem. Jego zastosowanie przywraca ustawieniom sterowanym przez profil wartości domyślne aplikacji.

W trybie Game Mode kontrolki profili się nie pojawiają.

Słowo **preset** jest w aplikacji Marinara Engine zarezerwowane dla presetów promptu. Preset promptu kształtuje strukturę promptu systemowego i parametry generowania, a profil ustawień zbiera wymienioną wyżej konfigurację czatu do ponownego użytku. Pełne zasady opisuje przewodnik [Profile ustawień](settings-profiles.md).

## Zmienne czatu

Sekcja **Chat Variables** (zmienne czatu) pozwala nadać nazwę fragmentowi tekstu i używać go ponownie, wpisując tę nazwę w podwójnych klamrach. Dodaj zmienną `char1` o wartości `Mary`, a potem wpisz w wiadomości `{{char1}} walks in.`. AI przeczyta "Mary walks in."

Każdy wiersz ma **name** (nazwę) i **value** (wartość). Nazwy mogą zawierać litery, cyfry i podkreślenia, a muszą zaczynać się od litery lub podkreślenia. Nazwy mające dokładnie 21 znaków są zarezerwowane dla odwołań do postaci. Nazwa wbudowanego makra, na przykład `char` lub `user`, zostanie odrzucona, ponieważ wbudowane makro zawsze ma pierwszeństwo. Naciśnij Enter lub kliknij poza polem, aby zapisać zmianę. Przycisk kosza usuwa zmienną.

Pamiętaj o trzech rzeczach.

- Twoja wiadomość nadal pokazuje wpisany znacznik. Tylko AI widzi jego wartość. Oznacza to również, że późniejsza zmiana wartości zmienia każdy wcześniejszy fragment rozmowy, który używał tego znacznika.
- Zmienne należą wyłącznie do tego czatu. Inny czat ma własną listę, a Twoja pozostaje po ponownym uruchomieniu aplikacji.
- To ten sam magazyn, którego używa `{{setvar}}`. Wartość ustawiona przez sekcję promptu lub wpis lorebooka pojawia się tutaj jako edytowalny wiersz. Taki wpis nadpisze wpisaną przez Ciebie wartość, jeśli użyje tej samej nazwy.

Pozostałe możliwości podwójnych klamer opisuje przewodnik [Makra promptu](../prompts/macros.md).

## Pozostałe sekcje panelu

Panel **Chat Settings** jest też domem wielu funkcji działających osobno w każdym czacie. Każda ma własny przewodnik:

- Sekcja **Persona** decyduje o tym, kogo odgrywasz w tym czacie. Persona (postać, w którą się wcielasz) pojawia się w czatach Conversation i Roleplay. Zobacz [Wybór persony w czacie](../characters/choosing-your-persona.md).
- Sekcja **Characters** zarządza postaciami w czatach Conversation i Roleplay. O czatach z dwiema postaciami lub większą ich liczbą przeczytasz w przewodniku [Czaty grupowe w trybach Conversation i Roleplay](group-chats.md).
- Sekcja **Party** pojawia się tylko w czatach Game. Zastępuje sekcje **Persona** i **Characters**, łącząc obie w jednym miejscu.
- Sekcja **Lorebooks** podpina do czatu informacje o świecie. Zobacz [Lorebooki – przegląd](../lorebooks/overview.md).
- Sekcja **Agents** włącza w tym czacie pomocników AI. Zobacz [Agenci: pomocnicy AI w czatach](../agents/agents-overview.md).
- Sekcja **Translation** konfiguruje automatyczne tłumaczenie wiadomości. Zobacz [Tłumaczenie wiadomości](../integrations/message-translation.md).
- Sekcja **Advanced Parameters** nadpisuje w tym czacie ustawienia generowania, takie jak temperatura i maksymalna liczba tokenów. Zobacz [Parametry generowania](../prompts/generation-parameters.md).

To, które sekcje widać, zależy od trybu czatu. Część z nich pojawia się tylko w czatach Roleplay, Conversation albo Game.

## Powiązane przewodniki

- [Zarządzanie listą czatów](managing-chats.md)
- [Wybór persony w czacie](../characters/choosing-your-persona.md)
- [Lorebooki – przegląd](../lorebooks/overview.md)
- [Agenci: pomocnicy AI w czatach](../agents/agents-overview.md)
- [Profile ustawień](settings-profiles.md)
- [Parametry generowania](../prompts/generation-parameters.md)
