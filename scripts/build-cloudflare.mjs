import { spawnSync } from 'node:child_process';

// Process env has priority over local .env files, including .env.local.
// Never bake a developer's localhost URL into the published frontend.
const env = { ...process.env, VITE_API_BASE_URL: '/api/v1' };
for (const [binary, args] of [
  ['node_modules/typescript/bin/tsc', ['-b']],
  ['node_modules/vite/bin/vite.js', ['build']],
]) {
  const result = spawnSync(process.execPath, [binary, ...args], {
    env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
