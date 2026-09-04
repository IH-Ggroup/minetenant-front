import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cwd, execPath } from 'node:process';

import { afterEach, describe, expect, it } from 'vitest';

const script = join(cwd(), 'scripts/setup-env.mjs');
const directories: string[] = [];

function createDirectory() {
  const directory = mkdtempSync(join(tmpdir(), 'minetenant-front-setup-'));
  directories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('npm run setup', () => {
  it('初回に .env.example から .env.local を作成する', () => {
    const directory = createDirectory();
    const example = 'VITE_API_BASE_URL=http://localhost:8787/api/v1\n';
    writeFileSync(join(directory, '.env.example'), example);

    execFileSync(execPath, [script], { cwd: directory });

    expect(readFileSync(join(directory, '.env.local'), 'utf8')).toBe(example);
  });

  it('既存の .env.local を上書きしない', () => {
    const directory = createDirectory();
    const existing = 'VITE_API_BASE_URL=http://localhost:9000/api/v1\n';
    writeFileSync(join(directory, '.env.example'), 'new value');
    writeFileSync(join(directory, '.env.local'), existing);

    execFileSync(execPath, [script], { cwd: directory });

    expect(readFileSync(join(directory, '.env.local'), 'utf8')).toBe(existing);
  });

  it('作成できない場合は失敗を通知する', () => {
    const directory = createDirectory();

    expect(() =>
      execFileSync(execPath, [script], { cwd: directory, stdio: 'pipe' }),
    ).toThrow();
  });
});
