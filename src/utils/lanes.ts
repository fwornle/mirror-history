import { CARD_GAP, CARD_WIDTH, LANES_PER_RAIL } from '@/config/timeline';

interface Placeable {
  yearsFromBirth: number;
  weight: number;
}

/**
 * Packs events into horizontal lanes so that neighbours in time do not overlap.
 *
 * Lanes are assigned in *timeline* space (years), not screen space, so the
 * assignment only has to be recomputed when the zoom changes — never while
 * scrolling, which keeps cards from reshuffling under the cursor.
 *
 * Heavier events are placed first and so claim the lanes nearest the axis,
 * where the eye lands. When every lane is already taken at that point in time,
 * the event is *dropped* rather than stacked on top of a neighbour: a dense
 * decade holds far more events than three lanes can show, and an unreadable
 * pile of half-covered titles is worse than an honest omission. Because the
 * sort is by weight, what falls out is always the least significant event, and
 * zooming in widens the gap and brings it back.
 *
 * Returns one entry per input event: its lane, or null if it was dropped.
 */
export function assignLanes<T extends Placeable>(
  events: T[],
  pxPerYear: number,
): (number | null)[] {
  const minGapYears = (CARD_WIDTH + CARD_GAP) / pxPerYear;

  const order = events
    .map((event, index) => ({ event, index }))
    .sort((a, b) =>
      b.event.weight - a.event.weight ||
      a.event.yearsFromBirth - b.event.yearsFromBirth);

  // Per lane, the centres already claimed on the timeline.
  const claimed: number[][] = Array.from({ length: LANES_PER_RAIL }, () => []);
  const lanes = new Array<number | null>(events.length).fill(null);

  for (const { event, index } of order) {
    const at = event.yearsFromBirth;

    for (let lane = 0; lane < LANES_PER_RAIL; lane++) {
      const clear = claimed[lane].every((taken) => Math.abs(taken - at) >= minGapYears);
      if (clear) {
        claimed[lane].push(at);
        lanes[index] = lane;
        break;
      }
    }
  }

  return lanes;
}
