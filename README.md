# MineTenant Frontend

MineTenant の画面遷移を確認し、フロントエンド担当者がここから肉付けするための
Vite + React + TypeScript 製ワイヤーフレーム土台です。

> **以前の PoC とは別の独立プロジェクトです。**
> 旧 PoC のコード、CSS、UI 部品、3D 表現、バックエンド構成は流用していません。
> 今回の Figma にある画面遷移図とワイヤーフレームを起点に新規作成しています。

参照した Figma:
[画面遷移図／ワイヤーフレーム](https://www.figma.com/design/BPWjY8TuR2wPb7KJ2LdSvi/%E7%94%BB%E9%9D%A2%E9%81%B7%E7%A7%BB?node-id=15-418)

## この土台に含むもの

- 主要画面へ移動できる React Router の設定
- 商品一覧、購入、出品、マイページ、店舗、取引の基本画面
- 画面確認用の fixture と小さな Context
- 入力フォームの最低限のバリデーション
- PC・タブレット・スマートフォン向けの簡単な CSS
- 404、空状態、エラー境界

見た目は完成デザインではありません。白・薄いグレー・緑一色を使い、
配置と操作順が分かる程度に整えています。

## この土台に含まないもの

- 本物のログイン認証
- バックエンド API
- 決済、配送、画像アップロード
- データの永続化（リロードすると初期状態へ戻ります）
- Minecraft サーバーとの通信
- 3D 店舗プレビュー
- 完成版のコピー、アニメーション、デザイン

## セットアップ

推奨環境は Node.js 22、npm 10 以上です。

```bash
npm install
npm run dev
```

通常は <http://localhost:5173> で起動します。

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
├── app/          # Router と簡易 Context
├── domain/       # 画面で使う型
├── features/     # 機能ごとのページ
├── layouts/      # 共通ヘッダー
├── mocks/        # 画面確認用データ
└── shared/       # 共通 UI・CSS・表示関数
```

## 肉付けするときに触る場所

- 画面を変更: `src/features/<機能名>/pages`
- ルートを変更: `src/app/router.tsx` と `src/app/paths.ts`
- 商品や店舗の仮データを変更: `src/mocks/fixtures.ts`
- 共通ボタンや見出しを変更: `src/shared/ui`
- 色や余白を変更: `src/shared/styles`
- API を追加: `DemoStoreProvider` の処理をサービス層へ差し替える
- Minecraft 表示を追加: `StoreManagePage` の「Minecraft店舗」予定枠へ実装する

まず画面ごとに小さく担当を分け、共通 UI や型を変更するときだけメンバー間で
方針を合わせる想定です。
