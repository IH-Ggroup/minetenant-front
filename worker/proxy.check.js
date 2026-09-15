import { afterEach, describe, expect, it, vi } from 'vitest';

import { handleRequest } from './index.js';

const FRONTEND = 'https://minetenant-front.example.workers.dev';
const ORIGIN = 'https://demo-tunnel.trycloudflare.com';
const TOKEN = 'test-origin-token-'.repeat(3);

function env(overrides = {}) {
  return {
    API_ORIGIN: ORIGIN,
    API_ORIGIN_TOKEN: TOKEN,
    ASSETS: { fetch: vi.fn(async () => new Response('<html>frontend</html>')) },
    ...overrides,
  };
}

function request(path = '/api/v1/products', init = {}) {
  return new Request(FRONTEND + path, init);
}

function json(value = { data: [] }, init = {}) {
  return new Response(JSON.stringify(value), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
}

afterEach(() => vi.useRealTimers());

describe('Cloudflare same-origin Laravel bridge', () => {
  it('serves frontend routes via the SPA assets binding without an API origin', async () => {
    const bindings = env({ API_ORIGIN: undefined });
    const fetcher = vi.fn();
    const response = await handleRequest(request('/login'), bindings, fetcher);
    expect(await response.text()).toContain('frontend');
    expect(bindings.ASSETS.fetch).toHaveBeenCalledOnce();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    '/api',
    '/api/hello',
    '/api/v1/minecraft/catalog',
    '/api/v1/minecraft/purchases',
    '/api/v1/users',
    '/api/v1/products/a%2fb',
    '/api/v1/products/..%2fauth/login',
    '/api/v1/products//evil.test',
    '/api/v1/products/x/other',
  ])('does not expose an unlisted API route: %s', async (path) => {
    const fetcher = vi.fn();
    const response = await handleRequest(request(path), env(), fetcher);
    expect(response.status).toBe(404);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('does not expose unlisted methods', async () => {
    const response = await handleRequest(
      request('/api/v1/products', { method: 'DELETE' }),
      env(),
      vi.fn(),
    );
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('GET, HEAD, POST');
  });

  it.each([
    undefined,
    'http://demo-tunnel.trycloudflare.com',
    'https://localhost',
    'https://trycloudflare.com',
    'https://demo.trycloudflare.com.evil.test',
    'https://a.b.trycloudflare.com',
    'https://user:pass@demo.trycloudflare.com',
    'https://demo.trycloudflare.com:8080',
    'https://demo.trycloudflare.com/path',
    'https://demo.trycloudflare.com?other=1',
  ])('fails closed with an invalid origin: %s', async (origin) => {
    const fetcher = vi.fn();
    const response = await handleRequest(
      request(),
      env({ API_ORIGIN: origin }),
      fetcher,
    );
    expect(response.status).toBe(503);
    expect(fetcher).not.toHaveBeenCalled();
    expect(await response.text()).not.toContain(TOKEN);
  });

  it.each([undefined, '', 'short', 's'.repeat(32) + '\n'])(
    'requires a configured origin secret',
    async (token) => {
      const fetcher = vi.fn();
      const response = await handleRequest(
        request(),
        env({ API_ORIGIN_TOKEN: token }),
        fetcher,
      );
      expect(response.status).toBe(503);
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it('preserves path, query, payload, CSRF and cookies without forwarding spoofable headers', async () => {
    const fetcher = vi.fn(async () =>
      json({ data: { id: 'p-1' } }, { status: 201 }),
    );
    const response = await handleRequest(
      request('/api/v1/products?storeId=store-1', {
        method: 'POST',
        headers: {
          Origin: FRONTEND,
          'Content-Type': 'application/json',
          Cookie: 'minetenant_session=secret; XSRF-TOKEN=csrf',
          'X-XSRF-TOKEN': 'csrf',
          'X-MineTenant-Origin-Token': 'forged',
          'X-Forwarded-Host': 'evil.test',
          'X-Forwarded-For': 'spoof',
          'X-MineTenant-Client-IP': '198.51.100.9',
          Authorization: 'Bearer unwanted',
          'X-HTTP-Method-Override': 'DELETE',
          Host: 'evil.test',
        },
        body: JSON.stringify({ name: '商品' }),
      }),
      env(),
      fetcher,
    );
    expect(response.status).toBe(201);
    const [target, options] = fetcher.mock.calls[0];
    expect(target.href).toBe(ORIGIN + '/api/v1/products?storeId=store-1');
    expect(new TextDecoder().decode(options.body)).toBe('{"name":"商品"}');
    expect(options.headers.get('X-XSRF-TOKEN')).toBe('csrf');
    expect(options.headers.get('Cookie')).toContain(
      'minetenant_session=secret',
    );
    expect(options.headers.get('X-MineTenant-Origin-Token')).toBe(TOKEN);
    expect(options.headers.get('X-Forwarded-Host')).toBe(
      new URL(FRONTEND).host,
    );
    expect(options.headers.get('X-Forwarded-Proto')).toBe('https');
    expect(options.headers.get('X-Forwarded-For')).toBeNull();
    expect(options.headers.get('X-MineTenant-Client-IP')).toBeNull();
    expect(options.headers.get('Authorization')).toBeNull();
    expect(options.headers.get('X-HTTP-Method-Override')).toBeNull();
    expect(options.headers.get('Host')).toBeNull();
    expect(options.redirect).toBe('manual');
    expect(options.cache).toBe('no-store');
    // workerd rejects cacheTtl (including zero) together with cache:no-store.
    expect(options.cf).toBeUndefined();
    expect(await response.json()).toEqual({ data: { id: 'p-1' } });
  });

  it.each([undefined, 'https://evil.test', 'null'])(
    'rejects a write from an untrusted Origin %s',
    async (origin) => {
      const fetcher = vi.fn();
      const response = await handleRequest(
        request('/api/v1/auth/logout', {
          method: 'POST',
          headers: origin === undefined ? {} : { Origin: origin },
        }),
        env(),
        fetcher,
      );
      expect(response.status).toBe(403);
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it.each(['203.0.113.8', '2001:db8::8'])(
    'forwards only the Cloudflare-assigned valid client IP %s',
    async (clientIp) => {
      const fetcher = vi.fn(async () => json());
      await handleRequest(
        request('/api/v1/products', {
          headers: {
            'CF-Connecting-IP': clientIp,
            'X-Forwarded-For': 'attacker',
            'X-MineTenant-Client-IP': '198.51.100.9',
          },
        }),
        env(),
        fetcher,
      );
      expect(
        fetcher.mock.calls[0][1].headers.get('X-MineTenant-Client-IP'),
      ).toBe(clientIp);
      expect(
        fetcher.mock.calls[0][1].headers.get('X-Forwarded-For'),
      ).toBeNull();
    },
  );

  it.each([
    'attacker',
    '999.0.0.1',
    '203.0.113.8, 10.0.0.1',
    '::invalid',
    '2001:db8:::1',
  ])('rejects a malformed client IP %s', async (clientIp) => {
    const fetcher = vi.fn(async () => json());
    await handleRequest(
      request('/api/v1/products', {
        headers: {
          'CF-Connecting-IP': clientIp,
          'X-Forwarded-For': 'attacker',
        },
      }),
      env(),
      fetcher,
    );
    expect(fetcher.mock.calls[0][1].headers.get('X-Forwarded-For')).toBeNull();
    expect(
      fetcher.mock.calls[0][1].headers.get('X-MineTenant-Client-IP'),
    ).toBeNull();
  });

  it('rejects cross-site fetch metadata even if the Origin was forged', async () => {
    const response = await handleRequest(
      request('/api/v1/auth/login', {
        method: 'POST',
        headers: { Origin: FRONTEND, 'Sec-Fetch-Site': 'cross-site' },
      }),
      env(),
      vi.fn(),
    );
    expect(response.status).toBe(403);
  });

  it('rejects form data rather than allowing method-override forms', async () => {
    const response = await handleRequest(
      request('/api/v1/products', {
        method: 'POST',
        headers: { Origin: FRONTEND },
        body: '_method=DELETE',
      }),
      env(),
      vi.fn(),
    );
    expect(response.status).toBe(415);
  });

  it('accepts a logout POST represented by an empty stream without Content-Type', async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 204 }));
    const logoutRequest = request('/api/v1/auth/logout', {
      method: 'POST',
      headers: { Origin: FRONTEND, 'X-XSRF-TOKEN': 'csrf' },
      body: new ReadableStream({
        start(controller) {
          controller.close();
        },
      }),
      duplex: 'half',
    });
    expect(logoutRequest.body).not.toBeNull();
    const response = await handleRequest(logoutRequest, env(), fetcher);
    expect(response.status).toBe(204);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][1].body.byteLength).toBe(0);
    expect(fetcher.mock.calls[0][1].headers.get('Content-Type')).toBeNull();
    expect(fetcher.mock.calls[0][1].headers.get('X-XSRF-TOKEN')).toBe('csrf');
  });

  it('bounds the body even without a Content-Length header', async () => {
    const fetcher = vi.fn();
    const response = await handleRequest(
      request('/api/v1/products', {
        method: 'POST',
        headers: { Origin: FRONTEND, 'Content-Type': 'application/json' },
        body: 'a'.repeat(64 * 1024 + 1),
      }),
      env(),
      fetcher,
    );
    expect(response.status).toBe(413);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('preserves separate Laravel cookies and expiration but rewrites their public scope', async () => {
    const upstreamHeaders = new Headers();
    upstreamHeaders.append(
      'Set-Cookie',
      'XSRF-TOKEN=csrf%3D; expires=Fri, 04 Sep 2026 12:00:00 GMT; Max-Age=7200; path=/api; domain=demo-tunnel.trycloudflare.com; samesite=none',
    );
    upstreamHeaders.append(
      'Set-Cookie',
      'minetenant_session=session; Max-Age=0; path=/; HttpOnly; Secure; SameSite=Strict',
    );
    upstreamHeaders.set('Access-Control-Allow-Origin', 'https://other.test');
    upstreamHeaders.set('X-Powered-By', 'PHP');
    const fetcher = vi.fn(
      async () => new Response(null, { status: 204, headers: upstreamHeaders }),
    );
    const response = await handleRequest(
      request('/api/v1/auth/csrf-cookie'),
      env(),
      fetcher,
    );
    const cookies = response.headers.getSetCookie();
    expect(response.status).toBe(204);
    expect(cookies).toHaveLength(2);
    expect(cookies[0]).toContain('expires=Fri, 04 Sep 2026 12:00:00 GMT');
    expect(cookies[0]).not.toContain('HttpOnly');
    expect(cookies[1]).toContain('HttpOnly');
    expect(cookies[1]).toContain('Max-Age=0');
    for (const cookie of cookies) {
      expect(cookie).not.toMatch(/domain=/i);
      expect(cookie).toContain('Path=/; Secure; SameSite=Lax');
    }
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(response.headers.get('X-Powered-By')).toBeNull();
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(response.headers.get('Cloudflare-CDN-Cache-Control')).toBe(
      'no-store',
    );
  });

  it.each([401, 403, 404, 409, 419, 422, 429])(
    'preserves Laravel JSON errors and status %s',
    async (status) => {
      const payload = {
        message: '入力を確認してください。',
        errors: { email: ['必須です。'] },
      };
      const fetcher = vi.fn(async () =>
        json(payload, { status, headers: { 'Retry-After': '30' } }),
      );
      const response = await handleRequest(request(), env(), fetcher);
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual(payload);
      expect(response.headers.get('Retry-After')).toBe('30');
    },
  );

  it.each([301, 302, 307, 308])(
    'never follows or returns an upstream redirect %s',
    async (status) => {
      const fetcher = vi.fn(
        async () =>
          new Response(null, {
            status,
            headers: { Location: 'https://evil.test' },
          }),
      );
      const response = await handleRequest(request(), env(), fetcher);
      expect(response.status).toBe(502);
      expect(fetcher).toHaveBeenCalledOnce();
      expect(response.headers.get('Location')).toBeNull();
    },
  );

  it.each([200, 502])(
    'hides upstream HTML and internal errors, status %s',
    async (status) => {
      const fetcher = vi.fn(
        async () =>
          new Response('<html>private stack trace</html>', {
            status,
            headers: { 'Content-Type': 'text/html' },
          }),
      );
      const response = await handleRequest(request(), env(), fetcher);
      expect(response.status).toBe(502);
      expect(await response.text()).not.toContain('private stack trace');
    },
  );

  it('returns a useful JSON error if the local PC or tunnel is offline', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('secret upstream detail');
    });
    const response = await handleRequest(request(), env(), fetcher);
    expect(response.status).toBe(502);
    const payload = await response.json();
    expect(payload.code).toBe('API_UNAVAILABLE');
    expect(payload.message).toContain('公開用PC');
    expect(JSON.stringify(payload)).not.toContain('secret');
  });

  it('aborts the upstream request after the configured timeout', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(
      (_target, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () =>
            reject(new Error('aborted')),
          );
        }),
    );
    const responsePromise = handleRequest(
      request(),
      env({ API_TIMEOUT_MS: '1000' }),
      fetcher,
    );
    await vi.advanceTimersByTimeAsync(1001);
    expect((await responsePromise).status).toBe(502);
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
  });
});
