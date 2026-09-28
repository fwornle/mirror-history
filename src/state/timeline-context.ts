/**
 * The timeline store's shape and how to reach it.
 *
 * Deliberately separate from the provider that fills it. A module that exports
 * a component must export nothing else for React's fast refresh to replace it
 * in place — mixing the provider component with this hook meant every edit to
 * either one did a full reload and dropped the app's state. Consumers want the
 * hook, not the provider, so this is also the import almost every file makes.
 */
import { createContext, useContext } from 'react';
import type { Timeline } from '@/data/events';
import type { PersonalEvent } from '@/data/types';

export interface Profile {
  /** The inflection point. Every derived value hangs off this one date. */
  birthDate: string;
  ownerName: string;
  personalEvents: PersonalEvent[];
  /** False until the user has set their own date, which triggers the setup card. */
  configured: boolean;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A birth date must be a real, past calendar date — reject anything else. */
export function validateBirthDate(value: string): string | null {
  if (!ISO_DATE.test(value)) return 'Use the format YYYY-MM-DD.';
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return 'That is not a real date.';
  // Round-trip guards against 2025-02-30 silently becoming 2 March.
  if (date.toISOString().slice(0, 10) !== value) return 'That day does not exist in that month.';
  if (date.getTime() > Date.now()) return 'A birth date cannot be in the future.';
  if (date.getUTCFullYear() < 1900) return 'Dates before 1900 are outside the dataset.';
  return null;
}

export interface Store {
  profile: Profile;
  timeline: Timeline;
  setBirthDate: (iso: string, ownerName?: string) => void;
  setOwnerName: (name: string) => void;
  /** Merge events in, replacing any with the same id. */
  addPersonalEvents: (events: PersonalEvent[]) => void;
  removePersonalEvents: (predicate: (event: PersonalEvent) => boolean) => void;
  resetPersonalEvents: () => void;
}

/** Exported for the provider only; everything else goes through `useTimeline`. */
export const TimelineContext = createContext<Store | null>(null);

export function useTimeline(): Store {
  const store = useContext(TimelineContext);
  if (!store) throw new Error('useTimeline must be used inside a TimelineProvider');
  return store;
}
