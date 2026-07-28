import type {
  DemoSnapshot,
  Product,
  SessionUser,
  Store,
  Transaction,
  TransactionMessage,
} from '@/domain/models';

export const DEMO_USERS: SessionUser[] = [
  {
    id: 'user-buyer',
    name: '山田 みどり',
    role: 'buyer',
    roleLabel: '購入者デモ',
    avatarInitial: '山',
    storeId: 'store-yamada',
  },
  {
    id: 'user-seller',
    name: '青鉱舎 店長',
    role: 'seller',
    roleLabel: '出品者デモ',
    avatarInitial: 'M',
    storeId: 'store-mine',
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'product-hoodie',
    storeId: 'store-mine',
    sellerId: 'user-seller',
    name: 'コバルトブルーのパーカー',
    description:
      '深い青色と、ゆったりしたシルエットが特徴のパーカーです。普段使いしやすい厚さに仕上げました。',
    price: 6800,
    stock: 3,
    category: 'fashion',
    theme: 'ocean',
    emoji: '🧥',
    createdAt: '2026-07-18T09:00:00.000Z',
  },
  {
    id: 'product-stool',
    storeId: 'store-mine',
    sellerId: 'user-seller',
    name: '森の木製スツール',
    description:
      '天然木の表情を残して仕上げた小さなスツールです。椅子としても飾り台としても使えます。',
    price: 4200,
    stock: 2,
    category: 'interior',
    theme: 'forest',
    emoji: '🪵',
    createdAt: '2026-07-17T04:30:00.000Z',
  },
  {
    id: 'product-notebook',
    storeId: 'store-mine',
    sellerId: 'user-seller',
    name: 'エンチャント風ノート',
    description:
      '紫色の表紙に箔押しを施したハンドメイドノート。冒険の記録やアイデア帳におすすめです。',
    price: 1800,
    stock: 0,
    category: 'hobby',
    theme: 'amethyst',
    emoji: '📕',
    createdAt: '2026-07-16T12:00:00.000Z',
  },
  {
    id: 'product-pendant',
    storeId: 'store-yamada',
    sellerId: 'user-buyer',
    name: '鉱石モチーフペンダント',
    description:
      '光を受けてきらめく鉱石をイメージしたペンダントです。長さを調整できるコードを使用しています。',
    price: 3200,
    stock: 4,
    category: 'accessory',
    theme: 'sunset',
    emoji: '💎',
    createdAt: '2026-07-15T07:00:00.000Z',
  },
  {
    id: 'product-toolbag',
    storeId: 'store-yamada',
    sellerId: 'user-buyer',
    name: '手織りツールバッグ',
    description:
      '丈夫な帆布で作った道具入れです。内側を仕切り、細かな道具も迷子になりにくくしました。',
    price: 5800,
    stock: 1,
    category: 'tool',
    theme: 'sand',
    emoji: '👜',
    createdAt: '2026-07-14T03:15:00.000Z',
  },
  {
    id: 'product-lamp',
    storeId: 'store-yamada',
    sellerId: 'user-buyer',
    name: '苔むしたランタン',
    description:
      '森の遺跡に置かれたランタンをイメージした小型照明です。やわらかな暖色の光が広がります。',
    price: 7500,
    stock: 5,
    category: 'interior',
    theme: 'moss',
    emoji: '🏮',
    createdAt: '2026-07-13T10:45:00.000Z',
  },
];

export const INITIAL_STORES: Store[] = [
  {
    id: 'store-mine',
    ownerId: 'user-seller',
    name: 'BLUE ORE STUDIO',
    description: '青い鉱石を目印に、暮らしの道具と出会う店。',
    level: 3,
    points: 420,
    syncStatus: 'connected',
  },
  {
    id: 'store-yamada',
    ownerId: 'user-buyer',
    name: 'YAMADA CRAFT',
    description: '日常にひとつ、手仕事の温かさを。',
    level: 1,
    points: 40,
    syncStatus: 'connected',
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'transaction-demo',
    productId: 'product-stool',
    buyerId: 'user-buyer',
    sellerId: 'user-seller',
    source: 'minecraft',
    amount: 4200,
    status: 'shipping',
    createdAt: '2026-07-21T08:30:00.000Z',
  },
];

export const INITIAL_MESSAGES: TransactionMessage[] = [
  {
    id: 'message-1',
    transactionId: 'transaction-demo',
    senderId: 'user-seller',
    body: 'ご購入ありがとうございます。明日の発送を予定しています。',
    createdAt: '2026-07-21T08:34:00.000Z',
  },
  {
    id: 'message-2',
    transactionId: 'transaction-demo',
    senderId: 'user-buyer',
    body: 'ありがとうございます。到着を楽しみにしています！',
    createdAt: '2026-07-21T09:02:00.000Z',
  },
];

export function createInitialDemoSnapshot(): DemoSnapshot {
  return {
    schemaVersion: 1,
    currentUserId: DEMO_USERS[0].id,
    products: structuredClone(INITIAL_PRODUCTS),
    stores: structuredClone(INITIAL_STORES),
    transactions: structuredClone(INITIAL_TRANSACTIONS),
    messages: structuredClone(INITIAL_MESSAGES),
    listingDraft: null,
  };
}
