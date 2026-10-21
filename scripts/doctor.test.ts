import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createDiagnosticEndpoints,
  parseApiBaseUrl,
  runDoctor,
} from './doctor.mjs';

const directories: string[] = [];

function createDirectory() {
  const directory = mkdtempSync(join(tmpdir(), 'minetenant-front-doctor-'));
  directories.push(directory);
  return directory;
}

function createReporter() {
  const messages: string[] = [];
  return {
    messages,
    log: (message: unknown) => messages.push(String(message)),
    error: (message: unknown) => messages.push(String(message)),
  };
}

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('npm run doctor', () => {
  it('設定したHonoの疎通と商品APIを順番に確認する', async () => {
    const directory = createDirectory();
    writeFileSync(
      join(directory, '.env.local'),
      'VITE_API_BASE_URL=http://localhost:38787/api/v1\n',
    );
    const requestedUrls: string[] = [];
    const reporter = createReporter();

    const result = await runDoctor({
      cwd: directory,
      fetchImpl: async (url: string) => {
        requestedUrls.push(url);
        return url.endsWith('/api/hello')
          ? new Response('MineTenant API is running.', { status: 200 })
          : Response.json({ data: [] });
      },
      timeoutMs: 50,
      log: reporter.log,
      error: reporter.error,
    });

    expect(result).toBe(0);
    expect(requestedUrls).toEqual([
      'http://localhost:38787/api/hello',
      'http://localhost:38787/api/v1/products',
    ]);
    expect(reporter.messages.join('\n')).toContain('診断はすべて成功');
  });

  it('.env.localがない場合はsetupを案内し、通信しない', async () => {
    const directory = createDirectory();
    const reporter = createReporter();
    let requested = false;

    const result = await runDoctor({
      cwd: directory,
      fetchImpl: async () => {
        requested = true;
        return new Response('{}', { status: 200 });
      },
      log: reporter.log,
      error: reporter.error,
    });

    expect(result).toBe(1);
    expect(requested).toBe(false);
    expect(reporter.messages.join('\n')).toContain('npm run dev');
  });

  it('不正な接続先を値そのものを表示せず拒否する', async () => {
    const directory = createDirectory();
    const secret = 'do-not-print-this';
    writeFileSync(
      join(directory, '.env.local'),
      `VITE_API_BASE_URL=http://user:${secret}@localhost:8787/api/v1\n`,
    );
    const reporter = createReporter();

    const result = await runDoctor({
      cwd: directory,
      log: reporter.log,
      error: reporter.error,
    });

    expect(result).toBe(1);
    expect(reporter.messages.join('\n')).toContain('パスワード');
    expect(reporter.messages.join('\n')).not.toContain(secret);
  });

  it('商品APIの500ではDBの確認順を案内する', async () => {
    const directory = createDirectory();
    writeFileSync(
      join(directory, '.env.local'),
      'VITE_API_BASE_URL=http://localhost:8787/api/v1\n',
    );
    const reporter = createReporter();
    let requestCount = 0;

    const result = await runDoctor({
      cwd: directory,
      fetchImpl: async () => {
        requestCount += 1;
        return requestCount === 1
          ? new Response('MineTenant API is running.', { status: 200 })
          : new Response('{}', { status: 500 });
      },
      log: reporter.log,
      error: reporter.error,
    });

    expect(result).toBe(1);
    expect(reporter.messages.join('\n')).toContain('HTTP 500');
    expect(reporter.messages.join('\n')).toContain('自動準備');
  });

  it('応答がない場合はタイムアウトとして案内する', async () => {
    const directory = createDirectory();
    writeFileSync(
      join(directory, '.env.local'),
      'VITE_API_BASE_URL=http://localhost:8787/api/v1\n',
    );
    const reporter = createReporter();

    const result = await runDoctor({
      cwd: directory,
      fetchImpl: () => new Promise(() => undefined),
      timeoutMs: 5,
      log: reporter.log,
      error: reporter.error,
    });

    expect(result).toBe(1);
    expect(reporter.messages.join('\n')).toContain('5ms以内');
  });

  it('タイムアウトによるabort後のrejectを未処理にしない', async () => {
    const directory = createDirectory();
    writeFileSync(
      join(directory, '.env.local'),
      'VITE_API_BASE_URL=http://localhost:8787/api/v1\n',
    );
    const reporter = createReporter();
    let aborted = false;

    const result = await runDoctor({
      cwd: directory,
      fetchImpl: (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          if (!signal) {
            reject(new Error('AbortSignalが指定されていません。'));
            return;
          }

          signal.addEventListener(
            'abort',
            () => {
              aborted = true;
              reject(
                new DOMException('The operation was aborted.', 'AbortError'),
              );
            },
            { once: true },
          );
        }),
      timeoutMs: 5,
      log: reporter.log,
      error: reporter.error,
    });

    expect(result).toBe(1);
    expect(aborted).toBe(true);
    expect(reporter.messages.join('\n')).toContain('5ms以内');
  });

  it('本文の受信が止まった場合もタイムアウトする', async () => {
    const directory = createDirectory();
    writeFileSync(
      join(directory, '.env.local'),
      'VITE_API_BASE_URL=http://localhost:8787/api/v1\n',
    );
    const reporter = createReporter();

    const result = await runDoctor({
      cwd: directory,
      fetchImpl: async () =>
        new Response(
          new ReadableStream({
            start() {
              // Headers arrive, but the response body intentionally never ends.
            },
          }),
        ),
      timeoutMs: 5,
      log: reporter.log,
      error: reporter.error,
    });

    expect(result).toBe(1);
    expect(reporter.messages.join('\n')).toContain('5ms以内');
  });

  it('別サービスの200応答を起動成功として扱わない', async () => {
    const directory = createDirectory();
    writeFileSync(
      join(directory, '.env.local'),
      'VITE_API_BASE_URL=http://localhost:8787/api/v1\n',
    );
    const reporter = createReporter();

    const result = await runDoctor({
      cwd: directory,
      fetchImpl: async () => new Response('<html>another app</html>'),
      log: reporter.log,
      error: reporter.error,
    });

    expect(result).toBe(1);
    expect(reporter.messages.join('\n')).toContain(
      'MineTenant Hono APIではありません',
    );
  });
});

describe('doctorの設定解析', () => {
  it('引用符と末尾スラッシュを正規化する', () => {
    const apiBaseUrl = parseApiBaseUrl(
      'VITE_API_BASE_URL="https://example.com/api/v1/"\n',
    );

    expect(createDiagnosticEndpoints(apiBaseUrl)).toEqual({
      hello: 'https://example.com/api/hello',
      products: 'https://example.com/api/v1/products',
    });
  });
});
