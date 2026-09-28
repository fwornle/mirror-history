import { useMemo } from 'react';
import { useTimeline } from '@/state/timeline-context';
import type { RailId } from '@/data/types';
import { addYears } from '@/utils/time';

interface Props {
  rail: RailId;
  offset: number;
  pxPerYear: number;
}

/** Tick spacing in years, chosen so labels never crowd at any zoom level. */
function tickStep(pxPerYear: number): number {
  for (const step of [1, 2, 5, 10, 25, 50]) {
    if (step * pxPerYear >= 84) return step;
  }
  return 100;
}

/**
 * The ruler under (or over) a rail.
 *
 * Both rails are indexed by distance from birth, so the tick *positions* are
 * identical on the two axes — only the label differs, running forward on one
 * and backward on the other. Lining those two numbers up is the point of the
 * whole app, so they must share the same grid.
 */
export default function AxisRuler({ rail, offset, pxPerYear }: Props) {
  const { timeline } = useTimeline();
  const halfWidth = typeof window === 'undefined' ? 1200 : window.innerWidth;
  const span = halfWidth / pxPerYear;

  const ticks = useMemo(() => {
    const step = tickStep(pxPerYear);
    const first = Math.max(0, Math.floor((offset - span) / step) * step);
    const last = Math.ceil((offset + span) / step) * step;

    const out: { years: number; label: string; major: boolean }[] = [];
    for (let years = first; years <= last; years += step) {
      const date = addYears(timeline.birth, rail === 'forward' ? years : -years);
      out.push({
        years,
        label: String(date.getUTCFullYear()),
        major: years % (step * 5) === 0,
      });
    }
    return out;
  }, [offset, pxPerYear, span, rail, timeline.birth]);

  const px = (years: number) => (years - offset) * pxPerYear;

  return (
    <div className="ruler" aria-hidden="true">
      <div className="ruler__line" />

      {ticks.map(({ years, label, major }) => (
        <div
          key={years}
          className={`ruler__tick${major ? ' ruler__tick--major' : ''}`}
          style={{ transform: `translateX(${px(years)}px)` }}
        >
          <span className="ruler__label">{label}</span>
          <span className="ruler__age">{years === 0 ? 'birth' : `${years}`}</span>
        </div>
      ))}

      {/* Birth is the shared origin of both rails: same x, same instant. */}
      <div className="ruler__marker ruler__marker--birth" style={{ transform: `translateX(${px(0)}px)` }}>
        <span>birth</span>
      </div>

      {rail === 'forward' && (
        <div className="ruler__marker ruler__marker--today" style={{ transform: `translateX(${px(timeline.yearsLived)}px)` }}>
          <span>today</span>
        </div>
      )}
    </div>
  );
}
