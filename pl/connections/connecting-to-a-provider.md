# Łączenie z dostawcą AI

Z tego przewodnika dowiesz się, jak połączyć aplikację Marinara Engine z dostawcą AI, żeby postacie mogły odpowiadać. Utworzysz połączenie, wkleisz klucz API, wybierzesz model i sprawdzisz, czy wszystko działa.

## Czym jest połączenie

Połączenie to zapisana konfiguracja, która mówi aplikacji Marinara Engine, jak dotrzeć do jednej usługi AI. Każde połączenie przechowuje cztery rzeczy: dostawcę, klucz API lub dane logowania, bazowy adres URL (adres internetowy usługi) oraz model.

Klucz API to tajny kod od dostawcy AI, trochę jak hasło. Dzięki niemu Marinara może rozmawiać z usługą AI i korzystać z konta u dostawcy. Marinara szyfruje klucz przed zapisem, a przy eksporcie połączenia nigdy go nie dołącza.

Marinara Engine nie ma gotowego połączenia ani darmowego klucza na start. Świeża instalacja ma zero połączeń. Zanim zaczniesz czat, musisz utworzyć przynajmniej jedno połączenie.

## Otwieranie panelu Connections

Połączeniami zarządzasz w panelu **Connections** (Połączenia) po prawej stronie aplikacji.

Jeśli nie ma jeszcze żadnego połączenia, a próbujesz zacząć czat, Marinara pokazuje okno **Set Up** (konfiguracja). W tym oknie jest przycisk **Open Connections**. Kliknij go, aby od razu przejść do panelu **Connections**.

Na górze panelu widać trzy przyciski. Mają tylko ikony, bez podpisów.

- Przycisk **New** (ikona plusa) otwiera okno **Create Connection** (tworzenie połączenia).
- Przycisk **Import** (ikona strzałki pobierania) wczytuje połączenia z pliku.
- Przycisk **Select** (ikona ptaszka) włącza zaznaczanie zbiorcze, dzięki czemu można wyeksportować lub usunąć kilka połączeń naraz.

## Tworzenie połączenia

Wykonaj kolejno te kroki, aby dodać pierwszego dostawcę.

1. W panelu **Connections** kliknij przycisk **New** (ikona plusa).
2. W oknie **Create Connection** wpisz nazwę połączenia w polu **Name**. Wybierz coś, co później łatwo rozpoznasz, na przykład `GPT-4o Main`.
3. W sekcji **Provider** kliknij przycisk usługi, której chcesz użyć, na przykład **OpenAI**, **Anthropic** albo **OpenRouter**.
4. Kliknij przycisk **Create**. Marinara tworzy połączenie i otwiera dla niego pełny edytor **Connection Editor**.
5. Znajdź pole **API Key**. Wklej tutaj klucz otrzymany od dostawcy. Jeśli klucza jeszcze nie ma, kliknij link **Get your {Provider} API key** pod polem. Ten link otwiera w przeglądarce stronę z kluczami danego dostawcy.
6. Otwórz listę rozwijaną **Model** i wybierz model. Listę da się zawęzić, wpisując tekst w polu **Search models…**. Jeśli lista jest pusta, kliknij przycisk **Fetch Models from API**, aby wczytać modele dostępne dla konta u dostawcy. Marinara zapisuje pobraną listę razem z połączeniem, dzięki czemu menu modeli w polu wpisywania wiadomości może ją później pokazać bez ponownego pobierania.
7. Kliknij przycisk **Save**. Tekst stanu u góry zmienia się na **Saved**.

Później model da się zmienić bez otwierania edytora: użyj panelu Quick Connection Switcher (ikona ogniwa w polu wpisywania wiadomości) albo pola **Model** w sekcji **Chat Settings → Connection**. Zobacz [Pula losowa i panel Quick Connection Switcher](organizing-connections.md#the-random-pool-and-quick-connection-switcher).

Pola **Base URL** zwykle nie trzeba ruszać. Marinara wypełnia je sama dla znanych dostawców. Zmieniaj je tylko przy korzystaniu z serwera proxy albo serwera lokalnego.

Pełną listę obsługiwanych dostawców, ich domyślne ustawienia i miejsca, w których można pobrać poszczególne klucze, znajdziesz w przewodniku [Obsługiwani dostawcy AI](providers-reference.md).

Część dostawców zamiast klucza API używa lokalnego logowania. Dla nich pole **API Key** w ogóle się nie pojawia. Zobacz [Połączenia abonamentowe z Claude, ChatGPT i Grok](subscription-clis.md).

Aby połączyć się z modelem działającym na własnym komputerze, zobacz [Podłączanie modelu lokalnego lub samodzielnie hostowanego](local-self-hosted.md).

## Sprawdzanie połączenia

Na dole edytora **Connection Editor** znajduje się sekcja **Connection Tests** (testy połączenia). Skorzystaj z niej, żeby przed czatem potwierdzić, że konfiguracja działa.

1. Kliknij przycisk **Test Connection**. Marinara sprawdza wtedy klucz API u dostawcy. Po udanej próbie pojawia się zielona linia **Connection Test: Success** z czasem odpowiedzi.
2. Kliknij przycisk **Send Test Message**. Marinara wysyła słowo "hi" do wybranego modelu i pokazuje odpowiedź. Po udanej próbie pojawia się zielona linia **Test Message: Success**, a pod nią odpowiedź modelu.

Przycisk **Send Test Message** pozostaje nieaktywny, dopóki nie wybierzesz modelu. Kiedy test się nie powiedzie, linia robi się czerwona i pokazuje błąd. Ten komunikat zwykle podpowiada, co poprawić – na przykład zły klucz albo nieznany model.

## Wybór połączenia dla czatu

Samo połączenie nic nie robi. To każdy czat wskazuje, którego połączenia użyć.

1. Otwórz czat, a potem jego **Chat Settings** (ustawienia czatu).
2. Znajdź sekcję **Connection**.
3. Wybierz swoje połączenie z listy rozwijanej.

Lista rozwijana ma też dwie specjalne opcje. **None** oznacza, że nie wybrano jeszcze żadnego połączenia. **🎲 Random** (ikona kości przed słowem Random) losuje za każdym razem inne połączenie z puli losowej. W trybie Game Mode sekcja nadal nazywa się **Connection**, ale lista rozwijana w środku ma etykietę **GM / Party Model**.

Przy tworzeniu zupełnie nowego czatu okno **Set Up** najpierw prosi o wybór połączenia. Wskaż jedno, a potem kliknij przycisk **Create Chat**.

## Częste błędy

Jeśli test albo wiadomość się nie uda, sprawdź najpierw te rzeczy:

- Zły lub wygasły klucz w polu **API Key**. Otwórz połączenie, wklej klucz jeszcze raz i kliknij przycisk **Save**.
- Brak wybranego modelu. Przycisk **Send Test Message** pozostaje nieaktywny, dopóki nie wybierzesz modelu w polu **Model**.
- Klucz od niewłaściwego dostawcy. Każdy dostawca wymaga własnego klucza. Zmiana wyboru w sekcji **Provider** celowo czyści pole **API Key**.
- Zablokowany lub nieosiągalny adres w polu **Base URL**. Zostaw je puste, żeby korzystać z domyślnego adresu dostawcy – chyba że masz serwer lokalny albo proxy.

Więcej sposobów na naprawę błędów połączenia i generowania znajdziesz w przewodniku [Rozwiązywanie problemów w aplikacji Marinara Engine](../TROUBLESHOOTING.md).

## Powiązane przewodniki

- [Obsługiwani dostawcy AI](providers-reference.md)
- [Połączenia abonamentowe z Claude, ChatGPT i Grok](subscription-clis.md)
- [Podłączanie modelu lokalnego lub samodzielnie hostowanego](local-self-hosted.md)
- [Rozwiązywanie problemów w aplikacji Marinara Engine](../TROUBLESHOOTING.md)
