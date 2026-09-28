import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { buildTimeline } from '@/data/events';
import {
  TimelineContext, validateBirthDate, type Profile, type Store,
} from '@/state/timeline-context';
import { DEFAULT_BIRTH_DATE, SEED_PERSONAL_EVENTS } from '@/data/personal';
import type { PersonalEvent } from '@/data/types';

const STORAGE_KEY = 'mirror-history/profile/v1';

const DEFAULT_PROFILE: Profile = {
  birthDate: DEFAULT_BIRTH_DATE,
  ownerName: '',
  personalEvents: SEED_PERSONAL_EVENTS,
  configured: false,
};

function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw) as Partial<Profile>;
    // A stored date that no longer validates must not brick the app.
    const birthDate = typeof parsed.birthDate === 'string' && !validateBirthDate(parsed.birthDate)
      ? parsed.birthDate
      : DEFAULT_PROFILE.birthDate;

    return {
      birthDate,
      ownerName: typeof parsed.ownerName === 'string' ? parsed.ownerName : '',
      personalEvents: Array.isArray(parsed.personalEvents)
        ? parsed.personalEvents
        : SEED_PERSONAL_EVENTS,
      configured: Boolean(parsed.configured),
    };
  } catch {
    // Private browsing, cleared storage, corrupt JSON — start fresh rather than fail.
    return DEFAULT_PROFILE;
  }
}

export function TimelineProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(loadProfile);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Quota exceeded or storage blocked. The session still works in memory;
      // silently losing the write is better than losing the app.
    }
  }, [profile]);

  // Rebuilding both rails is a few milliseconds over ~200 events, so the birth
  // date can change as often as the user likes without any incremental update
  // machinery to keep correct.
  const timeline = useMemo(
    () => buildTimeline(profile.birthDate, profile.personalEvents),
    [profile.birthDate, profile.personalEvents],
  );

  const setBirthDate = useCallback((iso: string, ownerName?: string) => {
    if (validateBirthDate(iso)) return;
    setProfile((current) => ({
      ...current,
      birthDate: iso,
      ownerName: ownerName ?? current.ownerName,
      configured: true,
      // The seeded "Born" marker must follow the date it marks.
      personalEvents: current.personalEvents.map((e) =>
        (e.id === 'me-birth' ? { ...e, date: iso } : e)),
    }));
  }, []);

  const setOwnerName = useCallback((name: string) => {
    setProfile((current) => ({ ...current, ownerName: name }));
  }, []);

  const addPersonalEvents = useCallback((events: PersonalEvent[]) => {
    setProfile((current) => {
      const merged = new Map(current.personalEvents.map((e) => [e.id, e]));
      for (const event of events) merged.set(event.id, event);
      return { ...current, personalEvents: [...merged.values()] };
    });
  }, []);

  const removePersonalEvents = useCallback((predicate: (event: PersonalEvent) => boolean) => {
    setProfile((current) => ({
      ...current,
      personalEvents: current.personalEvents.filter((e) => !predicate(e)),
    }));
  }, []);

  const resetPersonalEvents = useCallback(() => {
    setProfile((current) => ({ ...current, personalEvents: SEED_PERSONAL_EVENTS }));
  }, []);

  const value = useMemo<Store>(() => ({
    profile, timeline, setBirthDate, setOwnerName,
    addPersonalEvents, removePersonalEvents, resetPersonalEvents,
  }), [profile, timeline, setBirthDate, setOwnerName,
    addPersonalEvents, removePersonalEvents, resetPersonalEvents]);

  return <TimelineContext.Provider value={value}>{children}</TimelineContext.Provider>;
}
