# 機能スイッチ

サーバーの一部の動作はオプションです。**Settings > Advanced > Features**(設定 > 詳細 > 機能)で有効にします。すべてのスイッチは初期状態でオフなので、このセクションを開かなければサーバーは従来どおり動作します。

変更はすぐに反映されます。サーバーの再起動やページの再読み込みは不要です。

<a id="overview"></a>

## 概要

| スイッチ | 設定キー | 既定値 | 環境変数 |
| --- | --- | --- | --- |
| **Stable lorebook picks**(ロアブックの選択を固定) | `stableLorebookGroupPicks` | オフ | `LOREBOOK_STABLE_GROUP_WINNERS` |
| **Retry failed provider calls**(失敗したプロバイダー呼び出しを再試行) | `providerRetry` | オフ | `PROVIDER_RETRY_TRANSIENT_ERRORS` |

設定で`features`を検索するとこのセクションに移動します。

<a id="where-the-settings-are-stored"></a>

## 設定の保存場所

すべてのスイッチは、アプリ設定`features`に真偽値のJSONオブジェクトとしてまとめて保存します。既定値と異なる値だけを保存します。キーがない場合、空のオブジェクト、読み取れない値はいずれも既定値、つまり全スイッチがオフになります。

サーバーはコピーをメモリーに保持するため、プロバイダー呼び出しやロアブックスキャンなど頻繁な経路で追加の読み取りは不要です。Settingsからの保存や、ほかの方法による`features`行への書き込みは、このコピーを即時更新します。

APIは`GET`と`PUT /api/app-settings/features`です。`PUT`はオブジェクト全体を置き換え、不明なキーや真偽値以外の値を拒否します。

<a id="switches"></a>

## スイッチ

<a id="stable-lorebook-picks"></a>

### ロアブックの選択を固定

設定キー：`stableLorebookGroupPicks`。環境変数：`LOREBOOK_STABLE_GROUP_WINNERS`。

オン：ロアブックの包含グループは、一致する候補が同じ間、そのチャットで同じ採用項目を維持します。別のチャットや候補集合では異なる選択が可能です。

オフ：生成のたびに採用項目を抽選し直します。

<a id="retry-failed-provider-calls"></a>

### 失敗したプロバイダー呼び出しを再試行

設定キー：`providerRetry`。環境変数：`PROVIDER_RETRY_TRANSIENT_ERRORS`。

オン：接続拒否・到達不能、またはゲートウェイの502・503を、短いランダムな待機を挟んで最大2回再試行します。テキストが届く前だけが対象です。504や途中で切れた接続は再試行しません。接続にフォールバックがある場合は、この処理ではなく直ちにフォールバックを試します。

オフ：従来どおり、レート制限だけを再試行します。

<a id="precedence"></a>

## 優先順位

1. **環境変数。**設定されていれば、オン・オフとも保存済みスイッチより優先します。Settingsでは変数名を付けてロック表示します。空の値は未設定と見なします。
2. **保存済みスイッチ。**Settings > Advanced > Featuresで保存した値です。
3. **既定値。**オフです。

| 変数 | 対象 | 値 |
| --- | --- | --- |
| `LOREBOOK_STABLE_GROUP_WINNERS` | ロアブックの選択固定 | `true`、`1`、`yes`、`on`でオン。それ以外はオフ。 |
| `PROVIDER_RETRY_TRANSIENT_ERRORS` | 失敗したプロバイダー呼び出しの再試行 | `true`、`1`、`yes`、`on`でオン。それ以外はオフ。 |

環境変数は確認のたびに読むため、`.env`変更は再起動なしで反映されます。

<a id="for-developers"></a>

## 開発者向け

レジストリーは`packages/shared/src/schemas/feature-settings.schema.ts`で、スイッチ名と既定値を定義します。`FEATURE_SWITCH_NAMES`、`FEATURE_SWITCH_DEFAULTS`、`featureSettingsSchema`へ追加し、英語カタログの`settings.features.<key>`にラベルとヘルプを用意します。さらに`packages/client/src/components/panels/settings/FeatureSwitchesSettings.tsx`の`SERVER_SWITCHES`へ登録するとSettingsに表示されます。サーバーでは`packages/server/src/services/features/feature-settings.ts`の`isFeatureEnabled("<key>")`、クライアントでは`packages/client/src/hooks/use-feature-settings.ts`の`useFeatureEnabled("<key>")`を使って確認します。
