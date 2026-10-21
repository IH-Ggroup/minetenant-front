import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const API_BASE_URL_KEY = 'VITE_API_BASE_URL';
const DEFAULT_TIMEOUT_MS = 3_000;

class RequestTimeoutError extends Error {
  constructor() {
    super('request timed out');
    this.name = 'RequestTimeoutError';
  }
}

function unquote(value) {
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

export function parseApiBaseUrl(contents) {
  const assignments = [];

  for (const sourceLine of contents.split(/\r?\n/u)) {
    const line = sourceLine.trim();
    if (!line || line.startsWith('#')) continue;

    const match = line.match(/^(?:export\s+)?VITE_API_BASE_URL\s*=\s*(.*)$/u);
    if (match) assignments.push(unquote(match[1].trim()));
  }

  if (assignments.length === 0 || !assignments[0]) {
    throw new Error(
      `${API_BASE_URL_KEY}がありません。.env.localを修正するか、不要なら削除してnpm run devを実行してください。`,
    );
  }

  if (assignments.length > 1) {
    throw new Error(
      `${API_BASE_URL_KEY}が複数あります。1つだけ残してください。`,
    );
  }

  let apiBaseUrl;
  try {
    apiBaseUrl = new URL(assignments[0]);
  } catch {
    throw new Error(
      `${API_BASE_URL_KEY}はhttp://またはhttps://から始まるURLにしてください。`,
    );
  }

  if (!['http:', 'https:'].includes(apiBaseUrl.protocol)) {
    throw new Error(
      `${API_BASE_URL_KEY}はhttp://またはhttps://から始まるURLにしてください。`,
    );
  }

  if (
    apiBaseUrl.username ||
    apiBaseUrl.password ||
    apiBaseUrl.search ||
    apiBaseUrl.hash
  ) {
    throw new Error(
      `${API_BASE_URL_KEY}にはユーザー名、パスワード、クエリ、フラグメントを含めないでください。`,
    );
  }

  const pathname = apiBaseUrl.pathname.replace(/\/+$/u, '');
  if (pathname !== '/api/v1') {
    throw new Error(`${API_BASE_URL_KEY}の末尾は/api/v1にしてください。`);
  }

  apiBaseUrl.pathname = pathname;
  return apiBaseUrl;
}

export function createDiagnosticEndpoints(apiBaseUrl) {
  return {
    hello: new URL('/api/hello', apiBaseUrl.origin).href,
    products: new URL('/api/v1/products', apiBaseUrl.origin).href,
  };
}

async function fetchTextWithTimeout(fetchImpl, url, timeoutMs) {
  const controller = new AbortController();
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new RequestTimeoutError());
      controller.abort();
    }, timeoutMs);
  });

  try {
    const requestAndBody = (async () => {
      const response = await fetchImpl(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      return { response, body: await response.text() };
    })();
    return await Promise.race([requestAndBody, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

function reportRequestFailure(error, endpointLabel, timeoutMs, reportError) {
  if (error instanceof RequestTimeoutError) {
    reportError(
      `✗ ${endpointLabel}が${timeoutMs}ms以内に応答しませんでした。Honoのターミナルを確認してください。`,
    );
    return;
  }

  reportError(
    `✗ ${endpointLabel}に接続できません。バックエンドでnpm run devを実行し、.env.localに設定したホストとポートを確認してください。`,
  );
}

export async function runDoctor({
  cwd = process.cwd(),
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  log = console.log,
  error = console.error,
} = {}) {
  log('MineTenantフロントの起動診断を開始します。');

  let contents;
  try {
    contents = await readFile(resolve(cwd, '.env.local'), 'utf8');
  } catch (readError) {
    if (readError?.code === 'ENOENT') {
      error('✗ .env.localがありません。npm run devを実行してください。');
    } else {
      error('✗ .env.localを読み込めません。ファイルの権限を確認してください。');
    }
    return 1;
  }

  let apiBaseUrl;
  try {
    apiBaseUrl = parseApiBaseUrl(contents);
  } catch (validationError) {
    error(`✗ ${validationError.message}`);
    return 1;
  }

  log('✓ .env.localのAPI接続先を確認しました。');
  const endpoints = createDiagnosticEndpoints(apiBaseUrl);

  let helloResponse;
  let helloBody;
  try {
    ({ response: helloResponse, body: helloBody } = await fetchTextWithTimeout(
      fetchImpl,
      endpoints.hello,
      timeoutMs,
    ));
  } catch (requestError) {
    reportRequestFailure(requestError, '/api/hello', timeoutMs, error);
    return 1;
  }

  if (!helloResponse.ok) {
    error(
      `✗ /api/helloがHTTP ${helloResponse.status}を返しました。Honoのターミナルを確認してください。`,
    );
    return 1;
  }
  if (helloBody.trim() !== 'MineTenant API is running.') {
    error(
      '✗ /api/helloの応答がMineTenant Hono APIではありません。別のサーバーが同じポートで起動していないか確認してください。',
    );
    return 1;
  }
  log('✓ Hono APIの起動を確認しました。');

  let productsResponse;
  let productsText;
  try {
    ({ response: productsResponse, body: productsText } =
      await fetchTextWithTimeout(fetchImpl, endpoints.products, timeoutMs));
  } catch (requestError) {
    reportRequestFailure(requestError, '/api/v1/products', timeoutMs, error);
    return 1;
  }

  if (productsResponse.status === 500) {
    error(
      '✗ /api/v1/productsがHTTP 500を返しました。MySQLを起動し、バックエンドを停止してnpm run devを再実行してください。不足するDB・テーブルは自動準備されます。それでも失敗する場合は、バックエンドに表示された案内に従ってください。',
    );
    return 1;
  }

  if (!productsResponse.ok) {
    error(
      `✗ /api/v1/productsがHTTP ${productsResponse.status}を返しました。Honoのターミナルを確認してください。`,
    );
    return 1;
  }

  let productsBody = null;
  try {
    productsBody = JSON.parse(productsText);
  } catch {
    // The actionable response-format message below is safer than parser output.
  }
  if (
    !productsBody ||
    typeof productsBody !== 'object' ||
    !Array.isArray(productsBody.data)
  ) {
    error(
      '✗ /api/v1/productsの応答形式が不正です。接続先とHonoのバージョンを確認してください。',
    );
    return 1;
  }

  log('✓ 商品APIとDBの応答を確認しました。');
  log('診断はすべて成功しました。npm run devでフロントを起動できます。');
  return 0;
}

const entryPoint = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : undefined;

if (entryPoint === import.meta.url) {
  process.exitCode = await runDoctor();
}
