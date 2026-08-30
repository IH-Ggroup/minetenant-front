import type {
  SessionUser,
  PurchaseResult,
  CreateProductInput,
  Store,
  Product,
  Transaction,
  StoreDashboard,
} from '@/domain/models';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getuser(): Promise<SessionUser> {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: 'GET',
  });
  if (!response.ok) {
    throw new Error('仮ユーザーの取得に失敗しました');
  }
  const json = await response.json();

  if (!json.data?.length) {
    throw new Error('仮ユーザーが見つかりません');
  }

  return json.data[0];
}

/* 商品一覧を取得 */
export async function getProducts(storeId?: string): Promise<Product[]> {
  const params = new URLSearchParams();
  if (storeId) {
    params.set('storeId', storeId);
  }
  const query = params.toString();
  const response = await fetch(
    `${API_BASE_URL}/products${query ? `?${query}` : ''}`,
    {
      method: 'GET',
    },
  );
  if (!response.ok) {
    throw new Error('商品一覧の取得に失敗しました。');
  }
  const json = await response.json();
  return json.data;
}

/* 商品を出品  */
export async function createProduct(
  input: CreateProductInput,
): Promise<Product> {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    console.error('API: 商品作成失敗', response.status);
    throw new Error('商品の出品に失敗しました。');
  }
  const json = await response.json();
  return json.data;
}

/* 商品を購入  */
export async function purchaseProduct(
  productId: string,
  buyerId: string,
  requestId: string,
): Promise<PurchaseResult> {
  const response = await fetch(
    `${API_BASE_URL}/products/${encodeURIComponent(productId)}/purchases`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        buyerId,
        source: 'web',
        requestId,
      }),
    },
  );
  if (!response.ok) {
    throw new Error('商品の購入に失敗しました。');
  }
  const json = await response.json();
  return {
    ok: true,
    transactionId: json.data.id,
  };
}

/* 店舗情報を取得 */
export async function getStore(storeId: string): Promise<Store> {
  const response = await fetch(
    `${API_BASE_URL}/stores/${encodeURIComponent(storeId)}`,
    {
      method: 'GET',
    },
  );
  if (!response.ok) {
    throw new Error('店舗情報の取得に失敗しました。');
  }
  const json = await response.json();
  return json.data;
}

/* 店舗集計未使用 */
export async function getStoreDashboard(
  storeId: string,
): Promise<StoreDashboard> {
  const response = await fetch(
    `${API_BASE_URL}/stores/${encodeURIComponent(storeId)}/dashboard`,
    {
      method: 'GET',
    },
  );
  if (!response.ok) {
    throw new Error('店舗ダッシュボードの取得に失敗しました。');
  }
  const json = await response.json();
  return json.data;
}
/* 商品詳細 */
export async function getProduct(productId: string): Promise<Product> {
  const response = await fetch(
    `${API_BASE_URL}/products/${encodeURIComponent(productId)}`,
    {
      method: 'GET',
    },
  );

  if (!response.ok) {
    throw new Error('商品情報の取得に失敗しました。');
  }

  const json = await response.json();
  return json.data;
}

/* 取引履歴を取得 */
export async function getTransactions(userId: string): Promise<Transaction[]> {
  const response = await fetch(
    `${API_BASE_URL}/transactions?userId=${encodeURIComponent(userId)}`,
    {
      method: 'GET',
    },
  );
  if (!response.ok) {
    throw new Error('取引履歴の取得に失敗しました。');
  }
  const json = await response.json();
  return json.data;
}

// API戻ってくる前の画面について(isLoadingなど調べる)
