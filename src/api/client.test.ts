import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const BASE_URL = 'http://localhost:8787/api/v1';
const fetchMock = vi.fn<typeof fetch>();
let client: typeof import('./client');

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function requestAt(index: number): RequestInit {
  return fetchMock.mock.calls[index][1]!;
}

beforeEach(async () => {
  vi.resetModules();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('VITE_API_BASE_URL', BASE_URL);
  document.cookie = 'XSRF-TOKEN=; Max-Age=0; Path=/';
  client = await import('./client');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  document.cookie = 'XSRF-TOKEN=; Max-Age=0; Path=/';
});

describe('API client', () => {
  it('uses the configured base URL and includes cookies and JSON Accept on GET', async () => {
    vi.stubEnv('VITE_API_BASE_URL', `${BASE_URL}/`);
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: 'product-1' } }));

    await expect(client.apiRequest('/products/product-1')).resolves.toEqual({
      id: 'product-1',
    });

    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/products/product-1`);
    expect(requestAt(0)).toMatchObject({
      method: 'GET',
      credentials: 'include',
    });
    const headers = new Headers(requestAt(0).headers);
    expect(headers.get('Accept')).toBe('application/json');
    expect(headers.has('Authorization')).toBe(false);
    expect(headers.has('X-XSRF-TOKEN')).toBe(false);
  });

  it('initializes missing CSRF cookies under /api/v1 and decodes the write header', async () => {
    fetchMock
      .mockImplementationOnce(async () => {
        document.cookie = 'XSRF-TOKEN=first%2Btoken%2Fvalue%3D; Path=/';
        return new Response(null, { status: 204 });
      })
      .mockResolvedValueOnce(jsonResponse({ data: { id: 'created' } }, 201));

    await client.apiRequest('/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '商品' }),
    });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `${BASE_URL}/auth/csrf-cookie`,
      `${BASE_URL}/products`,
    ]);
    expect(requestAt(0).method).toBe('GET');
    expect(new Headers(requestAt(1).headers).get('X-XSRF-TOKEN')).toBe(
      'first+token/value=',
    );
    expect(new Headers(requestAt(1).headers).get('Content-Type')).toBe(
      'application/json',
    );
    for (const [, request] of fetchMock.mock.calls) {
      expect(request?.credentials).toBe('include');
      expect(new Headers(request?.headers).get('Accept')).toBe(
        'application/json',
      );
    }
  });

  it('reads rotated cookies on every write and handles empty 204 responses', async () => {
    document.cookie = 'XSRF-TOKEN=before%3D; Path=/';
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(
      client.apiRequest('/first', { method: 'POST' }),
    ).resolves.toBeUndefined();
    document.cookie = 'XSRF-TOKEN=after%2Brotation%3D; Path=/';
    await expect(
      client.apiRequest('/second', { method: 'DELETE' }),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new Headers(requestAt(0).headers).get('X-XSRF-TOKEN')).toBe(
      'before=',
    );
    expect(new Headers(requestAt(1).headers).get('X-XSRF-TOKEN')).toBe(
      'after+rotation=',
    );
  });

  it('does not send a write when a successful CSRF initialization yields no readable cookie', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(
      client.apiRequest('/products', { method: 'POST' }),
    ).rejects.toMatchObject({
      status: 419,
      code: 'CSRF_COOKIE_MISSING',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/auth/csrf-cookie`);
  });

  it('preserves status, backend code and field validation errors', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          message: '入力内容を確認してください。',
          code: 'invalid_purchase',
          errors: { email: ['入力が必要です。'], malformed: 'not an array' },
        },
        422,
      ),
    );

    const error = await client
      .apiRequest('/products')
      .catch((value: unknown) => value);
    expect(error).toBeInstanceOf(client.ApiError);
    expect(error).toMatchObject({
      status: 422,
      message: '入力内容を確認してください。',
      code: 'invalid_purchase',
      errors: { email: ['入力が必要です。'] },
    });
  });

  it('notifies unauthorized subscribers, supports unsubscribe, and can suppress restoration notifications', async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse({ message: 'Unauthenticated.' }, 401),
    );
    const listener = vi.fn();
    const unsubscribe = client.onUnauthorized(listener);

    await expect(client.apiRequest('/transactions')).rejects.toMatchObject({
      status: 401,
    });
    expect(listener).toHaveBeenCalledOnce();
    await expect(
      client.apiRequest('/auth/me', { notifyUnauthorized: false }),
    ).rejects.toMatchObject({ status: 401 });
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
    await expect(client.apiRequest('/transactions')).rejects.toMatchObject({
      status: 401,
    });
    expect(listener).toHaveBeenCalledOnce();
  });

  it('returns a clear 419 without replaying the POST and refreshes CSRF only on the next explicit write', async () => {
    document.cookie = 'XSRF-TOKEN=expired; Path=/';
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: 'CSRF token mismatch.' }, 419),
    );

    await expect(
      client.apiRequest('/products/1/purchases', { method: 'POST' }),
    ).rejects.toMatchObject({
      status: 419,
      code: 'CSRF_TOKEN_MISMATCH',
      message: expect.stringContaining('再度ログイン'),
    });
    expect(fetchMock).toHaveBeenCalledOnce();

    fetchMock
      .mockImplementationOnce(async () => {
        document.cookie = 'XSRF-TOKEN=refreshed; Path=/';
        return new Response(null, { status: 204 });
      })
      .mockResolvedValueOnce(jsonResponse({ data: { id: 'transaction-1' } }));

    await client.apiRequest('/products/1/purchases', { method: 'POST' });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `${BASE_URL}/products/1/purchases`,
      `${BASE_URL}/auth/csrf-cookie`,
      `${BASE_URL}/products/1/purchases`,
    ]);
    expect(new Headers(requestAt(2).headers).get('X-XSRF-TOKEN')).toBe(
      'refreshed',
    );
  });

  it('returns a network ApiError and never automatically retries a failed write', async () => {
    document.cookie = 'XSRF-TOKEN=valid; Path=/';
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      client.apiRequest('/products', { method: 'POST' }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
      code: 'NETWORK_ERROR',
      errors: {},
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('keeps non-JSON HTTP failures distinct from network failures', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html>unavailable</html>', { status: 503 }),
    );
    await expect(client.apiRequest('/products')).rejects.toMatchObject({
      name: 'ApiError',
      status: 503,
    });
  });

  it('rejects malformed success envelopes', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ unexpected: [] }));
    await expect(client.apiRequest('/products')).rejects.toMatchObject({
      status: 200,
      code: 'INVALID_RESPONSE',
    });
  });
});
