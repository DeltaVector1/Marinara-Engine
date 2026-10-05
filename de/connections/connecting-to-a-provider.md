# Verbindung zu einem KI-Anbieter herstellen

In dieser Anleitung erfährst du, wie du Marinara Engine mit einem KI-Anbieter verbindest, damit die Charaktere antworten können. Du legst eine Verbindung an, fügst einen API-Key ein, wählst ein Modell und prüfst, ob alles läuft.

## Was eine Verbindung ist

Eine Verbindung ist ein gespeichertes Setup. Es sagt Marinara Engine, wie ein bestimmter KI-Dienst zu erreichen ist. Jede Verbindung merkt sich vier Dinge: den Anbieter, den API-Key oder Login, die Base URL (die Webadresse des Dienstes) und das Modell.

Ein API-Key ist ein geheimer Zugangscode vom KI-Anbieter, ähnlich einem Passwort. Damit darf Marinara mit dem KI-Dienst sprechen und dein Konto dort nutzen. Marinara speichert den Key verschlüsselt, und beim Export einer Verbindung ist er nie dabei.

Marinara Engine bringt weder eine fertige Verbindung noch einen kostenlosen Einsteiger-Key mit. Nach einer Neuinstallation ist die Liste komplett leer. Mindestens eine Verbindung muss also stehen, bevor ein Chat starten kann.

## Das Connections-Panel öffnen

Verbindungen verwaltest du im Panel **Connections** (Verbindungen) am rechten Rand der App.

Hast du noch keine Verbindung und willst trotzdem einen Chat starten, zeigt Marinara das Dialogfenster **Set Up** (Einrichten). Darin sitzt die Schaltfläche **Open Connections**. Ein Klick darauf führt direkt zum **Connections**-Panel.

Oben im Panel stehen drei Schaltflächen. Sie zeigen nur Symbole, ganz ohne Beschriftung.

- **New** (ein Plus-Symbol) öffnet das Fenster **Create Connection** (Verbindung anlegen).
- **Import** (ein Pfeil nach unten) lädt Verbindungen aus einer Datei.
- **Select** (ein Häkchen) schaltet die Mehrfachauswahl ein, damit sich mehrere Verbindungen auf einmal exportieren oder löschen lassen.

## Eine Verbindung anlegen

So fügst du den ersten Anbieter hinzu:

1. Klick im **Connections**-Panel auf die Schaltfläche **New** (das Plus-Symbol).
2. Gib im Fenster **Create Connection** unter **Name** einen Namen für die Verbindung ein. Wähle etwas, das du später wiedererkennst, zum Beispiel `GPT-4o Main`.
3. Klick unter **Provider** auf die Schaltfläche für den gewünschten Anbieter, etwa **OpenAI**, **Anthropic** oder **OpenRouter**.
4. Klick auf **Create**. Marinara legt die Verbindung an und öffnet dafür den vollständigen **Connection Editor** (Verbindungs-Editor).
5. Such das Feld **API Key**. Füge hier den Key vom Anbieter ein. Fehlt dir noch einer, klick auf den Link **Get your {Provider} API key** unter dem Feld. Er öffnet die Key-Seite des Anbieters im Browser.
6. Öffne das Dropdown-Menü **Model** und wähle ein Modell. Über das Feld **Search models…** (Modelle suchen) lässt sich die Liste filtern. Ist die Liste leer, klick auf **Fetch Models from API**, um die Modelle zu laden, die dein Konto nutzen darf. Marinara speichert die abgerufene Liste in der Verbindung, sodass das Modellmenü im Eingabebereich des Chats sie später ohne erneuten Abruf anzeigen kann.
7. Klick auf **Save**. Der Statustext oben wechselt auf **Saved**.

Später kannst du das Modell auch wechseln, ohne den Editor zu öffnen: über den Quick Connection Switcher (das Link-Symbol im Eingabebereich des Chats) oder über das Feld **Model** unter **Chat Settings → Connection** (Chat-Einstellungen → Verbindung). Siehe [Zufallspool und Quick Connection Switcher](organizing-connections.md#the-random-pool-and-quick-connection-switcher).

Das Feld **Base URL** brauchst du normalerweise nicht anzufassen. Bei bekannten Anbietern trägt Marinara es selbst ein. Ändere es nur, wenn ein Proxy oder ein lokaler Server im Spiel ist.

Eine Liste aller unterstützten Anbieter, ihrer Standardeinstellungen und der jeweiligen Bezugsquelle für den Key findest du unter [Unterstützte KI-Anbieter](providers-reference.md).

Manche Anbieter setzen statt eines API-Keys auf einen lokalen Login. Dort fehlt das Feld **API Key**. Siehe [Abo-Verbindungen für Claude, ChatGPT und Grok](subscription-clis.md).

Wie du ein Modell auf dem eigenen Rechner verbindest, steht unter [Ein lokales oder selbst gehostetes Modell verbinden](local-self-hosted.md).

## Die Verbindung testen

Ganz unten im **Connection Editor** liegt die Karte **Connection Tests** (Verbindungstests). Damit prüfst du vor dem ersten Chat, ob das Setup wirklich funktioniert.

1. Klick auf **Test Connection**. Marinara prüft den API-Key beim Anbieter. Klappt es, erscheint grün die Zeile **Connection Test: Success** samt Antwortzeit.
2. Klick auf **Send Test Message**. Marinara schickt das Wort „hi“ an das gewählte Modell und zeigt die Antwort. Klappt es, erscheint grün die Zeile **Test Message: Success**, darunter die Antwort des Modells.

Die Schaltfläche **Send Test Message** bleibt deaktiviert, solange kein Modell gewählt ist. Schlägt ein Test fehl, färbt sich die Zeile rot und zeigt den Fehler an. Meist steht dort schon, was zu korrigieren ist – etwa ein falscher Key oder ein unbekanntes Modell.

## Eine Verbindung für einen Chat auswählen

Allein bewirkt eine Verbindung nichts. Jeder Chat wählt selbst, welche Verbindung er nutzt.

1. Öffne einen Chat und darin die **Chat Settings** (Chat-Einstellungen).
2. Such den Abschnitt **Connection**.
3. Wähle im Dropdown-Menü die gewünschte Verbindung.

Im Dropdown-Menü stehen außerdem zwei Sonderoptionen. **None** heißt, dass noch keine Verbindung gewählt ist. **🎲 Random** (ein Würfelsymbol vor dem Wort Random) greift jedes Mal auf eine andere Verbindung aus deinem Zufallspool zu. Im Game Mode heißt der Abschnitt weiterhin **Connection**, das Dropdown-Menü darin trägt aber die Beschriftung **GM / Party Model**.

Legst du einen ganz neuen Chat an, verlangt das Dialogfenster **Set Up** zuerst eine Verbindung. Wähle eine aus und klick dann auf **Create Chat**.

## Häufige Fehler

Schlägt ein Test oder eine Nachricht fehl, prüf zuerst diese Punkte:

- Ein falscher oder abgelaufener **API Key**. Öffne die Verbindung, füge den Key erneut ein und klick auf **Save**.
- Kein Modell gewählt. **Send Test Message** bleibt deaktiviert, bis unter **Model** eine Auswahl steht.
- Ein Key vom falschen Anbieter. Jeder Anbieter braucht seinen eigenen Key. Ein Wechsel bei **Provider** leert das Feld **API Key** absichtlich.
- Eine blockierte oder nicht erreichbare **Base URL**. Lass sie leer, damit der Standard des Anbieters greift – außer du betreibst einen lokalen Server oder einen Proxy.

Weitere Lösungen für Verbindungs- und Generierungsfehler stehen unter [Fehlerbehebung in Marinara Engine](../TROUBLESHOOTING.md).

## Verwandte Anleitungen

- [Unterstützte KI-Anbieter](providers-reference.md)
- [Abo-Verbindungen für Claude, ChatGPT und Grok](subscription-clis.md)
- [Ein lokales oder selbst gehostetes Modell verbinden](local-self-hosted.md)
- [Fehlerbehebung in Marinara Engine](../TROUBLESHOOTING.md)
