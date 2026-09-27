import {
  DEPTH_HALF, FADE_RANGE, FADE_START, MAX_BLUR, MAX_DEPTH, MAX_YAW_DEG,
  MIN_OPACITY, YAW_FALLOFF,
} from '@/config/timeline';

export interface DepthStyle {
  z: number;
  yawDeg: number;
  opacity: number;
  blurPx: number;
  /** 0 at the cursor, 1 at the fade limit. Used for text detail thresholds. */
  defocus: number;
}

/**
 * Turns a card's signed horizontal offset from the focus cursor into its 3D
 * placement. Depth saturates instead of growing linearly so that distant cards
 * recede convincingly without collapsing onto the vanishing point.
 */
export function depthStyleFor(dx: number): DepthStyle {
  const d = Math.abs(dx);

  const z = -MAX_DEPTH * (d / (d + DEPTH_HALF));
  const yawDeg = -Math.sign(dx) * Math.min(d / YAW_FALLOFF, MAX_YAW_DEG);

  // Nothing fades inside FADE_START — the reading zone stays crisp.
  const t = Math.max(0, d - FADE_START) / FADE_RANGE;
  const defocus = Math.min(1, t);
  const opacity = Math.max(MIN_OPACITY, 1 - Math.pow(defocus, 1.45));
  const blurPx = Number((defocus * MAX_BLUR).toFixed(2));

  return { z, yawDeg, opacity, blurPx, defocus };
}
