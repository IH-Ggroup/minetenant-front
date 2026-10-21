import { constants, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Windows / macOS / Linux 共通で使え、各自の接続設定は上書きしません。
export function ensureLocalEnv({
  cwd = process.cwd(),
  log = console.log,
  error = console.error,
  logExisting = true,
} = {}) {
  try {
    copyFileSync(
      resolve(cwd, '.env.example'),
      resolve(cwd, '.env.local'),
      constants.COPYFILE_EXCL,
    );
    log('.env.local を作成しました。Hono API の接続先を確認してください。');
    return 0;
  } catch (copyError) {
    if (copyError?.code === 'EEXIST') {
      if (logExisting) {
        log('.env.local は既にあります。現在の設定をそのまま使用します。');
      }
      return 0;
    }

    error(
      `.env.local を作成できませんでした。${copyError instanceof Error ? ` ${copyError.message}` : ''}`,
    );
    return 1;
  }
}

const entryPoint = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : undefined;

if (entryPoint === import.meta.url) {
  process.exitCode = ensureLocalEnv();
}
