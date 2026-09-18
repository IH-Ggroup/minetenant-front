import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  hasDevelopmentDependencies,
  packageLockFingerprint,
  runPrepareDev,
} from './prepare-dev.mjs';

const directories: string[] = [];

function createDirectory() {
  const directory = mkdtempSync(join(tmpdir(), 'minetenant-front-prepare-'));
  directories.push(directory);
  writeFileSync(
    join(directory, '.env.example'),
    'VITE_API_BASE_URL=http://localhost:8787/api/v1\n',
  );
  writeFileSync(
    join(directory, 'package-lock.json'),
    '{"lockfileVersion":3}\n',
  );
  return directory;
}

function addDependencyFiles(directory: string) {
  mkdirSync(join(directory, 'node_modules/vite/bin'), { recursive: true });
  writeFileSync(join(directory, 'node_modules/.package-lock.json'), '{}');
  writeFileSync(join(directory, 'node_modules/vite/bin/vite.js'), '');
}

function addDependencyMarkers(directory: string) {
  addDependencyFiles(directory);
  writeFileSync(
    join(directory, 'node_modules/.minetenant-package-lock.sha256'),
    `${packageLockFingerprint(directory)}\n`,
  );
}

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('npm run devの初回準備', () => {
  it('依存関係がない場合だけnpm ciを実行して.env.localを作る', () => {
    const directory = createDirectory();
    const spawn = vi.fn(() => {
      addDependencyFiles(directory);
      return { status: 0 };
    });

    const result = runPrepareDev({
      cwd: directory,
      spawn,
      npmExecPath: '/tools/npm-cli.js',
    });

    expect(result).toBe(0);
    expect(spawn).toHaveBeenCalledOnce();
    expect(spawn.mock.calls[0]?.[0]).toBe(process.execPath);
    expect(spawn.mock.calls[0]?.[1]).toEqual([
      '/tools/npm-cli.js',
      'ci',
      '--no-audit',
      '--no-fund',
    ]);
    expect(spawn.mock.calls[0]?.[2]).toMatchObject({
      cwd: directory,
      stdio: 'inherit',
    });
    expect(readFileSync(join(directory, '.env.local'), 'utf8')).toContain(
      'http://localhost:8787/api/v1',
    );
    expect(hasDevelopmentDependencies(directory)).toBe(true);
  });

  it('依存関係があればnpm ciを再実行しない', () => {
    const directory = createDirectory();
    addDependencyMarkers(directory);
    const spawn = vi.fn(() => ({ status: 0 }));

    expect(hasDevelopmentDependencies(directory)).toBe(true);
    expect(runPrepareDev({ cwd: directory, spawn })).toBe(0);
    expect(spawn).not.toHaveBeenCalled();
  });

  it('package-lock.jsonが変わった場合はnpm ciを再実行する', () => {
    const directory = createDirectory();
    addDependencyMarkers(directory);
    writeFileSync(
      join(directory, 'package-lock.json'),
      '{"lockfileVersion":3,"packages":{"":{}}}\n',
    );
    const spawn = vi.fn(() => ({ status: 0 }));

    expect(hasDevelopmentDependencies(directory)).toBe(false);
    expect(runPrepareDev({ cwd: directory, spawn })).toBe(0);
    expect(spawn).toHaveBeenCalledOnce();
    expect(hasDevelopmentDependencies(directory)).toBe(true);
  });

  it('既存の.env.localを上書きしない', () => {
    const directory = createDirectory();
    addDependencyMarkers(directory);
    const existing = 'VITE_API_BASE_URL=http://localhost:9000/api/v1\n';
    writeFileSync(join(directory, '.env.local'), existing);
    writeFileSync(
      join(directory, 'package-lock.json'),
      '{"lockfileVersion":3,"packages":{"":{"name":"changed"}}}\n',
    );
    const spawn = vi.fn(() => ({ status: 0 }));

    expect(runPrepareDev({ cwd: directory, spawn })).toBe(0);
    expect(spawn).toHaveBeenCalledOnce();
    expect(readFileSync(join(directory, '.env.local'), 'utf8')).toBe(existing);
  });

  it('npm ciに失敗した場合はViteを起動させない終了コードを返す', () => {
    const directory = createDirectory();
    const error = vi.fn();

    const result = runPrepareDev({
      cwd: directory,
      spawn: () => ({ status: 7 }),
      error,
    });

    expect(result).toBe(7);
    expect(error).toHaveBeenCalledWith(
      'npm ci に失敗したため、フロントの起動を中止します。',
    );
  });
});
