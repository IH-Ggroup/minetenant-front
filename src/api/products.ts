import type {
  SessionUser,
  PurchaseResult,
  CreateProductInput,
  Store,
  Product,
} from '@/domain/models';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/* login */
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

/* register */
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

/* logout */
export async function logout(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('ログアウトに失敗しました。');
  }
}

/* 商品一覧を取得 */
export async function getProducts(): Promise<Product[]> {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('商品一覧の取得に失敗しました。');
  }

  return response.json() as Promise<Product[]>;
}

/* 商品詳細を取得 */
export async function getProduct(productId: string): Promise<Product> {
  const response = await fetch(
    `${API_BASE_URL}/products/${encodeURIComponent(productId)}`,
    {
      method: 'GET',
    },
  );
  if (!response.ok) {
    throw new Error('商品詳細の取得に失敗しました。');
  }
  return response.json() as Promise<Product>;
}

/* 商品を出品 */
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
    throw new Error('商品の出品に失敗しました。');
  }
  return response.json() as Promise<Product>;
}

/* 商品を削除 */
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

/* 商品を検索 */
export async function searchProducts(keyword: string): Promise<Product[]> {
  const params = new URLSearchParams({
    keyword,
  });
  const response = await fetch(
    `${API_BASE_URL}/products?${params.toString()}`,
    {
      method: 'GET',
    },
  );
  if (!response.ok) {
    throw new Error('商品の検索に失敗しました。');
  }
  return response.json() as Promise<Product[]>;
}

/* 商品を購入 */
export async function purchaseProduct(
  productId: string,
): Promise<PurchaseResult> {
  const response = await fetch(
    `${API_BASE_URL}/products/${encodeURIComponent(productId)}/purchase`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
  if (!response.ok) {
    throw new Error('商品の購入に失敗しました。');
  }
  return response.json() as Promise<PurchaseResult>;
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
  return response.json() as Promise<Store>;
}
