import { ALL_CATEGORY_IDS, CATEGORIES, type CategoryId } from '@/config/categories';
import { ZOOM_LEVELS } from '@/config/timeline';

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
      <div className="legend" role="group" aria-label="Filter by category">
        {ALL_CATEGORY_IDS.map((id) => {
          const category = CATEGORIES[id];
          const on = activeCategories.has(id);
          return (
            <button
              key={id}
              type="button"
              className={`legend__item${on ? '' : ' legend__item--off'}`}
              style={{ ['--cat-hue' as string]: category.hue }}
              onClick={() => onToggleCategory(id)}
              aria-pressed={on}
              title={category.description}
            >
              <span className="legend__swatch" aria-hidden="true" />
              <span className="legend__glyph" aria-hidden="true">{category.glyph}</span>
              <span className="legend__label">{category.label}</span>
            </button>
          );
        })}
      </div>

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

        <div className="zoom" role="group" aria-label="Zoom">
          <button type="button" onClick={() => onZoom(zoomIndex - 1)} disabled={zoomIndex === 0} aria-label="Zoom out">−</button>
          <span
            className="zoom__value"
            title="Cards that cannot fit a lane at this zoom are dropped, least significant first."
          >
            {placed.shown} of {placed.total}
          </span>
          <button type="button" onClick={() => onZoom(zoomIndex + 1)} disabled={zoomIndex === ZOOM_LEVELS.length - 1} aria-label="Zoom in">+</button>
        </div>

        <button type="button" className="control-btn" onClick={() => onScrub(0)}>Birth</button>
        <button type="button" className="control-btn" onClick={() => onScrub(yearsLived)}>Today</button>
      </div>
    </footer>
  );
}
