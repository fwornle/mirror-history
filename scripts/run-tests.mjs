#!/usr/bin/env node
/**
 * Transpiles the units under test (types stripped, no bundler) and runs them.
 *
 * Two things here earn a suite. The importer consumes files written by someone
 * else, in a format Meta changes without notice. The rail geometry decides
 * whether a card is on screen at all, and got that wrong silently — a phone
 * showed one lane of three and nothing said so.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'node_modules/.cache/mirror-history');
mkdirSync(outDir, { recursive: true });

/** Sources under test, transpiled one-to-one — no bundling, so no import maps. */
const units = [
  ['src/data/import/meta-export.ts', 'meta-export.mjs'],
  ['src/config/timeline.ts', 'timeline.mjs'],
  ['src/utils/lanes.ts', 'lanes.mjs'],
];

for (const [from, to] of units) {
  execFileSync('npx', [
    'esbuild', from, '--format=esm', `--outfile=${outDir}/${to}`, '--log-level=error',
    // Bundled so the app's `@/…` aliases resolve; esbuild reads them from the
    // tsconfig, which is the same mapping Vite uses. Constants therefore get
    // inlined per unit — fine, they are plain values with one definition.
    '--bundle', '--tsconfig=tsconfig.app.json',
  ], { cwd: root, stdio: 'inherit' });
}

for (const suite of ['meta-export', 'lane-geometry']) {
  execFileSync('node', [`scripts/test/${suite}.test.mjs`], { cwd: root, stdio: 'inherit' });
}
