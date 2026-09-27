import Legend from './Legend';
import ViewControls from './ViewControls';
import type { CategoryId } from '@/config/categories';

interface Props {
  offset: number;
  maxSpan: number;
  yearsLived: number;
  zoomIndex: number;
  /** How many events the current zoom actually has room for. */
  placed: { shown: number; total: number };
  onZoom: (next: number) => void;
  onScrub: (years: number) => void;
  activeCategories: Set<CategoryId>;
  onToggleCategory: (id: CategoryId) => void;
}

export default function BottomBar({
  offset, maxSpan, yearsLived, zoomIndex, placed, onZoom, onScrub,
  activeCategories, onToggleCategory,
}: Props) {
  return (
    <footer className="bottombar" onPointerDown={(e) => e.stopPropagation()}>
      {/* Filters, hint and zoom move into the drawer on a narrow screen; the
          scrubber stays, because travelling the timeline is the one control you
          always want under your thumb. */}
      <Legend activeCategories={activeCategories} onToggleCategory={onToggleCategory} />

      <p className="bottombar__hint">
        <strong>Click any card</strong> for the full story, links and video
      </p>

      <div className="controls">
        <label className="scrub">
          <span className="scrub__label">Travel</span>
          <span className="scrub__track">
            <input
              type="range"
              min={0}
              max={Math.ceil(maxSpan)}
              step={0.25}
              value={Math.min(Math.max(offset, 0), maxSpan)}
              onChange={(e) => onScrub(Number(e.target.value))}
              aria-label="Years from birth"
            />
            {/* Where "today" falls on the track, so the future reads as past it. */}
            <span
              className="scrub__today"
              style={{ left: `${(yearsLived / Math.ceil(maxSpan)) * 100}%` }}
              aria-hidden="true"
            />
          </span>
        </label>

        <ViewControls
          zoomIndex={zoomIndex}
          yearsLived={yearsLived}
          placed={placed}
          onZoom={onZoom}
          onScrub={onScrub}
        />
      </div>
    </footer>
  );
}
