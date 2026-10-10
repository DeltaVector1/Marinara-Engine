# Marinara Engine

A local chat and roleplay workspace for managing characters, prompts, providers, and long conversations. Marinara runs on your device and can connect to local or hosted language models.

> **Beta software:** expect rough edges and breaking changes.

## Screenshots

<p align="center">
  <img src="docs/screenshots/Desktop_Roleplay_View.png" width="90%" alt="Roleplay chat" />
  <br/><em>Roleplay chat with character art and scene background</em>
</p>

<p align="center">
  <img src="docs/screenshots/Desktop_DM_Conversation.png" width="45%" alt="Conversation chat" />
  &nbsp;&nbsp;
  <img src="docs/screenshots/Desktop_Model_Picker.png" width="45%" alt="Model picker" />
</p>
<p align="center"><em>Conversation chat and model selection</em></p>

## Latest release

Current stable release: **[v2.5.0](https://github.com/Pasta-Devs/Marinara-Engine/releases/tag/v2.5.0)**. See [CHANGELOG.md](CHANGELOG.md) for release notes. Android users can [download the latest bootstrap APK](https://github.com/Pasta-Devs/Marinara-Engine/releases/latest/download/marinara-engine-android.apk); it runs the local server through Termux. The APK handles its private localhost credential. Android still shows its required install and Termux permission prompts.

## Installation

| Platform | Guide |
| --- | --- |
| Docker or Podman | [Container installation](docs/installation/containers.md) |
| macOS or Linux | [Installation from source](docs/installation/macos-linux.md) |
| Android | [Bootstrap APK](https://github.com/Pasta-Devs/Marinara-Engine/releases/latest/download/marinara-engine-android.apk) · [Guide](android/README.md) |
| Android manual setup | [Termux installation](docs/installation/android-termux.md) |
| iPhone or iPad | [PWA guide](docs/installation/ios-pwa.md) |

See [Installation](docs/INSTALLATION.md), [Upgrading](docs/UPGRADING.md), and [Troubleshooting](docs/TROUBLESHOOTING.md) for details. The app stores chats and settings on the machine that runs the server. See [Configuration](docs/CONFIGURATION.md) and [Remote Access](docs/REMOTE_ACCESS.md) before opening access to other devices.

## Features

- **Conversation and Roleplay:** create or import characters, organize chats, branch conversations, edit and export messages, and import from SillyTavern.
- **Prompts and context:** configure prompt presets, lorebooks, personas, summaries, and optional agents.
- **Character media:** upload and manage character sprites, backgrounds, and gallery media. Connect an image or video provider for supported media workflows.
- **Providers:** connect hosted services or local OpenAI-compatible servers. Use a separate connection for each chat when needed.
- **Local data:** keep characters, chats, and settings on your own device; create and restore backups.

Browse the [conversation guides](docs/conversation/getting-started.md), [roleplay guides](docs/roleplay/getting-started.md), and [documentation index](docs/INSTALLATION.md). More reference guides cover [providers](docs/connections/providers-reference.md), [prompt presets](docs/prompts/presets.md), [lorebooks](docs/lorebooks/overview.md), [agents](docs/agents/agents-overview.md), [character import/export](docs/characters/import-export.md), and [backups](docs/data/backup-and-restore.md).

## Support

- [Discord](https://discord.com/invite/KdAkTg94ME)
- [Ko-fi](https://ko-fi.com/marinara_spaghetti)

## License

See [LICENSE](LICENSE) for the software license and [TRADEMARKS.md](TRADEMARKS.md) for name and branding terms.
