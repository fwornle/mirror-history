import type { CategoryId } from '@/config/categories';

/** Which rail an event belongs to. Derived from the date, never authored. */
export type RailId = 'forward' | 'mirror';

export interface MediaRef {
  /**
   * A YouTube video id that has been checked against the oEmbed endpoint by
   * `scripts/verify-youtube.mjs`. Only verified ids are embedded — an unchecked
   * id renders as a dead player, which is worse than no player.
   */
  youtubeId?: string;
  /** Always present as a fallback: opens a YouTube search in a new tab. */
  youtubeQuery?: string;
  /** English Wikipedia page title, used to lazily pull a summary + thumbnail. */
  wiki?: string;
}

export interface WorldEvent extends MediaRef {
  id: string;
  /** ISO date. Day precision where it matters, 1 January where it does not. */
  date: string;
  title: string;
  description: string;
  category: Exclude<CategoryId, 'personal'>;
  /**
   * 3 = era-defining, 2 = widely remembered, 1 = notable.
   * Drives card size and which events survive at low zoom.
   */
  weight: 1 | 2 | 3;
}

export interface PersonalEvent extends MediaRef {
  id: string;
  date: string;
  title: string;
  description?: string;
  /**
   * Defaults to 3 (a milestone). Imported social posts arrive by the hundred,
   * so they come in lower and yield their lane to real world events.
   */
  weight?: 1 | 2 | 3;
  /** Where this came from, so an import can be undone without touching hand-entered events. */
  source?: 'manual' | 'facebook' | 'instagram';
}

/** A world or personal event resolved onto a rail. */
export interface PlacedEvent {
  id: string;
  rail: RailId;
  date: Date;
  title: string;
  description: string;
  category: CategoryId;
  weight: 1 | 2 | 3;
  /** Signed years between the event and the birth date, always >= 0. */
  yearsFromBirth: number;
  /** Row within the rail, assigned so that neighbours do not overlap. */
  lane: number;
  media: MediaRef;
}
