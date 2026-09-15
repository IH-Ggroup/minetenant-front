/**
 * Same-origin bridge for the public demo. The Laravel server is reachable only
 * through a token-protected local gateway, never by exposing `artisan serve`.
 * API_ORIGIN and API_ORIGIN_TOKEN are Worker runtime secrets, not VITE_ values.
 */
const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const RESOURCE_ID = '[A-Za-z0-9_-]{1,100}';
const ROUTES = [
  [/^\/api\/v1\/auth\/(csrf-cookie|me)$/, ['GET', 'HEAD']],
  [/^\/api\/v1\/auth\/(register|login|logout)$/, ['POST']],
  [/^\/api\/v1\/products$/, ['GET', 'HEAD', 'POST']],
  [new RegExp(`^/api/v1/products/${RESOURCE_ID}$`), ['GET', 'HEAD']],
  [new RegExp(`^/api/v1/products/${RESOURCE_ID}/purchases$`), ['POST']],
  [new RegExp(`^/api/v1/stores/${RESOURCE_ID}(/dashboard)?$`), ['GET', 'HEAD']],
  [/^\/api\/v1\/transactions$/, ['GET', 'HEAD']],
];

function privateHeaders() {
  return new Headers({
    'Cache-Control': 'no-store, private, max-age=0',
    'Cloudflare-CDN-Cache-Control': 'no-store',
    'CDN-Cache-Control': 'no-store',
    Pragma: 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    Vary: 'Cookie, Origin',
  });
}

function problem(status, code, message, extraHeaders = {}) {
  const headers = privateHeaders();
  headers.set('Content-Type', 'application/json; charset=utf-8');
  for (const [name, value] of Object.entries(extraHeaders)) {
    headers.set(name, value);
  }
  return new Response(JSON.stringify({ message, code }), { status, headers });
}

function configuration(env) {
  try {
    const origin = new URL(env.API_ORIGIN);
    // Restrict this temporary bridge to the advertised Cloudflare Quick Tunnel.
    // A future permanent backend should explicitly extend this allowlist.
    if (
      origin.protocol !== 'https:' ||
      !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.trycloudflare\.com$/.test(
        origin.hostname,
      ) ||
      origin.port ||
      origin.username ||
      origin.password ||
      origin.pathname !== '/' ||
      origin.search ||
      origin.hash ||
      typeof env.API_ORIGIN_TOKEN !== 'string' ||
      env.API_ORIGIN_TOKEN.length < 32 ||
      env.API_ORIGIN_TOKEN.length > 256 ||
      /[^A-Za-z0-9_-]/.test(env.API_ORIGIN_TOKEN)
    )
      return null;

    const timeout = Number(env.API_TIMEOUT_MS ?? 20000);
    return {
      origin,
      token: env.API_ORIGIN_TOKEN,
      timeout: Number.isFinite(timeout)
        ? Math.min(30000, Math.max(1000, timeout))
        : 20000,
    };
  } catch {
    return null;
  }
}

async function readBounded(stream, limit) {
  if (!stream) return null;
  const reader = stream.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new RangeError('Body exceeds the bridge limit');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function cookieHeaders(headers) {
  // Cloudflare retains getAll('Set-Cookie'); Node's test runtime uses the
  // standard getSetCookie(). Never split cookies on commas (Expires has one).
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
  return headers.getAll('Set-Cookie');
}

function sameOriginCookie(cookie) {
  const [value, ...attributes] = cookie.split(';').map((part) => part.trim());
  const retained = attributes.filter(
    (part) => !/^(domain|path|samesite|secure)(?:\s*=|$)/i.test(part),
  );
  // Preserve HttpOnly on the session and the readable XSRF cookie, plus expiry
  // and Max-Age (including deletion). Neither cookie may target the tunnel host.
  return [value, ...retained, 'Path=/', 'Secure', 'SameSite=Lax'].join('; ');
}

function cloudflareClientIp(request) {
  // Cloudflare replaces CF-Connecting-IP at ingress. Never trust an incoming
  // X-Forwarded-For chain. URL parsing validates IPv6; IPv4 is checked directly.
  const candidate = request.headers.get('CF-Connecting-IP') ?? '';
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(candidate)) {
    return candidate.split('.').every((part) => Number(part) <= 255)
      ? candidate
      : null;
  }
  if (candidate.includes(':') && /^[a-fA-F0-9:.]+$/.test(candidate)) {
    try {
      new URL(`https://[${candidate}]/`);
      return candidate;
    } catch {
      /* Invalid IPv6 must not enter a trusted forwarding header. */
    }
  }
  return null;
}

export async function handleRequest(
  request,
  env,
  fetchUpstream = (input, options) => globalThis.fetch(input, options),
) {
  const url = new URL(request.url);
  if (url.pathname !== '/api' && !url.pathname.startsWith('/api/')) {
    return env.ASSETS.fetch(request);
  }

  const route = ROUTES.find(([pattern]) => pattern.test(url.pathname));
  if (!route) {
    return problem(404, 'API_ROUTE_NOT_FOUND', 'この公開APIは利用できません。');
  }
  if (!route[1].includes(request.method)) {
    return problem(405, 'METHOD_NOT_ALLOWED', 'この操作は利用できません。', {
      Allow: route[1].join(', '),
    });
  }
  const origin = request.headers.get('Origin');
  const writing = request.method !== 'GET' && request.method !== 'HEAD';
  if (
    request.headers.get('Sec-Fetch-Site') === 'cross-site' ||
    (origin !== null && origin !== url.origin) ||
    (writing && origin !== url.origin)
  ) {
    return problem(
      403,
      'ORIGIN_NOT_ALLOWED',
      'この画面から操作をやり直してください。',
    );
  }
  if (url.search.length > 2048) {
    return problem(414, 'REQUEST_TOO_LONG', 'リクエストが長すぎます。');
  }
  if (Number(request.headers.get('Content-Length') ?? 0) > MAX_REQUEST_BYTES) {
    return problem(413, 'REQUEST_TOO_LARGE', '送信するデータが大きすぎます。');
  }

  const config = configuration(env);
  if (!config) {
    return problem(
      503,
      'API_UNAVAILABLE',
      'APIの公開準備中です。しばらくしてから再試行してください。',
    );
  }

  let body;
  try {
    body = writing ? await readBounded(request.body, MAX_REQUEST_BYTES) : null;
  } catch {
    return problem(
      413,
      'REQUEST_TOO_LARGE',
      '送信するデータを確認してください。',
    );
  }
  // Cloudflare can expose an empty stream for a bodyless POST (logout). Require
  // JSON only when bytes actually arrived, not merely when a stream exists.
  if (
    body?.byteLength > 0 &&
    !/^application\/json(?:\s*;|$)/i.test(
      request.headers.get('Content-Type') ?? '',
    )
  ) {
    return problem(415, 'JSON_REQUIRED', 'JSON形式で送信してください。');
  }
  const target = new URL(url.pathname + url.search, config.origin);
  const headers = new Headers({ Accept: 'application/json' });
  for (const name of ['Cookie', 'Content-Type', 'X-XSRF-TOKEN']) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  headers.set('Origin', url.origin);
  headers.set('Referer', `${url.origin}/`);
  headers.set('X-Forwarded-Host', url.host);
  headers.set('X-Forwarded-Proto', 'https');
  const clientIp = cloudflareClientIp(request);
  // Cloudflare may append to X-Forwarded-For on the second (Tunnel) hop. Use a
  // dedicated header that the authenticated backend guard validates instead.
  if (clientIp) headers.set('X-MineTenant-Client-IP', clientIp);
  headers.set('X-MineTenant-Origin-Token', config.token);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeout);
  let stage = 'fetch';
  try {
    const response = await fetchUpstream(target, {
      method: request.method,
      headers,
      body,
      redirect: 'manual',
      signal: controller.signal,
      cache: 'no-store',
    });
    stage = 'response-validation';
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      return problem(
        502,
        'API_INVALID_RESPONSE',
        'APIに接続できません。公開設定を確認してください。',
      );
    }
    // Do not expose a Tunnel error page, Laravel debug HTML, or an upstream
    // stack trace. Laravel's expected validation/authentication JSON is retained.
    if (response.status >= 500) {
      await response.body?.cancel();
      return problem(
        502,
        'API_UNAVAILABLE',
        'APIに接続できません。公開用PCの起動状態を確認してください。',
      );
    }
    if (
      request.method !== 'HEAD' &&
      response.status !== 204 &&
      !/^application\/(?:[a-z0-9.+-]+\+)?json(?:\s*;|$)/i.test(
        response.headers.get('Content-Type') ?? '',
      )
    ) {
      await response.body?.cancel();
      return problem(
        502,
        'API_INVALID_RESPONSE',
        'APIから正しい応答を受け取れませんでした。',
      );
    }
    stage = 'response-body';
    const responseBody =
      request.method === 'HEAD' || response.status === 204
        ? null
        : await readBounded(response.body, MAX_RESPONSE_BYTES);
    stage = 'response-headers';
    const responseHeaders = privateHeaders();
    for (const name of [
      'Content-Type',
      'Retry-After',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
    ]) {
      const value = response.headers.get(name);
      if (value !== null) responseHeaders.set(name, value);
    }
    stage = 'response-cookies';
    for (const cookie of cookieHeaders(response.headers)) {
      responseHeaders.append('Set-Cookie', sameOriginCookie(cookie));
    }
    stage = 'response-create';
    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    // Log only fixed classifications, never request/response headers, cookies,
    // URLs, body data, stack traces or an exception's arbitrary message.
    const message = error instanceof Error ? error.message : '';
    const category = /illegal invocation/i.test(message)
      ? 'illegal-invocation'
      : /cache/i.test(message)
        ? 'cache-option'
        : /getSetCookie|getAll/.test(message)
          ? 'cookie-api'
          : /not a function/i.test(message)
            ? 'runtime-method'
            : /abort|timeout/i.test(message)
              ? 'timeout'
              : /network|fetch|connection|dns|ssl/i.test(message)
                ? 'upstream-network'
                : 'runtime-error';
    console.error('API_PROXY_FAILURE', JSON.stringify({ stage, category }));
    return problem(
      502,
      'API_UNAVAILABLE',
      'APIに接続できません。公開用PCの起動状態を確認して再試行してください。',
    );
  } finally {
    clearTimeout(timer);
  }
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  },
};
