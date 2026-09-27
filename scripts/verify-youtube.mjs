#!/usr/bin/env node
/**
 * Check candidate YouTube ids before they are allowed near the app.
 *
 * A guessed id is worse than no id: the card silently plays the wrong video,
 * or a dead player. This asks YouTube's oEmbed endpoint for each candidate and
 * prints the real title and channel, so a human can confirm the video actually
 * matches the event before it is written into youtube-verified.json.
 *
 *   node scripts/verify-youtube.mjs candidates.json        # report only
 *   node scripts/verify-youtube.mjs candidates.json --write # write verified ids
 *
 * candidates.json: { "<event id>": "<youtube id>", ... }
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '../src/data/youtube-verified.json');

const [, , candidatesPath, ...flags] = process.argv;
if (!candidatesPath) {
  console.error('usage: node scripts/verify-youtube.mjs <candidates.json> [--write]');
  process.exit(2);
}

const candidates = JSON.parse(await readFile(resolve(process.cwd(), candidatesPath), 'utf8'));

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

if (flags.includes('--write')) {
  const map = Object.fromEntries(live.map((r) => [r.eventId, r.videoId]));
  await writeFile(OUT, `${JSON.stringify(map, null, 2)}\n`);
  console.log(`\nWrote ${Object.keys(map).length} ids to ${OUT}`);
}
