/**
 * Geometry and motion constants for the two mirrored rails.
 *
 * The whole visualisation is driven by one scalar: `offset`, measured in years
 * from the birth date. Both rails read it the same way —
 *
 *   forward rail shows  birth + offset
 *   mirror  rail shows  birth − offset
 *
 * so an event's distance from birth, not its calendar date, is its coordinate.
 * That is what makes the two axes mirror each other.
 */

/** Horizontal pixels per year at each zoom step. Index into ZOOM_LEVELS. */
export const ZOOM_LEVELS = [18, 32, 56, 96, 168, 290] as const;
export const DEFAULT_ZOOM_INDEX = 2;

/**
 * Level of detail, parallel to ZOOM_LEVELS: the lowest event weight drawn at
 * each zoom step. A busy decade holds far more events than three lanes can
 * show without overlapping, so zooming out drops the minor ones rather than
 * stacking unreadable cards. Zooming back in returns them.
 */
export const MIN_WEIGHT_BY_ZOOM = [3, 2, 1, 1, 1, 1] as const;

/** Card footprint used for lane packing and culling. */
export const CARD_WIDTH = 236;
export const CARD_GAP = 14;
export const LANES_PER_RAIL = 3;

/**
 * Card height with no description — category row, a two-line title, the footer
 * carrying the badges, and the padding. Measured across the real deck at the
 * widest it gets (titles vary with weight, so this is the max, not the mean).
 */
export const CARD_CHROME_HEIGHT = 114;
/** The card's own border, which `box-sizing: border-box` charges to max-height. */
export const CARD_BORDER_HEIGHT = 2;
/** Computed line box of `.card__body` — 11.5px at line-height 1.42. */
export const CARD_BODY_LINE_HEIGHT = 16.33;
/** `.card__body`'s top margin, paid for as soon as there is a body at all. */
export const CARD_BODY_MARGIN = 6;
/** Description lines worth reading on a rail: a little more once in focus. */
export const CARD_BODY_LINES = 3;
export const CARD_BODY_LINES_FOCUSED = 4;
/** Slack a card leaves between itself and the lane above. */
export const CARD_LANE_SLACK = 8;

/**
 * The shortest lane that can show a *whole* card. This is the unit lanes are
 * fitted in, and it is deliberately the complete card rather than some
 * comfortable-looking round number: a card whose footer is sliced off has lost
 * the badges that say it opens at all, which is the one affordance the rails
 * depend on.
 */
export const MIN_LANE_HEIGHT =
  CARD_CHROME_HEIGHT + CARD_BORDER_HEIGHT + CARD_LANE_SLACK;

/** A lane this tall has room for a thumbnail as well as text. */
export const LANE_HEIGHT_FOR_IMAGE = 230;

/**
 * How many lines of description a lane of this height can actually hold.
 *
 * Returning 0 means "no room for a paragraph" — the card then draws heading
 * and badges only. That beats letting `overflow: hidden` slice the text
 * mid-sentence and take the footer with it, which is what a landscape phone
 * used to look like.
 */
export function bodyLinesFor(laneHeight: number, focused: boolean): number {
  // Everything the paragraph is *not* allowed to spend: the lane slack, the
  // border max-height charges for, the fixed chrome, and the body's own margin.
  const room = laneHeight
    - CARD_LANE_SLACK - CARD_BORDER_HEIGHT - CARD_CHROME_HEIGHT - CARD_BODY_MARGIN;
  const cap = focused ? CARD_BODY_LINES_FOCUSED : CARD_BODY_LINES;
  return Math.max(0, Math.min(cap, Math.floor(room / CARD_BODY_LINE_HEIGHT)));
}

/**
 * How many lanes actually fit in a rail, and how tall each one is.
 *
 * LANES_PER_RAIL is a ceiling, not a promise. Treating it as a promise is what
 * put the outer lane off-screen on a phone: a 250px rail was still asked for
 * three lanes, and because lane height was merely *floored* at MIN_LANE_HEIGHT
 * the third one started 240px up with 10px to live in. `overflow: hidden` ate
 * it, so the rail looked like it held one lane of cards and no way to reach the
 * rest.
 *
 * Deriving the count from the measured height instead means the outermost lane
 * is always the last one that genuinely fits. A short viewport then shows
 * *fewer* events — which the bottom bar's "N of M" already reports, and which
 * zooming in undoes — rather than pretending to show events it has clipped
 * away. Nothing is ever placed where it cannot be seen, so there is nothing to
 * scroll to.
 */
export function laneGeometry(sceneHeight: number): { lanes: number; laneHeight: number } {
  // Before the first measurement, assume the full rack; the real numbers
  // arrive on the same frame the ResizeObserver first fires.
  if (!sceneHeight) return { lanes: LANES_PER_RAIL, laneHeight: MIN_LANE_HEIGHT };

  const lanes = Math.max(
    1, // one cramped lane still beats an empty rail
    Math.min(LANES_PER_RAIL, Math.floor(sceneHeight / MIN_LANE_HEIGHT)),
  );
  return { lanes, laneHeight: sceneHeight / lanes };
}

/**
 * Depth falls off asymptotically rather than linearly: a linear ramp sends far
 * cards racing to the vanishing point and piles them on top of each other.
 * z(d) = -MAX_DEPTH * d / (d + DEPTH_HALF)  — half of max depth at DEPTH_HALF px.
 */
export const MAX_DEPTH = 760;
export const DEPTH_HALF = 900;
export const PERSPECTIVE = 1500;

/** Cards yaw toward the focus cursor, like a rack of slides seen edge-on. */
export const MAX_YAW_DEG = 46;
export const YAW_FALLOFF = 12;

/** Fade and defocus: "further out of focus is increasingly faded". */
export const FADE_START = 180;
export const FADE_RANGE = 1350;
export const MIN_OPACITY = 0.05;
export const MAX_BLUR = 4.2;

/** Beyond this screen distance a card is not rendered at all (viewport culling). */
export const CULL_DISTANCE = 1900;

/** A card this close to the cursor is "in focus" — full size, video playable. */
export const FOCUS_RADIUS = 90;

/** Scroll feel. */
export const WHEEL_YEARS_PER_PIXEL = 0.0016;
export const DRAG_MULTIPLIER = 1;
export const FRICTION = 0.92;
export const MIN_VELOCITY = 0.00015;
/** Easing per frame when animating to a clicked card. */
export const GLIDE_EASE = 0.14;

/** How far past the ends of the data the rails may be scrolled. */
export const OVERSCROLL_YEARS = 3;
