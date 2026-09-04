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

## セットアップ

推奨環境は Node.js 22、npm 10 以上です。

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local` の `VITE_API_BASE_URL` は `http://localhost:8787/api/v1` が初期値です。
Laravel API を別途 `localhost:8787` で起動してください。接続先が異なる場合はこの値を変更します。

フロントエンドは通常 [http://localhost:5173](http://localhost:5173) で起動します。

## 品質確認

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

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
