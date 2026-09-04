export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly errors: Record<string, string[]>;

  constructor(
    status: number,
    message: string,
    code?: string,
    errors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

interface ApiRequestOptions extends Omit<RequestInit, 'credentials'> {
  notifyUnauthorized?: boolean;
}

const unauthorizedListeners = new Set<() => void>();
let authGeneration = 0;
let csrfInitialization: Promise<void> | undefined;
let csrfRefreshRequired = false;

/** Retire 401 responses that belong to an earlier authentication transition. */
export function advanceAuthGeneration(): void {
  authGeneration += 1;
}

export function onUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

function readCsrfToken(): string | undefined {
  const cookie = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('XSRF-TOKEN='));

  if (!cookie) return undefined;

  try {
    return decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)) || undefined;
  } catch {
    return undefined;
  }
}

function apiUrl(path: string): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');

  if (!baseUrl) {
    throw new ApiError(
      0,
      'APIの接続先が未設定です。VITE_API_BASE_URLを確認してください。',
      'API_CONFIG_ERROR',
    );
  }

  return `${baseUrl}/${path.replace(/^\/+/, '')}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorMessage(status: number): string {
  switch (status) {
    case 401:
      return 'ログインの有効期限が切れました。再度ログインしてください。';
    case 403:
      return 'この操作を行う権限がありません。';
    case 404:
      return '対象のデータが見つかりません。';
    case 409:
      return '現在の状態ではこの操作を完了できません。内容を確認してください。';
    case 419:
      return 'セッションの確認に失敗しました。もう一度操作し、解決しない場合は再度ログインしてください。';
    case 422:
      return '入力内容を確認してください。';
    case 429:
      return '操作の回数が多すぎます。しばらく待ってから再度お試しください。';
    default:
      return 'サーバーとの通信に失敗しました。時間をおいて再度お試しください。';
  }
}

function responseError(status: number, payload: unknown): ApiError {
  const problem = isRecord(payload) ? payload : {};
  const errors: Record<string, string[]> = {};

  if (isRecord(problem.errors)) {
    for (const [field, messages] of Object.entries(problem.errors)) {
      if (
        Array.isArray(messages) &&
        messages.every((item) => typeof item === 'string')
      ) {
        errors[field] = messages;
      }
    }
  }

  return new ApiError(
    status,
    status !== 419 && typeof problem.message === 'string' && problem.message
      ? problem.message
      : errorMessage(status),
    typeof problem.code === 'string'
      ? problem.code
      : status === 419
        ? 'CSRF_TOKEN_MISMATCH'
        : undefined,
    errors,
  );
}

/** Initialize the Laravel session/CSRF cookies without replaying a write. */
export async function initializeCsrfCookie(): Promise<void> {
  if (!csrfInitialization) {
    csrfInitialization = apiRequest<void>('/auth/csrf-cookie')
      .then(() => {
        csrfRefreshRequired = false;
      })
      .finally(() => {
        csrfInitialization = undefined;
      });
  }

  return csrfInitialization;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const requestAuthGeneration = authGeneration;
  const { notifyUnauthorized = true, ...requestOptions } = options;
  const method = (requestOptions.method ?? 'GET').toUpperCase();
  const headers = new Headers(requestOptions.headers);
  headers.set('Accept', 'application/json');

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    if (!readCsrfToken() || csrfRefreshRequired) {
      await initializeCsrfCookie();
    }

    // Login and logout rotate cookies, so never cache a token between writes.
    const csrfToken = readCsrfToken();
    if (!csrfToken) {
      throw new ApiError(
        419,
        'CSRF Cookieを取得できません。Cookieの許可と、画面・APIのホスト名が同じかを確認してください。',
        'CSRF_COOKIE_MISSING',
      );
    }
    headers.set('X-XSRF-TOKEN', csrfToken);
  }

  const url = apiUrl(path);
  let response: Response;
  try {
    response = await fetch(url, {
      ...requestOptions,
      method,
      headers,
      credentials: 'include',
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError')
      throw error;
    throw new ApiError(
      0,
      'APIに接続できません。ネットワークやサーバーの起動状態を確認してください。',
      'NETWORK_ERROR',
    );
  }

  if (
    response.status === 401 &&
    notifyUnauthorized &&
    requestAuthGeneration === authGeneration
  ) {
    for (const listener of unauthorizedListeners) {
      try {
        listener();
      } catch {
        // A subscriber must not prevent the request from returning its ApiError.
      }
    }
  }

  if (response.status === 419) csrfRefreshRequired = true;
  if (response.status === 204 && response.ok) return undefined as T;

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    if (!response.ok) throw responseError(response.status, undefined);
    throw new ApiError(
      response.status,
      'APIから正しい形式の応答を受け取れませんでした。',
      'INVALID_RESPONSE',
    );
  }

  if (!response.ok) throw responseError(response.status, payload);
  if (
    !isRecord(payload) ||
    !Object.prototype.hasOwnProperty.call(payload, 'data')
  ) {
    throw new ApiError(
      response.status,
      'APIから正しい形式の応答を受け取れませんでした。',
      'INVALID_RESPONSE',
    );
  }

  return payload.data as T;
}
