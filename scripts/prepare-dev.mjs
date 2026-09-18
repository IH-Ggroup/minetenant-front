import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

import { ensureLocalEnv } from './setup-env.mjs';

const REQUIRED_DEPENDENCY_FILES = [
  'node_modules/.package-lock.json',
  'node_modules/vite/bin/vite.js',
];
const DEPENDENCY_SENTINEL = 'node_modules/.minetenant-package-lock.sha256';

export function packageLockFingerprint(
  cwd = process.cwd(),
  readFile = readFileSync,
) {
  return createHash('sha256')
    .update(readFile(resolve(cwd, 'package-lock.json')))
    .digest('hex');
}

function hasDependencyFiles(cwd, exists) {
  return REQUIRED_DEPENDENCY_FILES.every((path) => exists(resolve(cwd, path)));
}

export function hasDevelopmentDependencies(
  cwd = process.cwd(),
  { exists = existsSync, readFile = readFileSync, fingerprint } = {},
) {
  if (!hasDependencyFiles(cwd, exists)) return false;

  try {
    const expectedFingerprint =
      fingerprint ?? packageLockFingerprint(cwd, readFile);
    return (
      readFile(resolve(cwd, DEPENDENCY_SENTINEL), 'utf8').trim() ===
      expectedFingerprint
    );
  } catch {
    return false;
  }
}

function npmInvocation(npmExecPath = process.env.npm_execpath) {
  const args = ['ci', '--no-audit', '--no-fund'];
  if (npmExecPath) {
    return { command: process.execPath, args: [npmExecPath, ...args] };
  }

  return {
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args,
  };
}

export function runPrepareDev({
  cwd = process.cwd(),
  exists = existsSync,
  readFile = readFileSync,
  writeFile = writeFileSync,
  spawn = spawnSync,
  npmExecPath = process.env.npm_execpath,
  log = console.log,
  error = console.error,
} = {}) {
  let fingerprint;
  try {
    fingerprint = packageLockFingerprint(cwd, readFile);
  } catch {
    error('package-lock.jsonを読み込めないため、フロントの起動を中止します。');
    return 1;
  }

  if (!hasDevelopmentDependencies(cwd, { exists, readFile, fingerprint })) {
    log(
      '依存関係が未導入かpackage-lock.jsonが更新されたため、npm ci を実行します。',
    );
    const { command, args } = npmInvocation(npmExecPath);
    const result = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32' && !npmExecPath,
    });

    if (result.error) {
      error(`npm ci を開始できませんでした。${result.error.message}`);
      return 1;
    }
    if (result.status !== 0) {
      error('npm ci に失敗したため、フロントの起動を中止します。');
      return result.status ?? 1;
    }

    if (!hasDependencyFiles(cwd, exists)) {
      error(
        'npm ciの完了後も依存関係を確認できないため、フロントの起動を中止します。',
      );
      return 1;
    }

    try {
      writeFile(resolve(cwd, DEPENDENCY_SENTINEL), `${fingerprint}\n`);
    } catch {
      error(
        '依存関係の状態を記録できません。node_modulesの権限を確認してください。',
      );
      return 1;
    }
  }

  return ensureLocalEnv({ cwd, log, error, logExisting: false });
}

const entryPoint = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : undefined;

if (entryPoint === import.meta.url) {
  process.exitCode = runPrepareDev();
}
