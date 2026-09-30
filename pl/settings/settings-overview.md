# Przegląd ustawień

Ten przewodnik opisuje panel **Settings** (Ustawienia) aplikacji Marinara Engine: jego sześć zakładek i to, za co każda z nich odpowiada. Znajdziesz tu dokładny opis zakładki **General**, zasad **Text Rules**, które formatują tekst czatu, oraz tego, jak ustawienia synchronizują się między urządzeniami.

## Panel Settings i jego sześć zakładek

Otwórz panel **Settings** ikoną koła zębatego na górnym pasku. Na samej górze panelu jest pole **Search settings** (wyszukiwanie ustawień). Wpisz dowolne słowo (na przykład `delete`, `streaming` albo `quotes`), a Marinara od razu przeniesie widok do pasującej sekcji.

Panel ma sześć zakładek. Poniższa tabela pokazuje, za co odpowiada każda z nich.

| Zakładka | Co się tu ustawia |
| --- | --- |
| **General** | Zachowanie aplikacji, powiadomienia, odpowiedzi, wprowadzanie tekstu, zasady tekstu i odtwarzanie gry. |
| **Appearance** | Motyw, kolory, czcionki, układ czatu, animacje i tła. |
| **Generations** | Domyślne ustawienia obrazów i wideo oraz gotowe szablony promptów. |
| **Addons** | Szkice Personal Extension asystentki Professor Mari w piaskownicy, opcjonalnie odblokowane External Extensions oraz własne motywy. |
| **Imports** | Przywracanie pełnych profili i import z innych aplikacji. |
| **Advanced** | Dostęp administracyjny, przełączniki opcjonalnych funkcji, aktualizacje, narzędzia wiadomości, kopie zapasowe i nieodwracalne resety. |

Tutaj przeczytasz więcej o każdej zakładce:

- **General**: opisana na tej stronie (zobacz sekcje poniżej).
- **Appearance**: zobacz [Ustawienia wyglądu](../appearance/appearance-settings.md).
- **Generations**: zobacz [Profile stylu obrazów](../media/style-profiles.md) i [Generowanie wideo sceny](../media/scene-video.md).
- **Addons**: zobacz [Rozszerzenia osobiste](../extending/personal-extensions.md) i [Własne motywy CSS](../appearance/custom-css-themes.md).
- **Imports**: zobacz [Importowanie z SillyTavern](../data/importing-from-sillytavern.md) i [Kopia zapasowa i przywracanie](../data/backup-and-restore.md).
- **Advanced**: zobacz sekcję **Message Tools** poniżej, a także [Aktualizacja aplikacji Marinara Engine](../UPGRADING.md), [Dostęp zdalny](../REMOTE_ACCESS.md) i [Czyszczenie i resetowanie danych](../data/clearing-data.md). [Przełączniki funkcji](../configuration/features.md).

## Ustawienia, zakładka General

Zakładka **General** zawiera sześć sekcji. Ta strona w całości opisuje dwie z nich: **App Behavior** (zachowanie aplikacji) i **Text Rules** (zasady tekstu). Pozostałe są tu streszczone, a dokładnie opisują je osobne przewodniki.

- **App Behavior**: język, zabezpieczenie przed usunięciem oraz przełączniki pokazywania i ukrywania elementów. Opis poniżej.
- **Notifications**: dźwięki powiadomień oraz osobne ustawienia dla przeglądarki i aplikacji na system Android. Wgraj własny dźwięk w polu **Custom sound** (własny dźwięk) w formacie MP3, WAV, OGG, M4A/MP4 lub WebM (do 10 MB), a zastąpi on wbudowany sygnał aplikacji Marinara Engine na wszystkich urządzeniach połączonych z tym serwerem. Da się go odsłuchać, podmienić albo usunąć w każdej chwili. Jeśli własnego pliku nie da się odczytać, wraca wbudowany sygnał, a sam plik trafia do kopii zapasowych i eksportów profilu. Ustawienie **Background Notifications** dotyczy autonomicznych wiadomości w trybie Conversation, a **Generation Completion Notifications** – odpowiedzi uruchamianych ręcznie w trybach Conversation, Roleplay i Game. Oba działają, kiedy aplikacja Marinara Engine jest otwarta, ale nieaktywna, i nie pokazują treści wiadomości.
- **Responses**: sposób streamingu, zapisywania i stronicowania odpowiedzi. Zobacz [Wysyłanie wiadomości i streaming](../chats/sending-and-streaming.md).
- **Input & Editing**: pole wpisywania wiadomości i szybka edycja. Zobacz [Działania na wiadomości: edycja, usuwanie, swipe'y, ponowne generowanie](../chats/messages.md).
- **Text Rules**: formatowanie tekstu czatu. Opis poniżej.
- **Game Playback**: czytanie i nawigacja w trybie Game Mode.

## App Behavior

Ta sekcja znajduje się w **Settings** > **General** > **App Behavior**. Steruje codziennym zachowaniem aplikacji i kilkoma przełącznikami pokazywania elementów.

- **Language**: wybór języka interfejsu aplikacji. Marinara Engine ma obecnie arabski, chiński uproszczony, angielski,
  francuski, niemiecki, hindi, japoński, koreański, polski, portugalski brazylijski, rosyjski i hiszpański. Arabski
  korzysta z układu od prawej do lewej. Nieprzetłumaczone jeszcze fragmenty interfejsu wyświetlają się po angielsku.
  To ustawienie zmienia kontrolki i podpowiedzi aplikacji, a nie prompty modelu ani treść czatu. Jeśli chcesz poprawić
  tłumaczenie albo dodać kolejny język, zobacz [Lokalizacja interfejsu](../development/localization.md).
- **Documentation Language**: wybór języka wbudowanych przewodników aplikacji Marinara Engine, niezależnie od języka interfejsu powyżej. Angielski jest wbudowany i nigdy się nie pobiera. Po wybraniu innego języka pojawia się przycisk **Download & Replace** (pobranie i podmiana), który jednorazowo pobiera dany pakiet językowy i usuwa poprzedni, więc zawsze pozostaje tylko jeden pobrany język. Nieprzetłumaczone przewodniki otwierają się po angielsku z małą plakietką `EN`, a wyszukiwarka dokumentacji działa w aktywnym języku. Wybór przetrwa aktualizacje, a pakiet odświeża się sam po aktualizacji, jeśli tłumaczenia się zmieniły. Gdyby pobrane przewodniki zniknęły albo uległy uszkodzeniu, pojawia się przycisk **Fix documentation** (naprawa dokumentacji): pobiera pakiet od nowa, a kiedy nie da się połączyć ze źródłem pobierania, przywraca przewodniki po angielsku.
- **Confirm before deleting**: domyślnie włączone. Marinara pyta wtedy o potwierdzenie, zanim trwale usunie czat, postać albo inny element. Zostaw włączone, żeby uniknąć przypadkowych usunięć.
- **Achievements**: domyślnie włączone. Ekran Home pokazuje wtedy przycisk osiągnięć i komunikaty o odblokowaniu. Po wyłączeniu śledzenie działa po cichu. Zobacz [Osiągnięcia](../home/achievements.md).
- **Music Player**: domyślnie włączone. Widoczny jest wtedy kompaktowy odtwarzacz Music Player. Zobacz [Muzyka](../media/music.md).
- **Mini Mari surprise visits**: domyślnie włączone. Podczas przewijania może się wtedy pojawić rzadka wiadomość od postaci Chibi Professor Mari. Wyłącz, jeśli przeszkadza.

## Text Rules

Ta sekcja znajduje się w **Settings** > **General** > **Text Rules**. Te zasady zmieniają sposób obsługi tekstu czatu. Ustawienia **Bold dialogue in quotes** i **Convert LaTeX symbols** dotyczą wyłącznie wyświetlania, więc nigdy nie zmieniają zapisanych wiadomości. Z **Quote style** jest inaczej: to ustawienie przepisuje same cudzysłowy w tekście, który wpisujesz i zapisujesz.

### Bold dialogue in quotes

Domyślnie włączone. Tekst w cudzysłowie wyświetla się wtedy pogrubioną czcionką. Weźmy taką linijkę:

```
"I missed you," she said.
```

Przy włączonym **Bold dialogue in quotes** słowa `I missed you` są pogrubione. Po wyłączeniu dialog zachowuje swój kolor, ale traci pogrubienie.

### Convert LaTeX symbols

Domyślnie włączone. Niektóre modele zapisują wzory matematyczne poleceniami LaTeX. Po włączeniu popularne polecenia, takie jak `\rightarrow`, `\neq`, `\times` czy `\alpha`, wyświetlają się jako zwykłe symbole. Na przykład `\times` widać jako znak mnożenia `×`, a `\alpha` jako grecką literę `α`. Fragmenty kodu zostają nietknięte.

### Quote style

Decyduje o tym, jak ujednolicane są cudzysłowy. W odróżnieniu od dwóch zasad powyżej zmienia sam tekst: wpisywane i zapisywane wiadomości przechodzą na wybrany styl. Do wyboru są dwie opcje:

- **Straight**: zostawia proste znaki maszynowe, jak `"Hello," it's me.` To ustawienie domyślne.
- **Typographic**: zamienia proste znaki na cudzysłowy drukarskie i apostrofy typograficzne.

## Responses oraz Input & Editing

Te dwie sekcje zakładki **General** decydują o tym, jak pojawiają się odpowiedzi i jak wpisuje się oraz edytuje tekst. Oto ich kontrolki wraz z odnośnikami do pełnych przewodników.

Sekcja **Responses** steruje tym:

- **Enable streaming**: pokazywanie tekstu AI słowo po słowie w trakcie generowania.
- **Streaming speed**: tempo pojawiania się streamowanego tekstu.
- **Trim incomplete model endings**: obcięcie urwanego zdania na końcu przed zapisem.
- **Messages per page**: liczba wiadomości ładowanych naraz.

Więcej przeczytasz w przewodniku [Wysyłanie wiadomości i streaming](../chats/sending-and-streaming.md).

Sekcja **Input & Editing** steruje tym:

- **Send on Enter**: wybór trybów, w których Enter wysyła wiadomość.
- **Speech-to-text microphone**: przycisk mikrofonu w polach wpisywania wiadomości.
- **Intuitive swipe navigation**: przechodzenie między alternatywnymi odpowiedziami klawiszami strzałek albo gestem przesunięcia.
- **Reroll past the newest swipe**: tworzenie nowej odpowiedzi po przejściu za najnowszy swipe.
- **Up Arrow edits last message**: klawisz Up Arrow przy pustym polu otwiera edycję ostatniej wiadomości.
- **Double-click edits messages**: podwójne kliknięcie wiadomości w trybie Roleplay otwiera jej edycję.

Więcej przeczytasz w przewodniku [Działania na wiadomości: edycja, usuwanie, swipe'y, ponowne generowanie](../chats/messages.md).

## Message Tools

Sekcja **Message Tools** (narzędzia wiadomości) znajduje się w **Settings** > **Advanced** > **Message Tools**. To zestaw przełączników wyświetlania i naprawy. Każdy z poniższych przełączników jest domyślnie wyłączony. Tabela pokazuje, co robi każdy z nich i gdzie przeczytasz więcej.

| Przełącznik | Co robi | Pełny przewodnik |
| --- | --- | --- |
| **Show message timestamps** | Pokazuje datę i godzinę przy każdej wiadomości. | [Działania na wiadomości: edycja, usuwanie, swipe'y, ponowne generowanie](../chats/messages.md) |
| **Show model name on messages** | Pokazuje, który model AI napisał daną odpowiedź. | [Działania na wiadomości: edycja, usuwanie, swipe'y, ponowne generowanie](../chats/messages.md) |
| **Show token usage on messages** | Pokazuje liczbę tokenów promptu i odpowiedzi przy każdej wiadomości. | [Działania na wiadomości: edycja, usuwanie, swipe'y, ponowne generowanie](../chats/messages.md) |
| **Show message numbers** | Pokazuje numer przy każdej wiadomości w czacie. | [Działania na wiadomości: edycja, usuwanie, swipe'y, ponowne generowanie](../chats/messages.md) |
| **Guide swipes/regens with chat input** | Traktuje bieżący szkic jako wskazówkę przy generowaniu ponownym. | [Sterowane generowanie i Impersonate](../chats/guided-and-impersonate.md) |
| **Quick replies** | Dodaje dodatkowe akcje szkicu obok przycisku Send. | [Sterowane generowanie i Impersonate](../chats/guided-and-impersonate.md) |
| **Include reasoning in exports** | Dołącza ukryte rozumowanie do eksportów czatu. | [Eksport i import czatów](../chats/export-import.md) |
| **Debug mode** | Zapisuje w konsoli serwera pełne dane wysyłane do modelu, na potrzeby pomocy technicznej. | [Rozwiązywanie problemów](../TROUBLESHOOTING.md) |

Resztę zakładki **Advanced** opisują inne strony. Sekcję **Updates** znajdziesz w przewodniku [Aktualizacja aplikacji Marinara Engine](../UPGRADING.md), sekcję **Admin Access** w [Dostęp zdalny](../REMOTE_ACCESS.md), sekcję **Backup & Export** w [Kopia zapasowa i przywracanie](../data/backup-and-restore.md), a sekcję **Danger Zone** w [Czyszczenie i resetowanie danych](../data/clearing-data.md).

## Jak ustawienia synchronizują się między urządzeniami

Marinara przechowuje większość ustawień na serwerze, więc wędrują one za tobą między przeglądarkami i urządzeniami. Tak właśnie działa synchronizacja ustawień.

Wygląda to tak:

1. Zmieniasz dowolne ustawienie w panelu **Settings**.
2. Mniej więcej sekundę później Marinara zapisuje zmianę na serwerze razem ze znacznikiem czasu.
3. Kiedy inna przeglądarka łączy się z tym samym serwerem Marinara Engine, wczytuje zapisane ustawienia.

Każde urządzenie zachowuje nowszą kopię. Wygrywa więc zapis o późniejszym znaczniku czasu. Uważaj na jeden skutek tej zasady. Po otwarciu aplikacji Marinara Engine na drugim urządzeniu jego kopia może po cichu nadpisać ustawienie właśnie zmienione na pierwszym urządzeniu. Daj aplikacji chwilę na synchronizację, zanim przesiądziesz się na inne urządzenie.

Dwa ustawienia nigdy się nie synchronizują. Zostają w przeglądarce na tym urządzeniu, na którym je ustawiono:

- **Display Size** (rozmiar tekstu interfejsu)
- **Chat Font Size** (rozmiar tekstu czatu)

Oba są w **Settings** > **Appearance** > **Text & Scale**. Ustaw je osobno na każdym używanym urządzeniu. Zobacz [Ustawienia wyglądu](../appearance/appearance-settings.md).

Jeśli serwer jest nieosiągalny, aplikacja pracuje dalej na lokalnych ustawieniach i ponawia próbę przy kolejnej zmianie.

## Powiązane przewodniki

- [Ustawienia wyglądu](../appearance/appearance-settings.md)
- [Działania na wiadomości: edycja, usuwanie, swipe'y, ponowne generowanie](../chats/messages.md)
- [Wysyłanie wiadomości i streaming](../chats/sending-and-streaming.md)
- [Eksport i import czatów](../chats/export-import.md)
- [Gdzie Marinara przechowuje dane](../data/where-data-is-stored.md)
- [Aktualizacja aplikacji Marinara Engine](../UPGRADING.md)
- [Rozwiązywanie problemów](../TROUBLESHOOTING.md)
- [Osiągnięcia](../home/achievements.md)
- [Rozszerzenia osobiste](../extending/personal-extensions.md)
- [Lokalizacja interfejsu](../development/localization.md)
