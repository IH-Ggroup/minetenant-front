import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { INITIAL_PRODUCTS } from '@/mocks/fixtures';

const BASE_URL = 'http://localhost:8787/api/v1';
const fetchMock = vi.fn<typeof fetch>();
let products: typeof import('./products');

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(async () => {
  vi.resetModules();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('VITE_API_BASE_URL', BASE_URL);
  document.cookie = 'XSRF-TOKEN=valid%2Btoken; Path=/';
  products = await import('./products');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  document.cookie = 'XSRF-TOKEN=; Max-Age=0; Path=/';
});

describe('Products API with authenticated ownership', () => {
  it('uses the public and protected GET URLs with encoded IDs and credentials', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ data: [] }));

    await products.getProducts();
    await products.getProducts('store /?');
    await products.getProduct('product /?');
    await products.getStore('store /?');
    await products.getStoreDashboard('store /?');
    await products.getTransactions();

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `${BASE_URL}/products`,
      `${BASE_URL}/products?storeId=store+%2F%3F`,
      `${BASE_URL}/products/product%20%2F%3F`,
      `${BASE_URL}/stores/store%20%2F%3F`,
      `${BASE_URL}/stores/store%20%2F%3F/dashboard`,
      `${BASE_URL}/transactions`,
    ]);
    for (const [, request] of fetchMock.mock.calls) {
      expect(request).toMatchObject({ method: 'GET', credentials: 'include' });
      expect(new Headers(request?.headers).get('Accept')).toBe(
        'application/json',
      );
    }
  });

  it('sends only listing fields, stripping even legacy owner IDs from an input object', async () => {
    const product = INITIAL_PRODUCTS[0];
    const input = {
      ...product,
      sellerId: 'spoofed-seller',
      storeId: 'spoofed-store',
    };
    fetchMock.mockResolvedValue(jsonResponse({ data: product }, 201));

    await expect(products.createProduct(input)).resolves.toEqual(product);

    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/products`);
    const request = fetchMock.mock.calls[0][1]!;
    expect(JSON.parse(request.body as string)).toEqual({
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      category: product.category,
      theme: product.theme,
      emoji: product.emoji,
    });
    expect(request).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(new Headers(request.headers).get('X-XSRF-TOKEN')).toBe(
      'valid+token',
    );
  });

  it('buys with only the stable request ID and maps the returned transaction', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { id: 'transaction-1' } }, 201),
    );

    await expect(
      products.purchaseProduct('product /?', 'stable-request-id'),
    ).resolves.toEqual({
      ok: true,
      transactionId: 'transaction-1',
    });

    expect(fetchMock.mock.calls[0][0]).toBe(
      `${BASE_URL}/products/product%20%2F%3F/purchases`,
    );
    const request = fetchMock.mock.calls[0][1]!;
    expect(JSON.parse(request.body as string)).toEqual({
      requestId: 'stable-request-id',
    });
    expect(request).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(new Headers(request.headers).get('X-XSRF-TOKEN')).toBe(
      'valid+token',
    );
  });

  it('preserves purchase failures instead of reporting success or retrying', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: '在庫切れです。', code: 'out_of_stock' }, 409),
    );

    await expect(
      products.purchaseProduct('product-1', 'same-id'),
    ).rejects.toMatchObject({
      status: 409,
      message: '在庫切れです。',
      code: 'out_of_stock',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
