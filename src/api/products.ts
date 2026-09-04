import type {
  PurchaseResult,
  CreateProductInput,
  Store,
  Product,
  Transaction,
  StoreDashboard,
} from '@/domain/models';

import { apiRequest } from './client';

/* 商品一覧を取得 */
export async function getProducts(storeId?: string): Promise<Product[]> {
  const params = new URLSearchParams();
  if (storeId) {
    params.set('storeId', storeId);
  }
  const query = params.toString();
  return apiRequest<Product[]>(`/products${query ? `?${query}` : ''}`);
}

/* 商品を出品  */
export async function createProduct(
  input: CreateProductInput,
): Promise<Product> {
  // Ownership comes from the authenticated session, never from client IDs.
  const { name, description, price, stock, category, theme, emoji } = input;
  return apiRequest<Product>('/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      description,
      price,
      stock,
      category,
      theme,
      emoji,
    }),
  });
}

/* 商品を購入  */
export async function purchaseProduct(
  productId: string,
  requestId: string,
): Promise<PurchaseResult> {
  const transaction = await apiRequest<Transaction>(
    `/products/${encodeURIComponent(productId)}/purchases`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId,
      }),
    },
  );
  return {
    ok: true,
    transactionId: transaction.id,
  };
}

/* 店舗情報を取得 */
export async function getStore(storeId: string): Promise<Store> {
  return apiRequest<Store>(`/stores/${encodeURIComponent(storeId)}`);
}

/* 店舗集計未使用 */
export async function getStoreDashboard(
  storeId: string,
): Promise<StoreDashboard> {
  return apiRequest<StoreDashboard>(
    `/stores/${encodeURIComponent(storeId)}/dashboard`,
  );
}
/* 商品詳細 */
export async function getProduct(productId: string): Promise<Product> {
  return apiRequest<Product>(`/products/${encodeURIComponent(productId)}`);
}

/* 取引履歴を取得 */
export async function getTransactions(): Promise<Transaction[]> {
  return apiRequest<Transaction[]>('/transactions');
}
