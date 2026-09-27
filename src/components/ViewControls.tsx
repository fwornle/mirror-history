import { ZOOM_LEVELS } from '@/config/timeline';

interface Props {
  zoomIndex: number;
  yearsLived: number;
  /** How many events the current zoom actually has room for. */
  placed: { shown: number; total: number };
  onZoom: (next: number) => void;
  onScrub: (years: number) => void;
}

/**
 * Zoom, and the two jumps worth a permanent button. Mounted in the bottom bar
 * on a wide screen and in the drawer on a narrow one — see Legend for why.
 */
export default function ViewControls({
  zoomIndex, yearsLived, placed, onZoom, onScrub,
}: Props) {
  return (
    <div className="view-controls">
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
  );
}
