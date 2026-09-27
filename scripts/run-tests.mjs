#!/usr/bin/env node
/**
 * Transpiles the importer (types stripped, no bundler) and runs its tests.
 * The parser is the one piece of this app that consumes files written by
 * someone else, in a format Meta changes without notice, so it is the piece
 * that earns a test suite.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'node_modules/.cache/mirror-history');
mkdirSync(outDir, { recursive: true });

execFileSync('npx', [
  'esbuild', 'src/data/import/meta-export.ts',
  '--format=esm', `--outfile=${outDir}/meta-export.mjs`, '--log-level=error',
], { cwd: root, stdio: 'inherit' });

execFileSync('node', ['scripts/test/meta-export.test.mjs'], { cwd: root, stdio: 'inherit' });
