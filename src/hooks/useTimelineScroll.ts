import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_ZOOM_INDEX, DRAG_MULTIPLIER, FRICTION, GLIDE_EASE, MIN_VELOCITY,
  OVERSCROLL_YEARS, WHEEL_YEARS_PER_PIXEL, ZOOM_LEVELS,
} from '@/config/timeline';

interface Options {
  /** Largest distance-from-birth present in the data, in years. */
  maxSpan: number;
  /** Where the cursor starts, in years from birth. */
  initialOffset?: number;
}

export interface TimelineScroll {
  /** Years from birth. The single number the whole visualisation reads. */
  offset: number;
  pxPerYear: number;
  zoomIndex: number;
  dragging: boolean;
  setZoomIndex: (next: number) => void;
  /** Jump-with-easing to a point on the rails. */
  glideTo: (years: number) => void;
  /** Bind to the scroll surface. */
  handlers: {
    onWheel: (e: React.WheelEvent) => void;
    onPointerDown: (e: React.PointerEvent) => void;
  };
}

/**
 * Owns the one scalar that drives everything: `offset`, in years from birth.
 *
 * The focus cursor never moves — scrolling changes `offset`, which slides both
 * rails past it. Wheel and drag feed a velocity that decays under friction, so
 * a flick keeps travelling; `glideTo` eases toward a target instead.
 *
 * `offsetRef` — not React state — is the source of truth while animating.
 * A state updater is not run synchronously, so an animation loop cannot read
 * its result to decide whether to schedule the next frame; doing so stops the
 * loop dead after one step. The ref is advanced synchronously each frame and
 * state is only mirrored from it so React re-renders.
 */
export function useTimelineScroll({ maxSpan, initialOffset = 0 }: Options): TimelineScroll {
  const min = -OVERSCROLL_YEARS;
  const max = maxSpan + OVERSCROLL_YEARS;
  const clamp = useCallback((v: number) => Math.min(max, Math.max(min, v)), [min, max]);

  const [offset, setOffset] = useState(() => clamp(initialOffset));
  const [zoomIndex, setZoomIndexState] = useState(DEFAULT_ZOOM_INDEX);
  const [dragging, setDragging] = useState(false);

  const pxPerYear = ZOOM_LEVELS[zoomIndex];
  const pxPerYearRef = useRef(pxPerYear);
  pxPerYearRef.current = pxPerYear;

  const offsetRef = useRef(offset);
  const velocity = useRef(0);
  const target = useRef<number | null>(null);
  const frame = useRef<number | null>(null);

  /** Move to an absolute offset now, keeping ref and state in step. */
  const commit = useCallback((value: number) => {
    const next = clamp(value);
    offsetRef.current = next;
    setOffset(next);
    return next;
  }, [clamp]);

  // One rAF loop serves both inertia and glide; it parks itself when idle.
  const ensureLoop = useCallback(() => {
    if (frame.current !== null) return;

    const tick = () => {
      frame.current = null;
      const current = offsetRef.current;

      if (target.current !== null) {
        const gap = target.current - current;
        if (Math.abs(gap) < 0.002) {
          target.current = null;
          commit(current + gap);
          return;
        }
        commit(current + gap * GLIDE_EASE);
        frame.current = requestAnimationFrame(tick);
        return;
      }

      if (Math.abs(velocity.current) > MIN_VELOCITY) {
        velocity.current *= FRICTION;
        const next = commit(current + velocity.current);
        // Stop dead at the ends rather than grinding against the clamp.
        if (next === current) { velocity.current = 0; return; }
        frame.current = requestAnimationFrame(tick);
        return;
      }

      velocity.current = 0;
    };

    frame.current = requestAnimationFrame(tick);
  }, [commit]);

  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);

  const glideTo = useCallback((years: number) => {
    velocity.current = 0;
    target.current = clamp(years);
    ensureLoop();
  }, [clamp, ensureLoop]);

  const nudge = useCallback((years: number) => {
    target.current = null;
    velocity.current = 0;
    commit(offsetRef.current + years);
  }, [commit]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    target.current = null;
    // Trackpads send horizontal deltas for a sideways swipe; treat either axis
    // as travel along the rails, taking whichever gesture is more deliberate.
    const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const years = raw * WHEEL_YEARS_PER_PIXEL
      * (ZOOM_LEVELS[DEFAULT_ZOOM_INDEX] / pxPerYearRef.current);
    velocity.current = years * 0.55;
    commit(offsetRef.current + years);
    ensureLoop();
  }, [commit, ensureLoop]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;

    const startX = e.clientX;
    const startOffset = offsetRef.current;
    let lastX = startX;
    let lastT = performance.now();
    let moved = false;

    target.current = null;
    velocity.current = 0;

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      if (!moved && Math.abs(dx) > 3) { moved = true; setDragging(true); }
      if (!moved) return;

      // Drag right = travel back down the rails, like pulling a filmstrip.
      commit(startOffset - (dx * DRAG_MULTIPLIER) / pxPerYearRef.current);

      const now = performance.now();
      const dt = now - lastT;
      if (dt > 0) {
        velocity.current = -((ev.clientX - lastX) / pxPerYearRef.current) * (16 / dt);
        lastX = ev.clientX;
        lastT = now;
      }
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (moved) { setDragging(false); ensureLoop(); } else { velocity.current = 0; }
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }, [commit, ensureLoop]);

  // Keyboard: arrows step a year, shift a decade, Home/End jump to the ends.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;

      const step = e.shiftKey ? 10 : 1;
      switch (e.key) {
        case 'ArrowRight': nudge(step); break;
        case 'ArrowLeft': nudge(-step); break;
        case 'PageDown': nudge(10); break;
        case 'PageUp': nudge(-10); break;
        case 'Home': glideTo(0); break;
        case 'End': glideTo(maxSpan); break;
        default: return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nudge, glideTo, maxSpan]);

  const setZoomIndex = useCallback((next: number) => {
    setZoomIndexState(Math.max(0, Math.min(ZOOM_LEVELS.length - 1, next)));
  }, []);

  return {
    offset, pxPerYear, zoomIndex, dragging, setZoomIndex, glideTo,
    handlers: { onWheel, onPointerDown },
  };
}
