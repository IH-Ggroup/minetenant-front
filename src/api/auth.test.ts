import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const BASE_URL = 'http://localhost:8787/api/v1';
const fetchMock = vi.fn<typeof fetch>();
let auth: typeof import('./auth');
let client: typeof import('./client');
const user = {
  id: 'user-1',
  name: '山田',
  role: 'buyer',
  roleLabel: '購入者',
  avatarInitial: '山',
  storeId: 'store-1',
};
const loginInput = { email: 'demo@minetenant.jp', password: 'password' };

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
  document.cookie = 'XSRF-TOKEN=; Max-Age=0; Path=/';
  client = await import('./client');
  auth = await import('./auth');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  document.cookie = 'XSRF-TOKEN=; Max-Age=0; Path=/';
});

describe('Cookie-session authentication API', () => {
  it.each(['login', 'register'] as const)(
    'initializes CSRF before %s even if a cookie already exists',
    async (action) => {
      document.cookie = 'XSRF-TOKEN=old; Path=/';
      fetchMock
        .mockImplementationOnce(async () => {
          document.cookie = 'XSRF-TOKEN=fresh%2Btoken%3D; Path=/';
          return new Response(null, { status: 204 });
        })
        .mockResolvedValueOnce(
          jsonResponse({ data: user }, action === 'register' ? 201 : 200),
        );
      const input =
        action === 'register'
          ? { ...loginInput, name: '山田', password_confirmation: 'password' }
          : loginInput;

      const result =
        action === 'register'
          ? await auth.register({
              ...loginInput,
              name: '山田',
              password_confirmation: 'password',
            })
          : await auth.login(loginInput);

      expect(result).toEqual(user);
      expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
        `${BASE_URL}/auth/csrf-cookie`,
        `${BASE_URL}/auth/${action}`,
      ]);
      const request = fetchMock.mock.calls[1][1]!;
      expect(request.method).toBe('POST');
      expect(JSON.parse(request.body as string)).toEqual(input);
      expect(new Headers(request.headers).get('X-XSRF-TOKEN')).toBe(
        'fresh+token=',
      );
      for (const [, options] of fetchMock.mock.calls) {
        expect(options?.credentials).toBe('include');
        expect(new Headers(options?.headers).get('Accept')).toBe(
          'application/json',
        );
      }
    },
  );

  it('does not submit credentials if CSRF initialization fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(auth.login(loginInput)).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/auth/csrf-cookie`);
  });

  it('restores the current user from /auth/me', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: user }));
    await expect(auth.getCurrentUser()).resolves.toEqual(user);
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/auth/me`);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'GET',
      credentials: 'include',
    });
  });

  it('treats only /auth/me 401 as signed out without notifying expiration listeners', async () => {
    const listener = vi.fn();
    client.onUnauthorized(listener);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: 'Unauthenticated.' }, 401),
    );
    await expect(auth.getCurrentUser()).resolves.toBeNull();
    expect(listener).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: 'Service unavailable' }, 503),
    );
    await expect(auth.getCurrentUser()).rejects.toMatchObject({ status: 503 });
  });

  it('does not turn a restore network failure into a signed-out success', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(auth.getCurrentUser()).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });

  it('logs out with a CSRF-protected POST and accepts 204 without parsing JSON', async () => {
    document.cookie = 'XSRF-TOKEN=logout%3D; Path=/';
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(auth.logout()).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/auth/logout`);
    const request = fetchMock.mock.calls[0][1]!;
    expect(request).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(new Headers(request.headers).get('X-XSRF-TOKEN')).toBe('logout=');
  });

  it('accepts an already expired logout but propagates other failures', async () => {
    document.cookie = 'XSRF-TOKEN=valid; Path=/';
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: 'Unauthenticated.' }, 401),
    );
    await expect(auth.logout()).resolves.toBeUndefined();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: 'CSRF token mismatch.' }, 419),
    );
    await expect(auth.logout()).rejects.toMatchObject({ status: 419 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each(['login', 'register', 'logout'] as const)(
    'does not clear the new session from stale 401 responses around %s',
    async (action) => {
      document.cookie = 'XSRF-TOKEN=valid; Path=/';
      let resolveBefore!: (response: Response) => void;
      let resolveDuring!: (response: Response) => void;
      let resolveMutation!: (response: Response) => void;
      const beforeResponse = new Promise<Response>((resolve) => {
        resolveBefore = resolve;
      });
      const duringResponse = new Promise<Response>((resolve) => {
        resolveDuring = resolve;
      });
      const mutationResponse = new Promise<Response>((resolve) => {
        resolveMutation = resolve;
      });
      const listener = vi.fn();
      client.onUnauthorized(listener);
      let protectedRequests = 0;
      fetchMock.mockImplementation(async (url) => {
        if (url === `${BASE_URL}/auth/csrf-cookie`) {
          return new Response(null, { status: 204 });
        }
        if (url === `${BASE_URL}/auth/${action}`) return mutationResponse;
        protectedRequests += 1;
        if (protectedRequests === 1) return beforeResponse;
        if (protectedRequests === 2) return duringResponse;
        return jsonResponse({ message: 'Unauthenticated.' }, 401);
      });

      const beforeMutation = client.apiRequest('/transactions');
      const mutation =
        action === 'logout'
          ? auth.logout()
          : action === 'login'
            ? auth.login(loginInput)
            : auth.register({
                ...loginInput,
                name: '山田',
                password_confirmation: 'password',
              });
      await vi.waitFor(() => {
        expect(
          fetchMock.mock.calls.some(
            ([url]) => url === `${BASE_URL}/auth/${action}`,
          ),
        ).toBe(true);
      });
      const duringMutation = client.apiRequest('/transactions');

      // A request from before the transition cannot cancel a pending login.
      resolveBefore(jsonResponse({ message: 'Unauthenticated.' }, 401));
      await expect(beforeMutation).rejects.toMatchObject({ status: 401 });
      expect(listener).not.toHaveBeenCalled();

      resolveMutation(
        action === 'logout'
          ? new Response(null, { status: 204 })
          : jsonResponse({ data: user }),
      );
      await mutation;

      // A request made during the transition cannot clear its completed session.
      resolveDuring(jsonResponse({ message: 'Unauthenticated.' }, 401));
      await expect(duringMutation).rejects.toMatchObject({ status: 401 });
      expect(listener).not.toHaveBeenCalled();

      // Current-session failures still notify normally.
      await expect(client.apiRequest('/transactions')).rejects.toMatchObject({
        status: 401,
      });
      expect(listener).toHaveBeenCalledOnce();
    },
  );
});
