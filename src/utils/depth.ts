import {
  DEPTH_HALF, FADE_RANGE, FADE_START, MAX_BLUR, MAX_DEPTH, MAX_YAW_DEG,
  MIN_OPACITY, PERSPECTIVE, YAW_FALLOFF,
} from '@/config/timeline';

export interface DepthStyle {
  /** Foreshortening factor, 1 at the cursor and shrinking with distance. */
  scale: number;
  /** Horizontal offset AFTER projection — the rails converge toward centre. */
  projectedDx: number;
  yawDeg: number;
  opacity: number;
  blurPx: number;
  /** 0 at the cursor, 1 at the fade limit. Used for text detail thresholds. */
  defocus: number;
}

/**
 * Turns a card's signed horizontal offset from the focus cursor into its
 * placement on the rail.
 *
 * Depth is expressed as a 2D `scale`, not a `translateZ`. That is not a
 * cosmetic choice: a translateZ inside a `perspective` context makes Chrome
 * dispatch real pointer events to the element *behind* the card, so every card
 * became unclickable while `elementsFromPoint` still cheerfully reported the
 * card as the topmost hit. A plain rotateY does not have the problem, so the
 * slant is kept.
 *
 * Nothing is lost visually, because the perspective projection of a pure
 * translateZ *is* a uniform scale about the vanishing point plus a horizontal
 * pull toward it. Both are computed here with the same PERSPECTIVE constant, so
 * the geometry matches what the 3D version drew:
 *
 *   scale       = P / (P + |z|)
 *   projectedDx = dx * scale
 */
export function depthStyleFor(dx: number): DepthStyle {
  const d = Math.abs(dx);

  // Depth saturates rather than growing linearly, so distant cards recede
  // convincingly instead of collapsing onto the vanishing point.
  const depth = MAX_DEPTH * (d / (d + DEPTH_HALF));

  const scale = PERSPECTIVE / (PERSPECTIVE + depth);
  const projectedDx = dx * scale;
  const yawDeg = -Math.sign(dx) * Math.min(d / YAW_FALLOFF, MAX_YAW_DEG);

  // Nothing fades inside FADE_START — the reading zone stays crisp.
  const t = Math.max(0, d - FADE_START) / FADE_RANGE;
  const defocus = Math.min(1, t);
  const opacity = Math.max(MIN_OPACITY, 1 - Math.pow(defocus, 1.45));
  const blurPx = Number((defocus * MAX_BLUR).toFixed(2));

  return { scale, projectedDx, yawDeg, opacity, blurPx, defocus };
}
