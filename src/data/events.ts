import { WORLD_EVENTS } from './history';
import type { MediaRef, PersonalEvent, PlacedEvent, RailId } from './types';
import { parseDate, precisionOf, yearsBetween } from '@/utils/time';
import verified from './youtube-verified.json';

/** Verified, inline-playable YouTube ids, keyed by event id. */
const VERIFIED_IDS = verified as Record<string, string>;

export interface Timeline {
  birth: Date;
  forward: PlacedEvent[];
  mirror: PlacedEvent[];
  /** Every event on either rail, for search. */
  all: PlacedEvent[];
  /** Date precision per event id, so cards print "1885" not "1 January 1885". */
  precision: Record<string, 'day' | 'year'>;
  /** Years from birth to today — where the forward rail meets the present. */
  yearsLived: number;
  /** The furthest either rail reaches, used to clamp scrolling. */
  maxSpan: number;
  events: (rail: RailId) => PlacedEvent[];
}

interface Input {
  id: string;
  date: string;
  title: string;
  description: string;
  category: PlacedEvent['category'];
  weight: PlacedEvent['weight'];
  media: MediaRef;
}

const byDistance = (a: PlacedEvent, b: PlacedEvent) => a.yearsFromBirth - b.yearsFromBirth;

/**
 * Builds both rails for a given birth date.
 *
 * This is a pure function of (birth date, personal events) rather than a set of
 * module constants, because the birth date is the user's to choose and can
 * change at runtime. Every derived value — which rail an event lands on, its
 * distance from the origin, the span of the scrollbar — falls out of it, so
 * changing the date rebuilds the whole timeline rather than patching it.
 */
export function buildTimeline(birthISO: string, personalEvents: PersonalEvent[]): Timeline {
  const birth = parseDate(birthISO);
  const precision: Record<string, 'day' | 'year'> = {};

  const place = ({ id, date: iso, title, description, category, weight, media }: Input): PlacedEvent => {
    const date = parseDate(iso);
    const delta = yearsBetween(birth, date);
    precision[id] = precisionOf(iso);

    return {
      id,
      // On or after birth is your life; before it belongs to the mirror.
      rail: delta >= 0 ? 'forward' : 'mirror',
      date, title, description, category, weight,
      // Both rails measure outward from birth, so the coordinate is always >= 0.
      // That is the whole mirror: the same distance means the same screen x.
      yearsFromBirth: Math.abs(delta),
      lane: 0,
      media: { ...media, youtubeId: VERIFIED_IDS[id] ?? media.youtubeId },
    };
  };

  const world = WORLD_EVENTS.map((e) => place({
    id: e.id, date: e.date, title: e.title, description: e.description,
    category: e.category, weight: e.weight,
    media: { youtubeId: e.youtubeId, youtubeQuery: e.youtubeQuery, wiki: e.wiki },
  }));

  const personal = personalEvents.map((e) => place({
    id: e.id, date: e.date, title: e.title, description: e.description ?? '',
    category: 'personal', weight: e.weight ?? 3,
    media: { youtubeId: e.youtubeId, youtubeQuery: e.youtubeQuery, wiki: e.wiki },
  }));

  const all = [...world, ...personal];
  const forward = all.filter((e) => e.rail === 'forward').sort(byDistance);
  const mirror = all.filter((e) => e.rail === 'mirror').sort(byDistance);

  const yearsLived = yearsBetween(birth, new Date());
  const maxSpan = Math.max(
    yearsLived,
    forward.at(-1)?.yearsFromBirth ?? 0,
    mirror.at(-1)?.yearsFromBirth ?? 0,
  );

  return {
    birth, forward, mirror, all, precision, yearsLived, maxSpan,
    events: (rail) => (rail === 'forward' ? forward : mirror),
  };
}
