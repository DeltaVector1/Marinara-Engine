# Marinara Engine Installation

Marinara runs on your own device and stores chats and settings there. Choose the guide for the device that will run the server.

| Platform | Installation guide |
| --- | --- |
| macOS or Linux | [macOS and Linux](installation/macos-linux.md) |
| Docker or Podman | [Containers](installation/containers.md) |
| Android | [Download APK](https://github.com/Pasta-Devs/Marinara-Engine/releases/latest/download/marinara-engine-android.apk) · [Android guide](../android/README.md) |
| Android manual setup | [Termux](installation/android-termux.md) |
| iPhone or iPad | [iOS and iPadOS](installation/ios-pwa.md) |

On iPhone or iPad, run the server on a computer or Android device, then open it in Safari. On Android, the bootstrap APK runs the local server through Termux and handles its private localhost credential. Android still shows its required install and Termux permission prompts.

The default local address is `http://127.0.0.1:7860`. For another device on your network, see [Remote Access](REMOTE_ACCESS.md). After installation, follow [Getting Started](home/welcome.md). For updates, see [Upgrading](UPGRADING.md).
