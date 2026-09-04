# MineTenant Frontend

MineTenant の画面遷移と API 連携を残し、デザイン担当者がここから見た目を作るための
Vite + React + TypeScript 製の土台です。

> 今回の Figma にある画面遷移図とワイヤーフレームを起点に新規作成しています。

## この土台に含むもの

- 主要画面へ移動できる React Router の設定
- 商品一覧、購入、出品、マイページ、店舗、取引の基本画面
- `src/api/products.ts` を通じた Laravel API への接続
- 仮ログイン状態と出品下書きを持つ小さな Context
- 入力フォームの最低限のバリデーション
- 操作に必要な余白・フォーム・現在地表示だけの最小限の CSS
- 404、空状態、エラー境界

見た目は意図的に、ほぼ未装飾にしています。ブラウザ標準のボタン・リンクと縦並びを基本に、
色、カード、画像枠、アニメーションなどの完成デザインは入れていません。

## この土台に含まないもの

- 本物のログイン認証
- バックエンド本体（別途 Laravel API の起動が必要）
- 決済、配送、画像アップロード
- 仮ログイン状態・出品下書きの永続化（リロードすると失われます）
- Minecraft サーバーとの通信
- 3D 店舗プレビュー
- 完成版のコピー、アニメーション、デザイン

API に保存した商品・取引データはバックエンド側に残ります。
`src/mocks/fixtures.ts` は参考データであり、現在の画面のデータ取得元ではありません。

## Docker を使わずに動かす

フロントは Node.js、バックエンドは PHP + MySQL を PC に入れて動かします。
Docker Desktop や旧 PoC のプロジェクトは不要です。

### 初回だけ行うこと

1. Node.js 22 系の 22.22.2 以降（推奨）と npm 10 以上をインストールします。
   `node -v` と `npm -v` で確認できます。テスト用ライブラリも使うため、古い Node.js 22 では動きません。
2. [バックエンドの README](https://github.com/IH-Ggroup/minetenant-backend#readme) に沿って、
   PHP・Composer・MySQL と開発用 DB の初期設定を行います。
3. このリポジトリのフォルダで、次のコマンドを実行します。

```bash
npm ci
npm run setup
```

`npm run setup` は `.env.example` をコピーして `.env.local` を作成します。
Windows / macOS / Linux 共通のコマンドです。既存の `.env.local` は上書きしません。

接続先の初期値は次のとおりです。接続先を変えた場合は Vite を再起動してください。

```env
VITE_API_BASE_URL=http://localhost:8787/api/v1
```

### 開発するたびに行うこと

起動する順番は **MySQL → Laravel → フロント** です。

1. PC にインストールした MySQL を起動します（方法はバックエンドの README を参照）。
2. ターミナルを開き、**バックエンドのフォルダ**で起動します。

   ```bash
   composer run dev
   ```

3. 別のターミナルを開き、**このフロントのフォルダ**で起動します。

   ```bash
   npm run dev
   ```

4. [http://localhost:5173](http://localhost:5173) をブラウザで開きます。

Laravel と Vite のターミナルは開いたままにします。終了するときは、それぞれ `Ctrl + C` を押してください。
フロントの設定に MySQL のパスワードは書きません。DB への接続は Laravel が担当します。

### 起動に困ったとき

- `Port 5173 is already in use`：既に起動しているフロントを終了してから再実行します。
  API の接続設定とずれないよう、ポート番号は自動変更しません。
- 商品取得に失敗する：MySQL と Laravel が起動しているか、`.env.local` の URL が正しいかを確認します。
- `localhost` と `127.0.0.1` を混在させないでください。この手順では `localhost` に統一します。
- 別の PC で使う場合も、その PC 上に上記の環境を用意します。この設定はインターネット公開用ではありません。

なお、現在のフロントは仮ログインです。バックエンド側の本物の認証 API への接続は別の開発項目で、
Docker を使わない起動設定だけでは対応しません。

## 品質確認

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

`npm run test` はテスト用の API データを使うため、Laravel・MySQL を起動せず実行できます。
これは画面遷移・セットアップ処理の確認です。実際の API との接続確認は、両方を起動して別途行います。

## 画面遷移

| URL                                  | 役割                   |
| ------------------------------------ | ---------------------- |
| `/login`                             | 仮ログイン             |
| `/signup`                            | 仮新規登録             |
| `/products`                          | 商品一覧               |
| `/products/:productId`               | 商品詳細               |
| `/checkout/:productId`               | 購入情報               |
| `/checkout/:productId/review`        | 購入確認               |
| `/purchases/:transactionId/complete` | 購入完了               |
| `/sell`                              | 商品出品               |
| `/sell/review`                       | 出品確認               |
| `/sell/sync/:productId`              | Minecraft 同期予定画面 |
| `/sell/complete/:productId`          | 出品完了               |
| `/mypage`                            | マイページ             |
| `/stores/:storeId`                   | 公開店舗               |
| `/store/manage`                      | 店舗管理               |

## ディレクトリ

```text
src/
├── api/          # Laravel API との通信
├── app/          # Router と簡易 Context
├── domain/       # 画面で使う型
├── features/     # 機能ごとのページ
├── layouts/      # 共通ヘッダー
├── mocks/        # 参考データ（現在の取得元ではありません）
└── shared/       # 共通 UI・CSS・表示関数
```

## デザインを作り始める場所

まずは `src/shared/styles` の CSS を編集してください。既存のクラス名をそのまま使えます。

- `tokens.css`: 共通の色・書体などの初期値
- `global.css`: 全体の文字・余白・フォーカス・読み上げ用表示
- `layout.css`: 共通ヘッダー・ナビゲーション・本文の配置
- `components.css`: ボタン・フォーム・手順・商品カードなどの共通部品
- `pages.css`: 各画面の配置と在庫表

必要なら画面の HTML 構造を `src/features/<機能名>/pages`、共通部品を `src/shared/ui` で調整します。
デザイン作業では、API 呼び出し（`src/api/products.ts`）、フォームの入力・送信・検証処理、
画面遷移（`src/app/router.tsx`・`src/app/paths.ts`）は変更しないでください。
入力ラベル、エラー表示、無効状態、キーボードのフォーカス表示も残してください。
