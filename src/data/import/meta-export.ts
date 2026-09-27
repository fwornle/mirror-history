import type { PersonalEvent } from '../types';

/**
 * Reads personal events out of a Meta "Download Your Information" export
 * (Facebook or Instagram), in JSON format.
 *
 * Why an export and not an API login:
 *
 *  - Instagram's APIs require the account to be a *professional* (business or
 *    creator) account. A personal Instagram account cannot be read through the
 *    API at all, at any permission level.
 *  - Reading a person's Facebook posts needs permissions that only clear Meta's
 *    App Review for an approved business use case.
 *  - The OAuth code-for-token exchange requires the app *secret*, which cannot
 *    live in a browser app — it needs a server.
 *
 * The export has none of those problems: it covers personal accounts, needs no
 * app registration, review or backend, and the file never leaves the machine.
 * It is also richer — it carries the birthday, and work and education history,
 * which the post APIs do not expose at all.
 */

export interface ImportResult {
  events: PersonalEvent[];
  /** Birthday found in the export, ISO — offered as the inflection point. */
  birthDate?: string;
  ownerName?: string;
  source: 'facebook' | 'instagram';
  /** Human-readable account of what was read, shown in the UI. */
  notes: string[];
}

/**
 * Meta writes UTF-8 bytes escaped as if they were Latin-1, so an accented word
 * arrives mangled. Reinterpreting the code points as bytes and decoding as
 * UTF-8 undoes it. Anything that fails to round-trip is left exactly as it was.
 */
export function fixMetaText(input: string): string {
  if (!/[Â-Ã][-¿]/.test(input)) return input;
  try {
    const bytes = Uint8Array.from([...input].map((ch) => ch.charCodeAt(0) & 0xff));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return input;
  }
}

const isoFromUnix = (seconds: number): string | null => {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  // Meta uses seconds; guard against a stray milliseconds value.
  const ms = seconds > 1e12 ? seconds : seconds * 1000;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  if (year < 1900 || year > 2100) return null;
  return date.toISOString().slice(0, 10);
};

const clean = (value: unknown): string =>
  (typeof value === 'string' ? fixMetaText(value).replace(/\s+/g, ' ').trim() : '');

const truncate = (text: string, max: number) =>
  (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`);

/** Stable id so re-importing the same export updates rather than duplicates. */
function makeId(source: string, iso: string, text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  return `${source}-${iso}-${(hash >>> 0).toString(36)}`;
}

type Json = unknown;
const asRecord = (v: Json): Record<string, Json> | null =>
  (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, Json> : null);

/* --- profile: birthday, name, work and education ------------------------- */

function readFacebookProfile(root: Record<string, Json>, out: ImportResult): void {
  const profile = asRecord(root.profile_v2) ?? asRecord(root.profile);
  if (!profile) return;

  const name = asRecord(profile.name);
  if (name) out.ownerName = clean(name.full_name) || undefined;

  const birthday = asRecord(profile.birthday);
  if (birthday) {
    const y = Number(birthday.year);
    const m = Number(birthday.month);
    const d = Number(birthday.day);
    if (y > 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      out.birthDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      out.notes.push(`Found your birthday in the export: ${out.birthDate}.`);
    }
  }

  // Work and education are the strongest life events in the whole export:
  // dated, titled, and genuinely milestones rather than chatter.
  for (const raw of (Array.isArray(profile.education_experiences) ? profile.education_experiences : [])) {
    const entry = asRecord(raw);
    if (!entry) continue;
    const iso = isoFromUnix(Number(entry.start_timestamp));
    const school = clean(entry.name);
    if (!iso || !school) continue;
    out.events.push({
      id: makeId('fb-edu', iso, school),
      date: iso,
      title: `Started at ${school}`,
      description: clean(entry.school_type) || undefined,
      weight: 3,
      source: 'facebook',
    });
  }

  for (const raw of (Array.isArray(profile.work_experiences) ? profile.work_experiences : [])) {
    const entry = asRecord(raw);
    if (!entry) continue;
    const iso = isoFromUnix(Number(entry.start_timestamp));
    const employer = clean(entry.employer);
    if (!iso || !employer) continue;
    const title = clean(entry.title);
    out.events.push({
      id: makeId('fb-work', iso, employer + title),
      date: iso,
      title: title ? `${title} at ${employer}` : `Started at ${employer}`,
      weight: 3,
      source: 'facebook',
    });
  }

  for (const raw of (Array.isArray(profile.places_lived) ? profile.places_lived : [])) {
    const entry = asRecord(raw);
    if (!entry) continue;
    const iso = isoFromUnix(Number(entry.start_timestamp));
    const place = clean(entry.place);
    if (!iso || !place) continue;
    out.events.push({
      id: makeId('fb-place', iso, place),
      date: iso,
      title: `Moved to ${place}`,
      weight: 3,
      source: 'facebook',
    });
  }
}

function readInstagramProfile(root: Record<string, Json>, out: ImportResult): void {
  const users = Array.isArray(root.profile_user) ? root.profile_user : [];
  for (const raw of users) {
    const map = asRecord(asRecord(raw)?.string_map_data);
    if (!map) continue;
    for (const [key, value] of Object.entries(map)) {
      const text = clean(asRecord(value)?.value);
      if (!text) continue;
      if (/^name$/i.test(key)) out.ownerName = text;
      if (/date of birth|birth date|birthday/i.test(key) && /^\d{4}-\d{2}-\d{2}$/.test(text)) {
        out.birthDate = text;
        out.notes.push(`Found your date of birth in the export: ${text}.`);
      }
    }
  }
}

/* --- posts: generic harvest --------------------------------------------- */

const TEXT_KEYS = ['post', 'caption', 'description', 'title', 'text', 'name'];
const TIME_KEYS = ['timestamp', 'creation_timestamp', 'creation_time', 'start_timestamp'];

/**
 * Meta reshuffles these files between export versions, so rather than matching
 * an exact schema this walks the whole tree and keeps any object that carries
 * both a plausible unix timestamp and some text. It is deliberately forgiving:
 * a missed post is a nuisance, a crash on an unrecognised file is a dead end.
 */
function harvestPosts(
  node: Json,
  source: 'facebook' | 'instagram',
  found: PersonalEvent[],
  depth = 0,
): void {
  if (depth > 12 || found.length > 5000) return;

  if (Array.isArray(node)) {
    for (const child of node) harvestPosts(child, source, found, depth + 1);
    return;
  }

  const record = asRecord(node);
  if (!record) return;

  let seconds = 0;
  for (const key of TIME_KEYS) {
    const value = Number(record[key]);
    if (Number.isFinite(value) && value > 0) { seconds = value; break; }
  }

  if (seconds) {
    const iso = isoFromUnix(seconds);
    if (iso) {
      // Gather every candidate before choosing. A real Facebook post carries an
      // auto-generated `title` ("X updated his status.") alongside the actual
      // words in `data[].post`, so picking the longest field first and only
      // then rejecting boilerplate would throw the post away with its label.
      const candidates: string[] = [];
      const collect = (source: Record<string, Json>) => {
        for (const key of TEXT_KEYS) {
          const candidate = clean(source[key]);
          if (candidate) candidates.push(candidate);
        }
      };

      collect(record);
      for (const raw of (Array.isArray(record.data) ? record.data : [])) {
        const entry = asRecord(raw);
        if (entry) collect(entry);
      }

      // Meta's auto-generated titles carry no information worth a card.
      const boilerplate = /(updated (his|her|their) (status|cover photo|profile picture)|shared a (link|memory)|added \d+ new photos?)/i;

      const text = candidates
        .filter((candidate) => !boilerplate.test(candidate))
        .reduce((best, candidate) => (candidate.length > best.length ? candidate : best), '');

      if (text.length > 2) {
        found.push({
          id: makeId(source, iso, text),
          date: iso,
          title: truncate(text, 78),
          description: text.length > 78 ? text : undefined,
          weight: 1,
          source,
        });
      }
    }
  }

  for (const value of Object.values(record)) {
    if (value && typeof value === 'object') harvestPosts(value, source, found, depth + 1);
  }
}

/* --- entry point --------------------------------------------------------- */

/** Sniffs which export a file came from, since filenames are not reliable. */
function detectSource(filename: string, root: Json): 'facebook' | 'instagram' {
  const name = filename.toLowerCase();
  if (name.includes('instagram') || name.includes('_ig')) return 'instagram';
  const record = asRecord(root);
  if (record && ('profile_user' in record || 'ig_other_media' in record)) return 'instagram';
  return 'facebook';
}

export function parseMetaExport(filename: string, text: string): ImportResult {
  let root: Json;
  try {
    root = JSON.parse(text);
  } catch {
    throw new Error(`${filename} is not valid JSON. Choose "JSON" rather than "HTML" when requesting the export from Meta.`);
  }

  const source = detectSource(filename, root);
  const result: ImportResult = { events: [], source, notes: [] };
  const record = asRecord(root);

  if (record) {
    if (source === 'facebook') readFacebookProfile(record, result);
    else readInstagramProfile(record, result);
  }

  const milestones = result.events.length;
  if (milestones) {
    result.notes.push(`${milestones} milestone${milestones === 1 ? '' : 's'} from your profile (work, study, moves).`);
  }

  // Only harvest posts when the file is not purely a profile document, so a
  // profile import does not also scrape its own education entries as "posts".
  const posts: PersonalEvent[] = [];
  if (!record || !('profile_v2' in record)) {
    harvestPosts(root, source, posts);
  }

  const seen = new Set(result.events.map((e) => e.id));
  for (const post of posts) {
    if (seen.has(post.id)) continue;
    seen.add(post.id);
    result.events.push(post);
  }

  if (posts.length) {
    result.notes.push(`${posts.length} dated post${posts.length === 1 ? '' : 's'}.`);
  }
  if (!result.events.length) {
    result.notes.push('No dated entries recognised. Try posts, profile_information or personal_information from the export.');
  }

  return result;
}
