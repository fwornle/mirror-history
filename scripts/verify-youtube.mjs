#!/usr/bin/env node
/**
 * Check candidate YouTube ids before they are allowed near the app.
 *
 * A guessed id is worse than no id: the card silently plays the wrong video,
 * or a dead player. Two gates, and an id must pass both:
 *
 *   1. oEmbed  — the id exists, and prints its real title and channel so a
 *                human can confirm the video actually matches the event.
 *   2. embed   — the video is *playable in an iframe*. This is not implied by
 *                gate 1: a rights holder can leave a video public while
 *                forbidding embedding, and YouTube then reports it only to the
 *                player, as IFrame API error 101/150. Sports and agency
 *                footage do this constantly.
 *
 * Gate 2 needs a real player, because nothing server-side tells the truth
 * about it: the watch page's `playableInEmbed` reads true for videos that are
 * in fact blocked, and the innertube embedded-player endpoint rejects
 * unauthenticated probes outright. So it loads the ids in gsd-browser and
 * listens for onReady vs onError. Skip it with --no-embed-check only if the
 * browser is unavailable, and expect some players to ship dead.
 *
 *   node scripts/verify-youtube.mjs candidates.json         # report only
 *   node scripts/verify-youtube.mjs candidates.json --write # merge passing ids
 *   node scripts/verify-youtube.mjs --audit                 # re-check shipped ids
 *
 * candidates.json: { "<event id>": "<youtube id>", ... }
 *
 * --write MERGES into youtube-verified.json, so a run covering a handful of
 * events cannot silently drop the rest, and a repair can replace one entry.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '../src/data/youtube-verified.json');

const [, , ...argv] = process.argv;
const flags = argv.filter((a) => a.startsWith('--'));
const candidatesPath = argv.find((a) => !a.startsWith('--'));
const auditMode = flags.includes('--audit');

if (!candidatesPath && !auditMode) {
  console.error('usage: node scripts/verify-youtube.mjs <candidates.json> [--write] [--no-embed-check]');
  console.error('       node scripts/verify-youtube.mjs --audit');
  process.exit(2);
}

const candidates = auditMode
  ? JSON.parse(await readFile(OUT, 'utf8'))
  : JSON.parse(await readFile(resolve(process.cwd(), candidatesPath), 'utf8'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------------------------------------------------------- gate 1 */

async function probe(videoId) {
  const url = `https://www.youtube.com/oembed?url=${
    encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const json = await res.json();
    return { ok: true, title: json.title, author: json.author_name };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

const results = [];
for (const [eventId, videoId] of Object.entries(candidates)) {
  const result = await probe(videoId);
  results.push({ eventId, videoId, ...result });
  console.log(
    result.ok
      ? `LIVE  ${eventId.padEnd(26)} ${videoId}  "${result.title}" — ${result.author}`
      : `DEAD  ${eventId.padEnd(26)} ${videoId}  (${result.reason})`,
  );
}

const live = results.filter((r) => r.ok);
console.log(`\n${live.length}/${results.length} ids resolve.`);
console.log('A resolving id is not yet a correct one — read the titles above and');
console.log('drop any that do not match the event before writing.');

/* ---------------------------------------------------------------- gate 2 */

function harness(entries) {
  const map = Object.fromEntries(entries.map((e) => [e.eventId, e.videoId]));
  return `<!doctype html><html><head><meta charset="utf-8"><title>embed gate</title></head>
<body><div id="hosts"></div><script>
const CAND = ${JSON.stringify(map)};
window.__results = {};
const hosts = document.getElementById('hosts');
Object.keys(CAND).forEach((ev, i) => {
  const d = document.createElement('div'); d.id = 'p' + i; hosts.appendChild(d);
});
window.onYouTubeIframeAPIReady = function () {
  Object.entries(CAND).forEach(([ev, vid], i) => {
    new YT.Player('p' + i, { videoId: vid, width: 120, height: 80, events: {
      onReady: () => { if (!window.__results[ev]) window.__results[ev] = { vid, state: 'ready' }; },
      onError: (e) => { window.__results[ev] = { vid, state: 'error', code: e.data }; },
    } });
  });
};
const t = document.createElement('script');
t.src = 'https://www.youtube.com/iframe_api';
document.head.appendChild(t);
</script></body></html>`;
}

function gsd(args) {
  return new Promise((ok, fail) => {
    execFile('gsd-browser', args, { timeout: 120000 }, (err, stdout, stderr) => {
      if (err) return fail(new Error(`${err.message} ${stderr || ''}`));
      ok(stdout.trim());
    });
  });
}

/** Error codes the IFrame API uses for "this will never play here". */
const EMBED_BLOCKED = new Set([101, 150]);

/**
 * Players per page. Well below what kills the tab: past roughly 80 the page
 * stops reporting altogether — every id comes back with no verdict, which
 * reads exactly like "everything is blocked" and is completely wrong. Auditing
 * the whole file is the case that hits this, so the gate always batches.
 */
const CHUNK = 20;

async function embedGate(entries) {
  const seen = {};
  for (let i = 0; i < entries.length; i += CHUNK) {
    const batch = entries.slice(i, i + CHUNK);
    if (entries.length > CHUNK) {
      console.log(`  …batch ${i / CHUNK + 1} of ${Math.ceil(entries.length / CHUNK)} (${batch.length} ids)`);
    }
    // A batch that reports nothing at all is the browser being unwell, not 20
    // blocked videos — a wedged tab looks identical to unanimous rejection.
    // Retry once on a fresh page before believing a shutout.
    let got = await embedBatch(batch);
    if (Object.keys(got).length === 0) {
      console.log('    (no verdicts — retrying batch on a fresh page)');
      got = await embedBatch(batch);
    }
    Object.assign(seen, got);
  }
  return seen;
}

async function embedBatch(entries) {
  const html = harness(entries);
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  try {
    await gsd(['navigate', `http://localhost:${port}/`]);
    let seen = {};
    for (let i = 0; i < 20; i += 1) {
      await sleep(3000);
      const raw = await gsd(['eval', 'JSON.stringify(window.__results||{})']);
      const line = raw.split('\n').map((l) => l.trim()).filter(Boolean).pop() || '{}';
      try { seen = JSON.parse(line); } catch { /* player still booting */ }
      if (Object.keys(seen).length >= entries.length) break;
    }
    return seen;
  } finally {
    server.close();
  }
}

const blocked = new Set();
const inconclusive = new Set();
if (live.length && !flags.includes('--no-embed-check')) {
  console.log('\nEmbed gate — loading each id in a real player (gsd-browser):');
  try {
    const seen = await embedGate(live);
    for (const { eventId, videoId } of live) {
      const r = seen[eventId];
      if (!r) {
        // NOT the same as blocked. Reporting it as blocked would invite
        // "repairing" videos that are perfectly fine.
        console.log(`  ????  ${eventId.padEnd(26)} ${videoId}  no verdict — inconclusive, re-run`);
        inconclusive.add(eventId);
      } else if (r.state === 'ready') {
        console.log(`  PLAYS ${eventId.padEnd(26)} ${videoId}`);
      } else {
        const why = EMBED_BLOCKED.has(r.code) ? 'embedding disabled by owner' : 'player error';
        console.log(`  BLOCK ${eventId.padEnd(26)} ${videoId}  code ${r.code} (${why})`);
        blocked.add(eventId);
      }
    }
    const played = live.length - blocked.size - inconclusive.size;
    console.log(`\n${played}/${live.length} resolving ids actually play when embedded.`);
    if (inconclusive.size) {
      console.log(`${inconclusive.size} gave no verdict — unproven either way, not a failure. Re-run to settle them.`);
    }
  } catch (err) {
    console.error(`\nEmbed gate could not run: ${err.message}`);
    console.error('Start the browser (gsd-browser daemon start) or pass --no-embed-check.');
    process.exit(1);
  }
} else if (flags.includes('--no-embed-check')) {
  console.log('\nEmbed gate SKIPPED — ids may resolve and still refuse to play in the app.');
}

const passing = live.filter((r) => !blocked.has(r.eventId) && !inconclusive.has(r.eventId));

if (auditMode) {
  console.log(`\nAudit: ${passing.length}/${results.length} shipped ids proven healthy.`);
  const broken = results.filter((r) => !r.ok || blocked.has(r.eventId));
  if (broken.length) {
    console.log('Needs replacing:');
    for (const b of broken) console.log(`  ${b.eventId}  ${b.videoId}`);
    process.exitCode = 1;
  } else {
    console.log('Nothing needs replacing.');
  }
  if (inconclusive.size) {
    console.log(`Unproven this run (re-run to settle): ${[...inconclusive].join(', ')}`);
  }
} else if (flags.includes('--write')) {
  let existing = {};
  try { existing = JSON.parse(await readFile(OUT, 'utf8')); } catch { /* first run */ }
  const additions = Object.fromEntries(passing.map((r) => [r.eventId, r.videoId]));
  const merged = Object.fromEntries(
    Object.entries({ ...existing, ...additions }).sort(([a], [b]) => a.localeCompare(b)),
  );
  await writeFile(OUT, `${JSON.stringify(merged, null, 2)}\n`);
  const changed = Object.keys(additions).filter((k) => existing[k] !== additions[k]).length;
  console.log(`\nMerged ${changed} id(s) into ${OUT} — ${Object.keys(merged).length} total.`);
}
