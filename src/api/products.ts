import type {
  SessionUser,
  PurchaseResult,
  CreateProductInput,
  Store,
  Product,
} from '@/domain/models';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 仮でユーザー情報取得(未使用)
export async function users(
  email: string,
  password: string,
): Promise<SessionUser> {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });
  if (!response.ok) {
    throw new Error('ログインに失敗しました');
  }
  const json = await response.json();
  return json.data;
}

/* login未使用 */
export async function login(
  email: string,
  password: string,
): Promise<SessionUser> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });
  if (!response.ok) {
    throw new Error('ログインに失敗しました');
  }
  return response.json() as Promise<SessionUser>;
}

/* register未使用 */
export async function register(
  email: string,
  password: string,
): Promise<SessionUser> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });
  if (!response.ok) {
    throw new Error('ユーザー登録に失敗しました。');
  }
  return response.json() as Promise<SessionUser>;
}

/* logout未使用 */
export async function logout(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('ログアウトに失敗しました。');
  }
}

/* 商品一覧を取得 後で店舗→店舗の商品一覧にも使う */
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

/* 商品を削除未使用 */
export async function deleteProduct(productId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/products/${encodeURIComponent(productId)}`,
    {
      method: 'DELETE',
    },
  );
  if (!response.ok) {
    throw new Error('商品の削除に失敗しました。');
  }
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

/* 店舗情報を取得未使用 */
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
