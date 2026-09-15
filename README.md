# MineTenant Frontend

MineTenant の画面遷移と API 連携を残し、デザイン担当者がここから見た目を作るための
Vite + React + TypeScript 製の土台です。

> 今回の Figma にある画面遷移図とワイヤーフレームを起点に新規作成しています。

## この土台に含むもの

- 主要画面へ移動できる React Router の設定
- 商品一覧、購入、出品、マイページ、店舗、取引の基本画面
- 共通の `src/api/client.ts` を通じた Hono API への接続
- Cookie を使うログイン・新規登録・ログアウト・ログイン状態の復元
- ログインユーザーと出品下書きを持つ小さな Context
- 入力フォームの最低限のバリデーション
- 操作に必要な余白・フォーム・現在地表示だけの最小限の CSS
- 404、空状態、エラー境界

見た目は意図的に、ほぼ未装飾にしています。ブラウザ標準のボタン・リンクと縦並びを基本に、
色、カード、画像枠、アニメーションなどの完成デザインは入れていません。

## この土台に含まないもの

- メール認証・パスワード再設定
- バックエンド本体（別途 Hono API の起動が必要）
- 決済、配送、画像アップロード
- 出品下書きの永続化（リロード・ログアウトすると失われます）
- Minecraft サーバーとの通信
- 3D 店舗プレビュー
- 完成版のコピー、アニメーション、デザイン

API に保存した商品・取引データはバックエンド側に残ります。
`src/mocks/fixtures.ts` は参考データであり、現在の画面のデータ取得元ではありません。

## Docker を使わずに動かす

フロントとHonoバックエンドはNode.js、データベースはMySQLをPCに入れて動かします。
Docker Desktopや旧PoCのプロジェクトは不要です。

### 初回だけ行うこと

1. Node.js 22.22.2（推奨）とnpm 10以上、MySQL 8.4をインストールします。
   `node -v`、`npm -v`、`mysql --version`で確認できます。利用できるNode.jsの正確な範囲は
   [`package.json`](package.json) の `engines` を確認してください。
2. [バックエンドのREADME](https://github.com/IH-Ggroup/minetenant-backend/blob/develop/README.md)に沿って、
   MySQLの開発用DBを準備します。続けて、バックエンドのフォルダで初回セットアップを行います。

   ```bash
   npm ci
   npm run setup
   ```

3. このフロントのフォルダで初回セットアップを行います。

```bash
npm ci
npm run setup
```

フロントの`npm run setup`は`.env.example`をコピーして`.env.local`を作成します。
Windows / macOS / Linux共通のコマンドです。既存の`.env.local`は上書きしません。

接続先の初期値は次のとおりです。接続先を変えた場合は Vite を再起動してください。

```env
VITE_API_BASE_URL=http://localhost:8787/api/v1
```

### 開発するたびに行うこと

起動する順番は **MySQL → Hono → Vite** です。

1. PCにインストールしたMySQLを起動します（方法は
   [バックエンドのREADME](https://github.com/IH-Ggroup/minetenant-backend/blob/develop/README.md)を参照）。
2. ターミナルを開き、**バックエンドのフォルダ**でHono APIを起動します。

   ```bash
   npm run dev
   ```

3. ブラウザで[http://localhost:8787/api/hello](http://localhost:8787/api/hello)を開き、
   `MineTenant API is running.`と表示されることを確認します。
4. 別のターミナルを開き、**このフロントのフォルダ**でViteを起動します。

   ```bash
   npm run dev
   ```

5. [http://localhost:5173](http://localhost:5173)をブラウザで開きます。

HonoとViteのターミナルは開いたままにします。終了するときは、それぞれのターミナルで
`Ctrl + C`を押してください。その後、普段使っている方法でMySQLを停止します。

フロントの`.env.local`に必要なのは`VITE_API_BASE_URL`だけです。MySQLのユーザー名・パスワードや
Minecraft用トークンは書かず、Gitにも追加しません。DBへの接続はHonoが担当します。

### 起動に困ったとき

- 画面に「APIの接続先が未設定です」と表示される：`.env.local`がない場合は、フロントのフォルダで
  `npm run setup`を実行します。ある場合は`VITE_API_BASE_URL`の名前と値を確認します。変更後はViteを
  `Ctrl + C`で止め、`npm run dev`で再起動してください。
- 画面に「APIに接続できません」と表示される：
  [http://localhost:8787/api/hello](http://localhost:8787/api/hello)を直接開きます。表示できない場合は、
  MySQL、Honoの順に起動し、Hono側のターミナルに出たエラーを確認してください。
- `Port 5173 is already in use`：既に起動しているフロントを終了してから再実行します。
- `Port 8787 is already in use`：以前起動したAPIを終了します。別のAPIを8787番で同時に起動できません。
- CookieやCORSのエラーになる：`localhost`と`127.0.0.1`を混在させていないか確認します。
  この手順では`localhost`に統一します。Honoへ切り替えた直後は一度ログインし直してください。
- 別のPCで使う場合も、そのPC上に上記の環境を用意します。この設定はインターネット公開用ではありません。

### ログインして動かす

バックエンドの初期データを入れた場合、購入者は `demo@minetenant.jp`、出品者は
`seller@minetenant.jp`、パスワードはいずれも `password` です（ローカル開発専用）。
新規登録画面で自分のテスト用アカウントを作ることもできます。登録時には店舗も作られます。
メールアドレス・パスワードを省略した仮ログインはできません。

- 認証通信は `src/api/auth.ts`、商品などの通信は `src/api/products.ts` にあります。
- Cookie と CSRF ヘッダーの処理は `src/api/client.ts` にまとめています。
- 再読み込み時には `/auth/me` でログイン状態を確認します。パスワード・認証トークンは localStorage に保存しません。
- 出品・購入・マイページ・店舗管理はログインが必要です。ログイン後は元の画面へ戻ります。
- 401 ではログイン状態を解除し、ログイン必須の画面ならログイン画面へ戻ります。419 では再操作・再ログインを案内し、購入や出品を自動再送しません。
- ログアウトはヘッダーまたはマイページのボタンから行います。通信に失敗した場合は成功扱いにしません。

`DemoStoreProvider`は既存ページとの互換性のため名前を残していますが、ユーザーの認証はHonoが担当します。
この変更は決済・配送・Minecraft側の認証を実装するものではなく、インターネット公開用の設定でもありません。

## 品質確認

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

`npm run test`はテスト用のAPIデータを使うため、Hono・MySQLを起動せず実行できます。
これは画面遷移・認証状態・APIクライアント・セットアップ処理の確認です。
実際の API との接続確認は、両方を起動して別途行います。

## 画面遷移

| URL                                  | 役割                   |
| ------------------------------------ | ---------------------- |
| `/login`                             | ログイン               |
| `/signup`                            | 新規登録               |
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
├── api/          # Hono API との通信
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
