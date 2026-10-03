# Lorebooks mit Charakteren und Personas verknüpfen

In dieser Anleitung erfährst du, wie du Lorebooks mit einem Charakter oder einer Persona verknüpfst, damit sie sich in den richtigen Chats von selbst einschalten. Dazu kommt das Einbetten eines Lorebooks direkt in eine Charakterkarte sowie der **Lorebooks**-Bereich (Lorebooks) im einzelnen Chat. Ein Lorebook ist eine Sammlung von Weltwissen: World-Info-Einträge, die über Schlüsselwörter ausgelöst werden. Bist du damit noch nicht vertraut, hilft [Lorebooks – Überblick](overview.md) weiter.

## Zwei Wege, ein Lorebook anzuhängen

Ein Lorebook lässt sich auf zwei Arten an einen Charakter hängen. Die beiden verhalten sich unterschiedlich – wähl also bewusst.

- **Link (Assign)** (verknüpfen): Das Lorebook bleibt in der Bibliothek, der Charakter oder die Persona verweist nur darauf. In Chats mit diesem Charakter oder dieser Persona schaltet es sich von selbst ein. Beim Export einer Charakterkarte wandert ein verknüpftes Lorebook NICHT mit.
- **Embed** (einbetten): Das Lorebook wird in die Charakterkarte selbst geschrieben. Exportierst oder teilst du den Charakter, reist es mit der Karte mit. Einbetten geht nur bei Charakteren, nicht bei Personas.

In den allermeisten Fällen ist Verknüpfen die richtige Wahl. Bette nur dann ein, wenn du die Charakterkarte mitsamt Lorebook weitergeben willst.

## Der Lorebook-Tab im Editor

Sowohl der Charakter-Editor als auch der Persona-Editor haben einen **Lorebook**-Tab.

1. Öffne einen Charakter oder eine Persona zum Bearbeiten.
2. Klick auf den **Lorebook**-Tab.
3. Dort findest du den Bereich **Lorebooks** mit zwei Schaltflächen: **New** (Neu) und **Assign Lorebook** (Lorebook zuweisen).

**New** legt ein frisches Lorebook an, das sofort mit dem geöffneten Charakter oder der geöffneten Persona verknüpft ist. Es öffnet das Fenster **Create Lorebook** (Lorebook erstellen), wobei **Category** (Kategorie) bereits auf **Character** steht.

**Assign Lorebook** verknüpft ein vorhandenes Lorebook aus der Bibliothek. Die Auswahl zeigt ausschließlich Lorebooks der Kategorie **Character**. Mehr dazu im nächsten Abschnitt.

## Ein vorhandenes Lorebook zuweisen

Die Auswahl hinter **Assign Lorebook** zeigt nur Lorebooks, deren **Category** auf **Character** steht – auch dann, wenn du gerade eine Persona bearbeitest. Ein Lorebook aus einer anderen Kategorie, etwa World oder NPC, taucht weder in der Auswahl noch in der Liste der zugewiesenen Lorebooks auf. Damit es erscheint, öffne das Lorebook und setz im Tab **Overview** (Überblick) die **Category** auf **Character**. Mit **New** umgehst du das Problem von vornherein, denn dabei entsteht direkt ein Lorebook der Kategorie Character.

1. Klick im **Lorebook**-Tab auf **Assign Lorebook**.
2. Tipp im Suchfeld einen Teil des Lorebook-Namens ein.
3. Klick auf das gewünschte Lorebook. Daneben erscheint ein Häkchen.
4. Wähl rechts einen **Scope** (Geltungsbereich) – siehe nächster Abschnitt.
5. Klick auf **Assign**.

Das Lorebook steht nun in der Liste der zugewiesenen Lorebooks. Jede Zeile hat eine **Scope**-Schaltfläche, um den Geltungsbereich später zu ändern, und ein Papierkorb-Symbol, um die Verknüpfung zu lösen. Ein Klick auf den Namen öffnet das Lorebook im vollen Editor.

Ein Lorebook, das auf Global steht, ist in jedem Chat aktiv und lässt sich deshalb nicht zusätzlich mit einem Charakter oder einer Persona verknüpfen. Was Global genau bedeutet, steht in [Lorebooks – Überblick](overview.md).

## Scope: welche Chats das verknüpfte Lorebook nutzen dürfen

**Scope** legt fest, wo sich ein verknüpftes Lorebook einschalten darf. Gemeint sind nicht alle Chats in Marinara, sondern nur die Chats mit diesem Charakter beziehungsweise dieser Persona. Es gibt drei Modi.

- **All chats with [name]**: der Standard. Das Lorebook schaltet sich in jedem Chat ein, an dem dieser Charakter beteiligt ist oder in dem diese Persona genutzt wird.
- **Disabled for all chats**: Die Verknüpfung bleibt bestehen, das Lorebook schaltet sich aber nie ein. Praktisch, um ein Lorebook zu pausieren, ohne die Verknüpfung zu lösen.
- **Specific chats**: Du wählst einzelne Chats aus einer Liste mit Kontrollkästchen. Nur die angehakten Chats dürfen das Lorebook nutzen. Die Liste enthält die Chats, an denen dieser Charakter bereits beteiligt ist oder in denen diese Persona genutzt wird.

Bei **Specific chats** musst du mindestens einen Chat anhaken, sonst lässt sich nicht speichern.

Willst du den Geltungsbereich später ändern, klick in der Zeile des zugewiesenen Lorebooks auf **Scope**, pass ihn an und klick erneut auf **Assign**.

## Ein Lorebook in eine Charakterkarte einbetten

Beim Einbetten wandert ein Lorebook in die Charakterkarte und wird beim Export mit exportiert. Das geht nur bei Charakteren. Nutz es, wenn du einen Charakter samt seiner World Info weitergeben willst.

1. Öffne den Charakter im Charakter-Editor.
2. Wechsel zum **Lorebook**-Tab.
3. Achte darauf, dass das gewünschte Lorebook bereits zugewiesen ist (siehe oben).
4. Klick in dessen Zeile auf **Embed into card** (in Karte einbetten).

In der Zeile sollte daraufhin ein **Embedded**-Badge auftauchen. Ab jetzt liegen die Lorebook-Einträge in der Karte und werden mit ihr exportiert.

Eine Charakterkarte fasst immer nur ein eingebettetes Lorebook. Ist bereits eines vorhanden, ist die Schaltfläche **Embed into card** deaktiviert und trägt den Hinweis "Remove the current embedded lorebook first". Entferne also erst die vorhandene eingebettete Kopie, bevor du ein anderes Lorebook einbettest.

Bearbeitest du das verknüpfte Lorebook nach dem Einbetten, klick in seiner Zeile auf **Refresh** (aktualisieren). Damit wird die eingebettete Kopie aus den aktuellen Einträgen neu geschrieben und bleibt auf dem neuesten Stand.

## Ein eingebettetes Lorebook verwalten

Sobald eine Charakterkarte ein eingebettetes Lorebook enthält, erscheinen unterhalb der Liste zusätzliche Bedienelemente – dazu eine schreibgeschützte Übersicht der eingebetteten Einträge.

- **Import Embedded Lorebook** (eingebettetes Lorebook importieren): macht aus den Einträgen in der Karte ein normales, bearbeitbares Lorebook in der Bibliothek. Das neue Lorebook wird zugleich mit dem Charakter verknüpft. Existiert bereits eine verknüpfte Kopie, heißt die Schaltfläche **Reimport Embedded Lorebook**.
- **Edit Embedded Lorebook** (eingebettetes Lorebook bearbeiten): öffnet dieses verknüpfte Lorebook im vollen Editor. Deine Änderungen landen automatisch auch in der eingebetteten Kopie in der Karte.
- **Remove from card** (aus Karte entfernen): löscht die eingebettete Kopie aus der Karte. Ein separat verknüpftes Lorebook in der Bibliothek bleibt unangetastet.

Besonders nützlich ist das bei Karten aus anderen Tools: Viele importierte Karten bringen ein eingebettetes Lorebook mit. Ein Klick auf **Import Embedded Lorebook** verschafft dir eine voll bearbeitbare Fassung in Marinara.

## Der Bereich Lorebooks in den Chat Settings

Jeder Chat hat seine eigene **Lorebooks**-Steuerung. Hier siehst du, welche Lorebooks im aktuellen Chat aktiv sind, und passt sie nur für diesen Chat an.

1. Öffne einen Chat.
2. Öffne **Chat Settings** (Chat-Einstellungen).
3. Geh zum Bereich **Lorebooks**. Das Zähler-Badge zeigt, wie viele Lorebooks aktiv sind.

Jedes aktive Lorebook trägt ein oder mehrere Badges, die den Grund dafür nennen:

- **Chat**: Du hast es von Hand an diesen Chat geheftet.
- **Global**: Es ist ein globales Lorebook.
- **Character**: Es ist mit einem Charakter in diesem Chat verknüpft.
- **Persona**: Es ist mit der Persona in diesem Chat verknüpft.

Was aktiv ist, lässt sich für diesen einen Chat ändern.

- **Add Lorebook** (Lorebook hinzufügen): heftet ein Lorebook an diesen Chat. Angeheftete Lorebooks tragen das **Chat**-Badge.
- Papierkorb-Symbol (**Remove from chat**): löst ein von Hand hinzugefügtes Lorebook wieder vom Chat.
- Durchgestrichenes Auge (**Disable in this chat**): blendet ein automatisch aktiviertes Lorebook nur für diesen Chat aus, ohne die Verknüpfung zu lösen. Solche Lorebooks erscheinen durchgestrichen und mit einem **Disabled**-Badge.
- Auge-Symbol (**Enable in this chat**): schaltet ein deaktiviertes Lorebook für diesen Chat wieder ein.

### Lorebook Token Budget

**Lorebook Token Budget** ist ein Zahlenfeld in diesem Bereich. Es begrenzt, wie viel Lorebook-Text in diesem Chat eingefügt werden darf – gemessen in Tokens, also kleinen Textstücken. Der Standard liegt bei **8192**. Mit **0** hebst du die Grenze auf. Dieses chatweite Budget ist unabhängig vom Token-Budget des einzelnen Lorebooks; beide Grenzen gelten gleichzeitig. Wie sie zusammenspielen, steht in [Lorebook-Token-Budgets und Rekursion](token-budgets.md).

## Verwandte Anleitungen

- [Lorebooks – Überblick](overview.md)
- [Lorebook-Token-Budgets und Rekursion](token-budgets.md)
- [Lorebooks importieren und exportieren](import-export.md)
- [Charaktere anlegen und bearbeiten](../characters/creating-and-editing-characters.md)
- [Chat Settings – Überblick](../chats/chat-settings.md)
