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
/** Used only until the rail has been measured, and as a lower bound. */
export const MIN_LANE_HEIGHT = 120;
/** A lane this tall has room for a thumbnail as well as text. */
export const LANE_HEIGHT_FOR_IMAGE = 230;

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
