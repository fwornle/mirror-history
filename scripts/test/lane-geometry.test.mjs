/**
 * The rails' vertical budget.
 *
 * This is the arithmetic that decides whether a card is on screen at all. It
 * regressed once, invisibly on a desktop and fatally on a phone: the lane count
 * was fixed at three while only the lane *height* was floored, so a 250px rail
 * still placed a third lane 240px up and `overflow: hidden` swallowed it. The
 * invariant below — every lane the packer may use fits a whole card — is what
 * stops that returning.
 */
import {
  CARD_BODY_LINE_HEIGHT, CARD_BODY_LINES, CARD_BODY_LINES_FOCUSED, CARD_BODY_MARGIN,
  CARD_BORDER_HEIGHT, CARD_CHROME_HEIGHT, CARD_LANE_SLACK, LANES_PER_RAIL, MIN_LANE_HEIGHT,
  bodyLinesFor, laneGeometry,
} from '../../node_modules/.cache/mirror-history/timeline.mjs';
import { assignLanes } from '../../node_modules/.cache/mirror-history/lanes.mjs';

let fails = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? 'PASS  ' : 'FAIL  ') + name + (extra ? '  ' + extra : ''));
  if (!cond) fails++;
};

/** Real measured rail heights: phone landscape → phone → laptop → 1080p → tall. */
const HEIGHTS = [111, 160, 200, 250, 300, 338, 354, 428, 434, 500, 700, 1000];

// --- the invariant the phone bug broke -----------------------------------
check('outermost lane always fits inside the rail', HEIGHTS.every((h) => {
  const { lanes, laneHeight } = laneGeometry(h);
  return (lanes - 1) * laneHeight + laneHeight <= h + 0.001;
}));

check('a whole card fits every lane the packer may use', HEIGHTS.every((h) => {
  const { lanes, laneHeight } = laneGeometry(h);
  // The one-lane clamp is the deliberate exception: a rail shorter than a card
  // still shows one, because an empty rail is worse.
  return lanes === 1 || laneHeight >= MIN_LANE_HEIGHT;
}));

check('lane count never exceeds the ceiling', HEIGHTS.every((h) => {
  const { lanes } = laneGeometry(h);
  return lanes >= 1 && lanes <= LANES_PER_RAIL;
}));

check('taller rails never show fewer lanes', (() => {
  const counts = HEIGHTS.map((h) => laneGeometry(h).lanes);
  return counts.every((c, i) => i === 0 || c >= counts[i - 1]);
})());

// The regression itself, stated as the numbers that produced it.
const phone = laneGeometry(250);
check('a 250px rail packs 2 lanes, not 3', phone.lanes === 2, `${phone.lanes} lanes of ${phone.laneHeight}`);
const landscape = laneGeometry(111);
check('a 111px rail packs exactly 1 lane', landscape.lanes === 1, `${landscape.lanes}`);
check('an unmeasured rail assumes the full rack', laneGeometry(0).lanes === LANES_PER_RAIL);

// --- the card content budget --------------------------------------------
const tallest = (laneHeight, focused) =>
  CARD_CHROME_HEIGHT + CARD_BORDER_HEIGHT
  + (bodyLinesFor(laneHeight, focused)
    ? CARD_BODY_MARGIN + bodyLinesFor(laneHeight, focused) * CARD_BODY_LINE_HEIGHT
    : 0);

check('a card never asks for more height than its lane grants', HEIGHTS.every((h) => {
  const { lanes, laneHeight } = laneGeometry(h);
  if (lanes === 1 && laneHeight < MIN_LANE_HEIGHT) return true; // clamped, see above
  return [true, false].every((f) => tallest(laneHeight, f) <= laneHeight - CARD_LANE_SLACK + 0.001);
}));

check('a lane too short for a paragraph asks for none', bodyLinesFor(111, false) === 0, String(bodyLinesFor(111, false)));
check('a roomy lane is capped, not unbounded', bodyLinesFor(1000, false) === CARD_BODY_LINES);
check('focus buys one more line', bodyLinesFor(1000, true) === CARD_BODY_LINES_FOCUSED);
check('body lines never go negative', HEIGHTS.concat([0, 1, 40]).every((h) => bodyLinesFor(h, true) >= 0));

// --- packing honours the budget it is given -----------------------------
const events = Array.from({ length: 40 }, (_, i) => ({ yearsFromBirth: i * 0.5, weight: 3 }));
check('packing never returns a lane the rail cannot draw', [1, 2, 3].every((n) =>
  assignLanes(events, 56, n).every((lane) => lane === null || (lane >= 0 && lane < n))));
check('fewer lanes place no more events than more lanes', (() => {
  const count = (n) => assignLanes(events, 56, n).filter((l) => l !== null).length;
  return count(1) <= count(2) && count(2) <= count(3);
})());

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
