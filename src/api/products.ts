import type {
  PurchaseResult,
  CreateProductInput,
  Store,
  Product,
  Transaction,
  StoreDashboard,
  StoreGrowth,
} from '@/domain/models';

import { apiRequest } from './client';

/* 商品一覧を取得 */
export async function getProducts(storeId?: string): Promise<Product[]> {
  const params = new URLSearchParams();
  if (storeId) {
    params.set('storeId', storeId);
  }
  const query = params.toString();
  const products = await apiRequest<Product[]>(
    `/products${query ? `?${query}` : ''}`,
  );
  products.forEach(validateProduct);
  return products;
}
//出品
export async function createProduct(
  input: CreateProductInput,
): Promise<Product> {
  // Ownership comes from the authenticated session, never from client IDs.
  const { requestId, name, description, price, category, theme, emoji } = input;
  return apiRequest<Product>('/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requestId,
      name,
      description,
      price,
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

/* requestIdから購入結果を取得 */
export async function getPurchaseByRequestId(
  requestId: string,
): Promise<Transaction> {
  return apiRequest<Transaction>(
    `/purchases/requests/${encodeURIComponent(requestId)}`,
  );
}

/* 店舗情報を取得 */
export async function getStore(storeId: string): Promise<Store> {
  return apiRequest<Store>(`/stores/${encodeURIComponent(storeId)}`);
}

/* 店舗集計 */
export async function getStoreDashboard(
  storeId: string,
): Promise<StoreDashboard> {
  return apiRequest<StoreDashboard>(
    `/stores/${encodeURIComponent(storeId)}/dashboard`,
  );
}

/* 商品詳細 */
export async function getProduct(productId: string): Promise<Product> {
  const product = await apiRequest<Product>(
    `/products/${encodeURIComponent(productId)}`,
  );
  validateProduct(product);
  return product;
}

/* 取引履歴を取得 */
export async function getTransactions(): Promise<Transaction[]> {
  return apiRequest<Transaction[]>('/transactions');
}

/* 取引詳細を取得 */
export async function getTransaction(
  transactionId: string,
): Promise<Transaction> {
  return apiRequest<Transaction>(
    `/transactions/${encodeURIComponent(transactionId)}`,
  );
}

function validateProduct(product: Product): Product {
  if (product.status !== 'available' && product.status !== 'sold') {
    throw new Error(`Invalid product status: ${product.status}`);
  }
  return product;
}
/* 店舗成長情報を取得 */
export async function getStoreGrowth(storeId: string): Promise<StoreGrowth> {
  return apiRequest<StoreGrowth>(
    `/stores/${encodeURIComponent(storeId)}/growth`,
  );
}
