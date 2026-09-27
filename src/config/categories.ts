/**
 * Event categories and their colour tokens.
 *
 * The six world-history hues were selected by optimisation against this app's
 * dark surface (#0f172a) and then verified with the data-viz palette validator
 * on the *all-pairs* pairlist (cards scatter freely, so every pair can end up
 * side by side). Result: all checks pass — worst pair 18.6 delta-E normal
 * vision, 8.3 under simulated deuteranopia.
 *
 * 8.3 sits just over the CVD floor, which makes secondary encoding mandatory:
 * every card renders its category *name* and glyph, so colour never carries the
 * distinction alone. Do not add a seventh hue or re-step these without
 * re-running the validator.
 *
 * `personal` is deliberately not a hue. Your own life renders as an inverted
 * light card, which separates it from all six world hues structurally rather
 * than chromatically — legible in any form of colour vision.
 */

export type CategoryId =
  | 'conflict'
  | 'disaster'
  | 'science'
  | 'space'
  | 'sport'
  | 'culture'
  | 'personal';

export interface Category {
  id: CategoryId;
  /** Shown on every card — the secondary encoding the CVD margin depends on. */
  label: string;
  glyph: string;
  /** Base hue. Cards tint themselves from this; never used as text colour. */
  hue: string;
  description: string;
}

export const CATEGORIES: Record<CategoryId, Category> = {
  conflict: {
    id: 'conflict',
    label: 'Politics & conflict',
    glyph: '⚔',
    hue: '#dc193d',
    description: 'Wars, revolutions, treaties, elections, the fall and rise of states.',
  },
  disaster: {
    id: 'disaster',
    label: 'Disaster',
    glyph: '🌊',
    hue: '#ce7f00',
    description: 'Earthquakes, floods, storms, pandemics, industrial catastrophe.',
  },
  science: {
    id: 'science',
    label: 'Science & technology',
    glyph: '⚛',
    hue: '#009fde',
    description: 'Discoveries, inventions, medicine, computing.',
  },
  space: {
    id: 'space',
    label: 'Space & exploration',
    glyph: '🚀',
    hue: '#4254df',
    description: 'Spaceflight, astronomy, and reaching the unreached places on Earth.',
  },
  sport: {
    id: 'sport',
    label: 'Sport',
    glyph: '🏅',
    hue: '#37ac69',
    description: 'Olympic Games, World Cups, records that outlived their decade.',
  },
  culture: {
    id: 'culture',
    label: 'Culture & arts',
    glyph: '🎭',
    hue: '#ab2ca7',
    description: 'Music, film, literature, art, and the moments that shifted taste.',
  },
  personal: {
    id: 'personal',
    label: 'Your life',
    glyph: '★',
    hue: '#f2c14e',
    description: 'Events from your own timeline.',
  },
};

export const WORLD_CATEGORY_IDS: CategoryId[] = [
  'conflict',
  'disaster',
  'science',
  'space',
  'sport',
  'culture',
];

export const ALL_CATEGORY_IDS: CategoryId[] = [...WORLD_CATEGORY_IDS, 'personal'];
