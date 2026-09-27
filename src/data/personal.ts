import type { PersonalEvent } from './types';

/* ===========================================================================
 *  Your own data.
 * ===========================================================================
 *
 * Nothing here is authoritative any more — the birth date and your personal
 * events are set in the app itself (the ⚙ button) and kept in the browser's
 * local storage, so every user of the same build gets their own inflection
 * point. These values are only the starting point for someone who has never
 * opened it before.
 *
 * You can still edit them if you would rather bake your own defaults into the
 * build than type them in.
 */

/** Used until the user sets their own date. */
export const DEFAULT_BIRTH_DATE = '1975-06-15';

/**
 * Seeded so the timeline is never empty on first run. The setup card invites
 * the user to replace them; `me-birth` is kept in step with the chosen date.
 */
export const SEED_PERSONAL_EVENTS: PersonalEvent[] = [
  {
    id: 'me-birth',
    date: DEFAULT_BIRTH_DATE,
    title: 'Born',
    description:
      'The origin of both rails. Everything to the right of here is your life; ' +
      'everything on the lower rail is the same stretch of time running backwards.',
  },
];
