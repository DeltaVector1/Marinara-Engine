# Preset Editor and Prompt Manager

This guide explains prompt presets in Marinara Engine. You will learn what they are, how to build one in the **Preset Editor**, and how to assign one to a chat. A preset controls the structure of the text that Marinara sends to the AI.

## What a preset is

A preset is a reusable blueprint. It decides what information Marinara sends to the AI and in what order. That includes system instructions you write, the character card, your persona, the chat history, lorebook entries, and more.

Presets shape prompts for Roleplay chats. Conversation uses one prompt field and can select a preset or a chat-specific prompt.

Presets do not need an API key or account. They only describe how a prompt is built. You still need a working connection to send the prompt. See [Connecting to an AI Provider](../connections/connecting-to-a-provider.md).

## Opening the Preset Editor

Prompt presets live in the **Prompts** section of the **Presets** panel on the left side of the app. The other sections in this panel are **Regexes** and **Functions**.

The panel has three buttons at the top:

- **New** (plus icon): create a new preset.
- **Import** (download icon): load a preset from a `.json` file.
- **Select** (check icon): pick several presets to export or delete at once.

Below the buttons are a **Search presets** box and a sort menu with **A-Z**, **Z-A**, **Newest**, and **Oldest**. A **New Folder** button lets you group presets into folders. Drag a preset onto a folder to move it. Double-click or double-tap a folder to rename it.

Each preset row shows its name, wrap format, section count, and author. A **DEFAULT** badge appears if the preset is the starred default. Click a preset row to open it in the **Preset Editor**.

## Creating and editing a preset

Follow these steps to make a new preset.

1. Open the **Presets** panel.
2. Click the **New** button. The **Create Preset** modal opens.
3. Type a **Name**. This field is required.
4. Add an optional **Description** so you remember what the preset is for.
5. Click **Create**. The new preset opens in the **Preset Editor**.
6. Build your prompt on the **Sections** tab (covered below).
7. Click **Save** in the top right corner when you are done.

The editor does not save on its own. Your changes are only kept after you click **Save**. If you try to leave with unsaved edits, a warning appears with **Keep editing**, **Discard**, and **Save & close** buttons.

To export a preset, open it and click the export button (up-arrow icon) in the top bar. Marinara asks to save first if you have unsaved edits. To delete a preset, use the trash icon in the top bar.

## The Overview, Sections, and Prompts tabs

The **Preset Editor** has three tabs.

- **Overview**: the preset name, description, wrap format, and author.
- **Sections**: the actual prompt structure, built from blocks and markers.
- **Prompts**: the Roleplay prompts used by chats.

### Overview tab

The **Overview** tab holds four fields. **Name** is the display name shown in the **Presets** panel. **Description** is a short summary of the preset. **Wrap Format** controls how sections are formatted (see "Wrap formats"). **Author** is an optional creator name, useful when you share a preset. Two read-only cards show the **Sections** and **Groups** counts.

### Prompts tab

The **Prompts** tab holds the mode prompts.

- **Conversation Mode**: a text box used as this preset's Conversation prompt. Leave it empty to use Marinara's built-in conversation prompt.
- **Roleplay Mode**: not editable here. Roleplay uses the assembled prompt from your **Sections**.
- **Roleplay Mode**: the sections used to assemble the Roleplay prompt.

## Sections and markers

The **Sections** tab is where you build the prompt. Every section becomes part of the final text sent to the AI. Sections are assembled from top to bottom.

Click **Add Section** to open the add menu. It offers two kinds of section.

A **Prompt Block** is a free-text section that you write yourself. Use it for system instructions, tone rules, or any wording you want in every prompt.

A **marker** is an auto-filled section. It has no text of its own. Instead, Marinara fills it at send time with live content from your chat. The table below lists the markers.

| Marker | What it inserts |
|---|---|
| **Character Info** | The active character card details. |
| **Persona** | Your active persona details. |
| **Chat History** | The running chat messages. |
| **Chat Summary** | The compiled chat summary for this chat. |
| **Dialogue Examples** | The character's example dialogue. |
| **Lorebook Marker (All)** | All active lorebook entries. |
| **Lorebook Marker (Before)** | Lorebook entries set to insert before. |
| **Lorebook Marker (After)** | Lorebook entries set to insert after. |

A section that is a marker shows a **MARKER** badge in its row. Expand it to see a note that names the marker type. You cannot type content into most markers, because Marinara generates them for you.

When a preset has no enabled **Dialogue Examples** marker, non-empty Example Dialogue is appended to **Character Info** after Scenario. It uses the preset's XML, Markdown, or unwrapped formatting. Add a Dialogue Examples marker when you want to control its placement explicitly; Marinara will not include it twice.

If your chat has active lorebooks but your preset has no lorebook marker, a warning appears. It reads: "Add a lorebook marker when this preset should receive active lorebook entries." Add a lorebook marker so those entries reach the AI. See [Lorebooks Overview](../lorebooks/overview.md).

If you have set up custom agents with the "inject as section" option turned on, the add menu shows an **Agent Sections** group. Each agent section inserts that agent's latest output into the prompt. You can add your own instructions around it.

Each section row has controls on the right. **Duplicate** copies the section. The eye icon enables or disables the section. **Delete** removes it. To reorder sections, drag the grip handle, use the up and down arrows, or long-press on a touch screen.

Expand a section (click its name or the chevron) to edit it. You can change its **Name** and its role (**System**, **User**, or **Assistant**). For a **Prompt Block**, you can also edit its **Content**. The content box supports macros. See [Prompt Macros](macros.md).

## Groups and section position

### Groups

Groups wrap several sections in one container. This keeps related sections together in the final prompt.

1. On the **Sections** tab, click the **Groups** button in the toolbar.
2. Click **New Group**. A group named "New Group" appears.
3. Click the group name to rename it.
4. Expand a section and pick your group in its **Group** dropdown.

With **XML** wrap format, a group becomes one parent tag around its sections. With **Markdown**, a group becomes one heading. Deleting a group does not delete its sections. They simply lose the group.

### Position and depth

Each section has a **Position** setting inside its expanded editor.

- **Ordered (in sequence)**: the section sits where it appears in the list. This is the normal choice.
- **Depth (from end of chat)**: the section is placed a set number of messages up from the end of the chat. When you pick this, a **Depth** number appears. A depth of 0 means the section goes after the last message.

Use **Depth** for reminders you want the AI to see near the newest messages, such as a short style note.

## Wrap formats

**Wrap Format** on the **Overview** tab controls how each section is wrapped when the prompt is assembled. There are three buttons.

- **XML**: each section is wrapped in tags, for example a name tag around its content. Groups become parent tags. This is the default.
- **MARKDOWN**: each section is wrapped with a heading. Groups become higher-level headings.
- **NONE**: no wrapping is added. Section content is sent exactly as written.

XML is a good default for most models. Try **MARKDOWN** or **NONE** only if a model seems to respond better without tags.

To send one **Prompt Block** without its tag or heading while the rest of the preset stays wrapped, expand it on the **Sections** tab and turn on **Send without wrapper**. The block's content is sent exactly as written. If the block belongs to a group, the group's tag or heading can still surround it; remove it from the group when you want it fully bare. Markers always keep their wrapper, so the switch appears only on prompt blocks. It is also hidden when the preset's wrap format is **NONE**, because nothing is wrapped then.

## Assigning a preset to a chat

A preset does nothing until you assign it to a chat. There are two ways to do this in a **Roleplay** chat.

From the **Presets** panel:

1. Open the chat you want to change.
2. In the **Presets** panel, hover over a preset row.
3. Click the check-mark **Assign to chat** button. Click it again to unassign.

From **Chat Settings**:

1. Open the chat.
2. Open **Chat Settings**.
3. Find the **Prompt Preset** section.
4. Pick a preset from the dropdown.

If a preset has variables, a **Configure Preset Variables** window opens when you assign it. Fill in your choices there. See [Preset Variables](preset-variables.md). Switching to a different preset clears any variable choices you made before.

Conversation chats use the **Prompt Preset** section in Chat Settings to choose a preset or edit a chat-specific prompt.

## Conversation prompts

Conversation uses a single prompt rather than the Roleplay section layout. Open **Chat Settings → Prompt Preset** to choose a saved preset or edit the prompt for that chat.

## Decision blocks and prompt caching

A section can hold a decision block, `{{#if decision:"..."}}`, so that part of the preset is sent only on turns where a statement about the chat is true. See [Asking the Decision model](conditional-prompts.md#asking-the-decision-model).

**Put changing decision blocks late in the prompt**, such as in post-history instructions. A changed branch can prevent a provider from reusing the prompt from that point onward, so an early change can lose most cache savings. An earlier unchanged prefix may still qualify; the whole prompt is not necessarily billed as new. Keep a decision near the top only when its answer rarely changes and its instructions belong there. Provider-specific details are in [Prompt caching](conditional-prompts.md#prompt-caching).

Statements in disabled sections and groups are never asked, and do not count toward **Decision statements per turn**.

## Checking what the AI received

To confirm which preset and sections actually reached the AI, use **Peek Prompt**. It shows the fully assembled prompt for a message. This is the fastest way to debug an odd response. See [Peek Prompt: See What the AI Received](../chats/peek-prompt.md).

## Related guides

- [Preset Variables](preset-variables.md)
- [Prompt Macros](macros.md)
- [Generation Parameters](generation-parameters.md)
- [Settings Profiles](../chats/settings-profiles.md)
- [Chat Settings Overview](../chats/chat-settings.md)
- [Peek Prompt: See What the AI Received](../chats/peek-prompt.md)
