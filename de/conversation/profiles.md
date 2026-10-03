# Conversation-Mode-Profile (Display Name, About Me, Behavior)

In dieser Anleitung geht es um das kleine Profil, das jeder Charakter und jede Persona im Conversation Mode bekommt. Ein Profil besteht aus drei Teilen: einem Anzeigenamen, einer Kurzbiografie („about me“) und einer Verhaltensanweisung. Die Felder funktionieren wie ein Profil in einer Chat-App – denk an Discord. Sie greifen ausschließlich im Conversation Mode und werden in Roleplay oder Game Mode nie verwendet.

Der Conversation Mode ist der Chat im Stil einer DM (Direktnachricht) oder eines Messengers. Falls er neu für dich ist, lies zuerst [Conversation Mode: Erste Schritte](getting-started.md). Eine Persona ist das Profil, das im Chat für dich selbst steht (also für `{{user}}`).

## Wo diese Felder zu finden sind

Sämtliche Profilfelder sitzen auf einem Tab namens **Convo**. Charaktere und Personas haben ihn gleichermaßen.

1. Um das Profil eines Charakters zu bearbeiten, öffne den Charakter im **Character Editor** (Charakter-Editor) und klick auf den Tab **Convo**.
2. Um das Profil deiner Persona zu bearbeiten, öffne die Persona im **Persona Editor** (Persona-Editor) und klick auf den Tab **Convo**.

Der Tab **Convo** enthält drei Felder: **Convo Display Name** (Anzeigename), **About Me** (Über mich) und **Convo Behavior** (Verhalten). Für Charaktere und Personas gelten sie identisch, bis auf einen kleinen Unterschied weiter unten.

## Convo Display Name

**Convo Display Name** ist der Name, unter dem dieser Charakter beziehungsweise diese Persona in Conversation-Mode-Chats erscheint. Bleibt das Feld leer, gilt der Name der Karte. Eine Änderung greift sofort auch für bereits vorhandene Nachrichten. Betroffen ist nur der Conversation Mode.

Charaktere – nicht Personas – haben zusätzlich ein Kontrollkästchen: **Declare this name on the card in the prompt** (diesen Namen im Prompt auf der Karte nennen). Ist es aktiv, ergänzt Marinara eine kurze Zeile im Kartentext des Charakters. Diese Zeile sagt dem Modell, welche Karte unter welchem Anzeigenamen läuft. Voraussetzung ist ein gesetzter Anzeigename.

Das Makro `{{convo_display}}` setzt den Anzeigenamen des antwortenden Charakters in einen eigenen Prompt ein. Ein Makro ist ein Platzhalter wie `{{convo_display}}`, den Marinara durch echten Text ersetzt. Außerhalb des Conversation Mode löst es sich zu nichts auf. Siehe [Makros](../prompts/macros.md).

## About Me

**About Me** ist eine kurze, selbst geschriebene Kurzbiografie des Charakters oder der Persona und erscheint im Conversation Mode. Ein, zwei Zeilen reichen – genauso gut tun es ein einzelnes Emoji, ein Witz oder gar nichts. In der Werkzeugleiste des Textfelds sitzt eine Emoji-Schaltfläche, über die ein Emoji direkt in der Biografie landet.

Die Biografie ist mehr als Zierde. Standardmäßig hängt Marinara das **About Me** aller anwesenden Charaktere und Personas bei jedem Zug an den Prompt an. Die Biografien landen dort als kurze Liste von Teilnehmerprofilen. So weiß das Modell jederzeit, wie sich die Beteiligten selbst darstellen. Dafür musst du nichts weiter tun.

### Ein About Me von Professor Mari schreiben lassen

Die Biografie muss nicht von dir stammen. Öffne Professor Mari über den Home-Bildschirm und bitte sie, das **About Me** für einen genannten Charakter oder eine genannte Persona zu schreiben oder zu überarbeiten. Sie liest zuerst das gespeicherte Profil, verfasst eine kurze Biografie in der Stimme dieser Person und speichert sie direkt im echten Feld **About Me**.

Bitte sie zum Beispiel: `Write Luna's About Me as a cryptic one-line bio.` Ebenso möglich ist eine Überarbeitung – etwa eine bestehende Biografie witziger, kürzer, wärmer oder kartentreuer machen zu lassen.

Professor Mari nutzt dabei ihr normal konfiguriertes Modell. Eine eigene About-Me-Verbindung, eine Quellenauswahl oder eine Generieren-Schaltfläche gibt es in den Charakter- und Persona-Editoren nicht. Ihre gespeicherte Änderung erscheint im gewohnten Prüfablauf, wo du sie behalten oder zurücknehmen kannst. Bei manuellen Änderungen im Editor gibt es weiterhin **Revert** (zurücksetzen) – damit kehrt der Text zum Stand vor der aktuellen Bearbeitung zurück.

## Convo Behavior

**Convo Behavior** ist eine frei formulierte Anweisung dazu, wie sich der Charakter oder die Persona im Conversation Mode verhalten soll. Zum Beispiel: kurze Antworten in Kleinschreibung, und schreiben wie ein echter Mensch statt wie ein Erzähler. In Roleplay oder Game Mode wird sie nie mitgeschickt.

### Insertion (wohin die Anweisung kommt)

Unter dem Feld **Convo Behavior** sitzt ein Dropdown-Menü namens **Insertion** (Einfügung). Es steuert, an welcher Stelle des Prompts die Anweisung landet. Zur Wahl stehen:

- Die Option **Constant** mit dem Zusatz „after the card“ (Standard): immer dabei, direkt hinter dem Kartentext.
- Die Option **Constant** mit dem Zusatz „before the card“: immer dabei, direkt vor dem Kartentext.
- **Append to post-history**: kommt ans Ende der Post-History-Anweisungen.
- **Prepend to post-history**: kommt an den Anfang der Post-History-Anweisungen.
- **Replace post-history**: ersetzt die Post-History-Anweisungen.
- **Only where `{{convo_behavior}}` is placed**: kommt nur dorthin, wo du das Makro `{{convo_behavior}}` in einem eigenen Prompt platziert hast.

Post-History-Anweisungen sind Prompt-Text, den die App hinter dem jüngsten Chatverlauf einsetzt. Schreibst du keine eigenen Prompts, bleib beim Standard.

## Chat-spezifische About-Me-Überschreibungen

Das **About Me** auf der Karte ist die Standardbiografie und gilt überall. Für einen einzelnen Chat lässt sich aber eine abweichende Biografie hinterlegen. Das ist die chat-spezifische Überschreibung, und sie führt über ein Profil-Popover – ein kleines Einblendfenster.

1. Klick in einem Conversation-Mode-Chat auf den Avatar oder den Namen eines Charakters oder einer Persona.
2. Neben dem Avatar öffnet sich eine kleine Profilkarte. Auf dem Handy schiebt sie sich von unten herein.
3. Die Karte zeigt den vergrößerten Avatar, den Namen und das aktuelle **About Me**.
4. Ein Badge zeigt **Default**, solange die Biografie der Karte gilt, oder **Chat-specific**, sobald eine Überschreibung für diesen Chat aktiv ist. Bei Charakteren steht hier zusätzlich ein Status: **Online**, **Away**, **Busy** oder **Offline**.

So legst du eine Überschreibung an:

1. Klick im Popover auf **Edit** (bearbeiten).
2. Tipp die Biografie für diesen Chat. Dafür steht eine Emoji-Auswahl bereit, samt Tab **Custom emojis** (eigene Emojis).
3. Klick auf **Save** (speichern). Ein Hinweis bestätigt dir, dass ein chat-spezifisches About Me gespeichert wurde.

Während der Bearbeitung macht die Schaltfläche **Revert** ungespeicherte Änderungen rückgängig, und **Cancel** (abbrechen) beendet den Bearbeitungsmodus ohne zu speichern. Existiert eine Überschreibung, entfernt sie die Schaltfläche **Clear** (leeren) und der Kartenstandard gilt wieder. Auch eine leer gespeicherte Biografie hebt die Überschreibung auf. Merke: Das Standard-**About Me** wird auf der Karte bearbeitet, eine Überschreibung greift nur in diesem einen Chat.

## Charakteren erlauben, ihr About Me selbst zu ändern

Es gibt außerdem ein Werkzeug, das ein Charakter mitten im Gespräch aufrufen kann, um die eigene Biografie zu ändern. Es heißt **update_about_me** und ist standardmäßig aus. Aktiviere es in den **Chat Settings** (Chat-Einstellungen) im Abschnitt **Function Calling**: Schalte **Enable Tool Use** ein und füge das Werkzeug **update_about_me** hinzu.

Ist es aktiv, kann ein Charakter die eigene Biografie auf zwei Wegen ändern:

- Der Geltungsbereich „public“ ändert die echte Biografie, die in jedem Chat sichtbar ist. Das legt Marinara dir vorher zur Freigabe vor.
- Der Geltungsbereich „chat“ ändert eine Biografie, die nur im aktuellen Chat gilt.

## Die Profile in eigenen Prompts nutzen

Damit die Profile beim Modell ankommen, brauchst du keine Makros. Die **About Me**-Biografien landen automatisch im Prompt, und **Convo Behavior** folgt der Einstellung **Insertion**. Makros sind für eigene Prompts gedacht, wenn du einen Wert selbst an eine ganz bestimmte Stelle setzen willst.

Vier Makros fügen diese Profilwerte direkt im Text ein. Außerhalb des Conversation Mode löst sich jedes davon zu nichts auf:

- `{{convo_display}}`: der Anzeigename des antwortenden Charakters.
- `{{char_about}}`: das wirksame **About Me** des Charakters.
- `{{persona_about}}`: das wirksame **About Me** der Persona.
- `{{convo_behavior}}`: die **Convo Behavior**-Anweisung des Charakters.

Die vollständige Liste steht unter [Makros](../prompts/macros.md).

## Verwandte Anleitungen

- [Conversation Mode: Erste Schritte](getting-started.md)
- [Charaktere anlegen und bearbeiten](../characters/creating-and-editing-characters.md)
- [Personas erstellen und bearbeiten](../characters/personas.md)
- [Referenz der herunterladbaren Agenten](../agents/built-in-agents.md)
- [Makros](../prompts/macros.md)
