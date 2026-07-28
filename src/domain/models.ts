export type UserRole = 'buyer' | 'seller';

export type ProductCategory =
  'fashion' | 'interior' | 'hobby' | 'accessory' | 'tool';

export type ProductTheme =
  'ocean' | 'forest' | 'amethyst' | 'sunset' | 'sand' | 'moss';

export interface SessionUser {
  id: string;
  name: string;
  role: UserRole;
  roleLabel: string;
  avatarInitial: string;
  storeId: string;
}

export interface Product {
  id: string;
  storeId: string;
  sellerId: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: ProductCategory;
  theme: ProductTheme;
  emoji: string;
  createdAt: string;
}

export interface Store {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  level: number;
  points: number;
  syncStatus: 'connected' | 'syncing' | 'offline';
}

export type PurchaseSource = 'web' | 'minecraft';

export interface Transaction {
  id: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  source: PurchaseSource;
  amount: number;
  status: 'paid' | 'shipping' | 'complete';
  createdAt: string;
}

export interface CreateProductInput {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: ProductCategory;
  theme: ProductTheme;
  emoji: string;
}

export interface DemoSnapshot {
  schemaVersion: 1;
  currentUserId: string;
  products: Product[];
  stores: Store[];
  transactions: Transaction[];
  listingDraft: CreateProductInput | null;
}

export interface PurchaseResult {
  ok: boolean;
  error?: string;
  transactionId?: string;
}
