#!/usr/bin/env node
/**
 * Check every `wiki:` title in the dataset against the Wikipedia REST API.
 *
 * A wrong title is not fatal — the card just quietly loses its background text
 * and the browser logs a 404 — which is exactly why it needs checking: the
 * failure is invisible from inside the app.
 *
 *   node scripts/verify-wiki.mjs          # report
 *   node scripts/verify-wiki.mjs --fix    # rewrite titles the API redirects to
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const HISTORY = resolve(here, '../src/data/history.ts');
const fix = process.argv.includes('--fix');

const source = await readFile(HISTORY, 'utf8');

// id and wiki title are on separate lines within the same object literal.
const entries = [];
for (const block of source.split(/^ {2}\{ id: '/m).slice(1)) {
  const id = block.slice(0, block.indexOf("'"));
  // The dataset escapes apostrophes inside these single-quoted literals, so a
  // naive [^']+ stops at the backslash and reports a truncated, "broken" title
  // for every entry that contains one. Match escapes, then unescape.
  const raw = block.match(/\bwiki: '((?:[^'\\]|\\.)*)'/)?.[1];
  const wiki = raw?.replace(/\\(.)/g, '$1');
  if (wiki) entries.push({ id, wiki, raw });
}

console.log(`checking ${entries.length} Wikipedia titles\n`);

const broken = [];
const redirected = [];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Wikipedia asks for a descriptive User-Agent and throttles anonymous bursts.
// Without both of these the run returns a wall of 429s that look like broken
// titles but are only this script being rude.
const HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'mirror-history-linkcheck/1.0 (https://github.com/fwornle/mirror-history)',
};

async function lookup(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}?redirect=true`;

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (res.status === 429) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
      if (!res.ok) return { status: res.status, canonical: null };
      const json = await res.json();
      return {
        status: json.type === 'disambiguation' ? -1 : 200,
        canonical: (json.titles?.canonical ?? '').replace(/ /g, '_'),
      };
    } catch {
      await sleep(600 * (attempt + 1));
    }
  }
  return { status: 429, canonical: null };
}

// Sequential and paced: this is someone else's free API.
for (const entry of entries) {
  await sleep(120);
  const { status, canonical } = await lookup(entry.wiki);

  if (status === -1) {
    broken.push({ ...entry, reason: 'disambiguation page' });
    console.log(`AMBIG ${entry.id.padEnd(28)} ${entry.wiki}`);
  } else if (status !== 200) {
    broken.push({ ...entry, reason: `HTTP ${status}` });
    console.log(`BROKEN ${entry.id.padEnd(27)} ${entry.wiki}  (HTTP ${status})`);
  } else if (canonical && canonical !== entry.wiki) {
    redirected.push({ ...entry, canonical });
    console.log(`REDIR  ${entry.id.padEnd(27)} ${entry.wiki} -> ${canonical}`);
  }
}

console.log(`\n${entries.length - broken.length - redirected.length} exact, ${redirected.length} redirected, ${broken.length} broken.`);

if (broken.length) {
  console.log('\nBroken titles need a human — the API cannot guess what was meant:');
  for (const b of broken) console.log(`  ${b.id}: ${b.wiki} (${b.reason})`);
}

if (fix && redirected.length) {
  let out = source;
  for (const r of redirected) {
    // Anchor the replacement to the owning object so a shared title cannot
    // rewrite a different event's entry.
    const idx = out.indexOf(`id: '${r.id}'`);
    if (idx === -1) continue;
    const end = out.indexOf("\n  { id: '", idx);
    const block = out.slice(idx, end === -1 ? undefined : end);
    out = out.slice(0, idx) + block.replace(`wiki: '${r.raw}'`, `wiki: '${r.canonical.replace(/'/g, "\\'")}'`)
      + (end === -1 ? '' : out.slice(end));
  }
  await writeFile(HISTORY, out);
  console.log(`\nRewrote ${redirected.length} redirected titles to their canonical form.`);
}

process.exit(broken.length ? 1 : 0);
