# 設定の概要

このガイドでは、Marinara Engineの**Settings**(設定)パネルの全体像を説明します。6つのタブがそれぞれ何を担当するのかを整理したうえで、**General**タブを詳しく取り上げ、チャットの文章を整形する**Text Rules**、そして設定が複数のデバイス間で同期する仕組みまで扱います。

## Settingsパネルと6つのタブ

上部バーの歯車アイコンから**Settings**を開きます。パネルの上部には**Search settings**(設定の検索)ボックスがあります。`delete`、`streaming`、`quotes`のような語句を入力すると、Marinaraが該当するセクションまで移動します。

パネルには6つのタブがあります。それぞれのタブが受け持つ内容は次のとおりです。

| タブ | 設定できる内容 |
| --- | --- |
| **General** | アプリの動作、通知、返信、入力、テキストルール、ゲームの再生。 |
| **Appearance** | テーマ、配色、フォント、チャットのレイアウト、アニメーション、背景。 |
| **Generations** | 画像と動画のデフォルト、および使い回せるプロンプトの雛形。 |
| **Addons** | Professor Mariが作るサンドボックス内のPersonal Extensionの下書き、必要に応じて解放するExternal Extensions、カスタムテーマ。 |
| **Imports** | プロファイル全体の復元と、他のアプリからのインポート。 |
| **Advanced** | 管理者アクセス、オプションの機能スイッチ、アップデート、メッセージ関連の機能、バックアップ、取り消せないリセット。 |

各タブの詳しい説明は、以下のガイドにあります。

- **General**: このページで説明します(以下のセクションを参照)。
- **Appearance**: [外観の設定](../appearance/appearance-settings.md)を参照してください。
- **Generations**: [スタイルプロファイル](../media/style-profiles.md)と[シーン動画](../media/scene-video.md)を参照してください。
- **Addons**: [個人用拡張機能](../extending/personal-extensions.md)と[カスタムCSSテーマ](../appearance/custom-css-themes.md)を参照してください。
- **Imports**: [SillyTavernからのインポート](../data/importing-from-sillytavern.md)と[バックアップと復元](../data/backup-and-restore.md)を参照してください。
- **Advanced**: 以下の**Message Tools**のセクションに加えて、[Marinara Engineのアップデート](../UPGRADING.md)、[リモートアクセス](../REMOTE_ACCESS.md)、[データの消去](../data/clearing-data.md)を参照してください。 [機能スイッチ](../configuration/features.md)。

## Settings、Generalタブ

**General**タブは6つのセクションに分かれています。このページで全体を扱うのは**App Behavior**(アプリの動作)と**Text Rules**(テキストルール)の2つです。残りはここで要点だけ紹介し、詳細はそれぞれのガイドで説明します。

- **App Behavior**: 言語、削除時の安全確認、表示・非表示のトグルの設定です。以下で説明します。
- **Notifications**: 通知音と、ブラウザーおよびAndroidアプリ向けの個別の設定です。**Custom sound**にはMP3、WAV、OGG、M4A/MP4、WebM形式のファイル(10 MBまで)をアップロードでき、このサーバーに接続しているすべてのデバイスで、Marinara標準の通知音の代わりに鳴ります。試聴、差し替え、削除はいつでもできます。読み込めないファイルを指定した場合は標準の通知音に戻り、アップロードしたファイルはバックアップとプロファイルのエクスポートにも含まれます。**Background Notifications**はConversationの自動メッセージが対象で、**Generation Completion Notifications**はConversation、Roleplay、Game Modeで自分から始めた返信が対象です。どちらもMarinaraを開いたまま別の画面を操作しているときに動作し、メッセージの中身は表示しません。
- **Responses**: 返信のストリーミング、保存、ページ送りに関する設定です。[メッセージの送信とストリーミング](../chats/sending-and-streaming.md)を参照してください。
- **Input & Editing**: メッセージの入力欄とすばやい編集の設定です。[メッセージの操作](../chats/messages.md)を参照してください。
- **Text Rules**: チャットの文章に適用される整形ルールです。以下で説明します。
- **Game Playback**: Game Modeでの読み進め方と画面移動の設定です。

## App Behavior

このセクションは**Settings** > **General** > **App Behavior**にあります。日常的なアプリの動作と、いくつかの表示・非表示のトグルをまとめています。

- **Language**: アプリの表示言語を選びます。Marinaraは現在、アラビア語、簡体字中国語、英語、
  フランス語、ドイツ語、ヒンディー語、日本語、韓国語、ポーランド語、ブラジルポルトガル語、ロシア語、スペイン語に対応しています。アラビア語では
  右から左に読むレイアウトになります。まだ翻訳されていない画面のテキストは英語で表示されます。この設定が変えるのは
  Marinaraの操作画面と案内文だけで、モデルへのプロンプトやチャットの内容は変わりません。翻訳を改善したい場合や、別の
  言語を追加したい場合は、[UIのローカライズ](../development/localization.md)を参照してください。
- **Documentation Language**: Marinaraに組み込まれたガイドの言語を、上の表示言語とは別に選べます。英語は最初から入っていて、ダウンロードは不要です。英語以外を選ぶと**Download & Replace**が表示され、その言語パックを一度だけダウンロードして、前のパックを削除します。つまり、ダウンロード済みの言語は常に1つだけです。まだ翻訳されていないガイドは小さな`EN`バッジ付きで英語のまま開き、ガイド検索は選択中の言語で動作します。選んだ言語はアップデート後も引き継がれ、翻訳に変更があったパックはアップデート後に自動で再取得されます。ダウンロードしたガイドが失われたり壊れたりした場合は、**Fix documentation**ボタンが現れます。このボタンはパックを再ダウンロードし、ダウンロード元に接続できないときはガイドを英語に戻します。
- **Confirm before deleting**: デフォルトでオンです。オンのあいだは、チャットやキャラクターなどを完全に削除する前にMarinaraが確認します。うっかり削除を防ぐため、オンのままにしておくことをおすすめします。
- **Achievements**: デフォルトでオンです。オンにすると、ホーム画面に実績のボタンと解除の通知が表示されます。オフにすると、記録は裏で静かに続きます。[実績](../home/achievements.md)を参照してください。
- **Music Player**: デフォルトでオンです。オンにすると、小さなMusic Playerが表示されます。[Music DJ](../media/music.md)を参照してください。
- **Mini Mari surprise visits**: デフォルトでオンです。オンにすると、画面をスクロールしているときにChibi Professor Mariのメッセージがまれに現れます。じゃまに感じるときはオフにしてください。

## Text Rules

このセクションは**Settings** > **General** > **Text Rules**にあります。ここのルールは、チャットの文章の扱い方を変えます。**Bold dialogue in quotes**と**Convert LaTeX symbols**は表示だけを変えるルールなので、保存済みのメッセージには手を加えません。**Quote style**だけは性質が違い、入力して保存する文章の引用符そのものを書き換えます。

### Bold dialogue in quotes

デフォルトでオンです。オンにすると、引用符で囲まれた部分が太字で表示されます。たとえば次の一文があるとします。

```
"I missed you," she said.
```

**Bold dialogue in quotes**がオンなら、`I missed you`の部分が太字になります。セリフの色だけを残して太字をやめたいときはオフにします。

### Convert LaTeX symbols

デフォルトでオンです。モデルによっては、数式をLaTeXのコマンドで書いてくることがあります。オンにすると、`\rightarrow`、`\neq`、`\times`、`\alpha`のようなよく使うコマンドが、本来の記号として表示されます。たとえば`\times`は掛け算の記号`×`、`\alpha`はギリシャ文字の`α`になります。コードの部分はそのままです。

### Quote style

引用符の形をどう統一するかを選びます。上の2つのルールと違い、これは文章そのものを変えます。入力して保存したメッセージは、選んだ形の引用符に書き換わります。選択肢は2つです。

- **Straight**: `"Hello," it's me.`のような、まっすぐなタイプライター式の記号のままにします。こちらがデフォルトです。
- **Typographic**: まっすぐな記号を、曲がった引用符とアポストロフィーに置き換えます。

## ResponsesとInput & Editing

**General**タブのこの2つのセクションでは、返信の届き方と、入力や編集の使い勝手を調整します。以下に各項目と、詳しいガイドへのリンクをまとめます。

**Responses**セクションの項目は次のとおりです。

- **Enable streaming**: AIの文章を、生成しながら少しずつ表示します。
- **Streaming speed**: ストリーミング表示の速さを決めます。
- **Trim incomplete model endings**: 末尾の言いかけの文を、保存前に切り落とします。
- **Messages per page**: 一度に読み込むメッセージの件数を決めます。

詳しくは[メッセージの送信とストリーミング](../chats/sending-and-streaming.md)を参照してください。

**Input & Editing**セクションの項目は次のとおりです。

- **Send on Enter**: Enterキーで送信するモードを選びます。
- **Keep guidance after regenerating**: ガイド付きの再生成の後も、指示をメッセージ入力欄に残します。デフォルトでオンです。
- **Speech-to-text microphone**: チャットの入力欄にマイクのボタンを表示します。
- **Intuitive swipe navigation**: 矢印キーや画面のスワイプで、別案の返信を切り替えられるようにします。
- **Reroll past the newest swipe**: いちばん新しいスワイプの先へ進んだときに、新しい返信を生成します。
- **Up Arrow edits last message**: 入力欄が空の状態でUp Arrowを押すと、直前のメッセージを編集できます。
- **Double-click edits messages**: Roleplayのメッセージをダブルクリックすると編集できます。

詳しくは[メッセージの操作](../chats/messages.md)を参照してください。

## Message Tools

**Message Tools**セクションは**Settings** > **Advanced** > **Message Tools**にあります。表示に関するトグルと、困ったときに役立つトグルが集まった場所です。以下のトグルはすべてデフォルトでオフです。それぞれの働きと、詳しいガイドは次の表のとおりです。

| トグル | 働き | 詳しいガイド |
| --- | --- | --- |
| **Show message timestamps** | メッセージごとに日付と時刻を表示します。 | [メッセージの操作](../chats/messages.md) |
| **Show model name on messages** | 返信を書いたAIモデルの名前を表示します。 | [メッセージの操作](../chats/messages.md) |
| **Show token usage on messages** | メッセージごとに、プロンプトと返信のトークン数を表示します。 | [メッセージの操作](../chats/messages.md) |
| **Show message numbers** | チャット内のメッセージに通し番号を表示します。 | [メッセージの操作](../chats/messages.md) |
| **Guide swipes/regens with chat input** | 再生成のときに、入力欄の下書きを指示として使います。 | [ガイド付き生成とImpersonate](../chats/guided-and-impersonate.md) |
| **Quick replies** | 送信ボタンの横に、下書きを作る別の操作を追加します。 | [ガイド付き生成とImpersonate](../chats/guided-and-impersonate.md) |
| **Include reasoning in exports** | 表に出ない思考の部分を、チャットのエクスポートに含めます。 | [チャットのエクスポートとインポート](../chats/export-import.md) |
| **Debug mode** | 問い合わせ用に、モデルへ送ったデータをサーバーのコンソールに記録します。 | [トラブルシューティング](../TROUBLESHOOTING.md) |

**Advanced**タブの残りの部分は、別のガイドで説明しています。**Updates**は[Marinara Engineのアップデート](../UPGRADING.md)、**Admin Access**は[リモートアクセス](../REMOTE_ACCESS.md)、**Backup & Export**は[バックアップと復元](../data/backup-and-restore.md)、**Danger Zone**は[データの消去](../data/clearing-data.md)を参照してください。

## 設定がデバイス間で同期する仕組み

Marinaraはほとんどの設定をサーバーに保存します。そのため、ブラウザーやデバイスを変えても設定はついてきます。これが設定同期の動きです。

流れは次のとおりです。

1. **Settings**のどこかで設定を変更します。
2. その約1秒後に、Marinaraがタイムスタンプを付けて変更内容をサーバーに保存します。
3. 別のブラウザーが同じMarinaraのサーバーを開くと、保存された設定を読み込みます。

どのデバイスも、より新しいほうのコピーを保持します。タイムスタンプの新しい書き込みが勝つ仕組みです。ここで1つ気を付けたい点があります。2台目のデバイスでMarinaraを開くと、そちらのコピーが、1台目で変更したばかりの設定を静かに上書きしてしまうことがあります。デバイスを持ち替える前に、同期の時間を少しだけ置いてください。

同期しない設定が2つあります。この2つは、設定したデバイスのブラウザーごとに保持されます。

- **Display Size**(画面のテキストの大きさ)
- **Chat Font Size**(チャットのテキストの大きさ)

どちらも**Settings** > **Appearance** > **Text & Scale**にあります。使うデバイスごとに設定し直してください。[外観の設定](../appearance/appearance-settings.md)を参照してください。

サーバーに接続できないときは、アプリは手元の設定で動き続け、次に何かを変更したタイミングで再送を試みます。

## 関連ガイド

- [外観の設定](../appearance/appearance-settings.md)
- [メッセージの操作](../chats/messages.md)
- [メッセージの送信とストリーミング](../chats/sending-and-streaming.md)
- [チャットのエクスポートとインポート](../chats/export-import.md)
- [Marinaraがデータを保存する場所](../data/where-data-is-stored.md)
- [Marinara Engineのアップデート](../UPGRADING.md)
- [トラブルシューティング](../TROUBLESHOOTING.md)
- [実績](../home/achievements.md)
- [個人用拡張機能](../extending/personal-extensions.md)
- [UIのローカライズ](../development/localization.md)
