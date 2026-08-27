// The regime documents are the app's input, and they live at the repo root because
// they are the deliverable, not an app asset. Copy rather than symlink so the build
// works identically on a CI runner and on Windows.
import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const target = resolve(here, '../public/data');

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
for (const dir of ['regimes', 'proposals', 'fiscal', 'headcount', 'reports']) {
  await cp(resolve(repo, 'data', dir), resolve(target, dir), { recursive: true });
}
console.log('copied data/ into app/public/data');
