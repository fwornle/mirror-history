import { useEffect, useRef } from 'react';
import Legend from './Legend';
import ViewControls from './ViewControls';
import type { CategoryId } from '@/config/categories';

interface Props {
  open: boolean;
  onClose: () => void;
  activeCategories: Set<CategoryId>;
  onToggleCategory: (id: CategoryId) => void;
  zoomIndex: number;
  yearsLived: number;
  placed: { shown: number; total: number };
  onZoom: (next: number) => void;
  onScrub: (years: number) => void;
  onOpenSettings: () => void;
}

/**
 * Everything the bottom bar carries on a wide screen, slid in from the side on
 * a narrow one. It exists because a phone has no room for a permanent bar of
 * filters and controls: the timeline is the point, and the chrome was taking
 * most of the viewport.
 *
 * Only rendered on narrow screens (CSS decides), so on a desktop these
 * controls live solely in the bottom bar.
 */
export default function Drawer({
  open, onClose, activeCategories, onToggleCategory,
  zoomIndex, yearsLived, placed, onZoom, onScrub, onOpenSettings,
}: Props) {
  const panel = useRef<HTMLDivElement>(null);

  // Escape closes, and focus moves into the panel when it opens so a keyboard
  // or screen-reader user is not left behind in the header.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    panel.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div className={`drawer${open ? ' drawer--open' : ''}`}>
      <button
        type="button"
        className="drawer__scrim"
        onClick={onClose}
        aria-label="Close filters and controls"
        tabIndex={open ? 0 : -1}
      />

      <div
        className="drawer__panel"
        id="view-drawer"
        role="dialog"
        aria-modal="false"
        aria-label="Filters and view controls"
        ref={panel}
        tabIndex={-1}
        // The stage listens for drags on pointerdown; without this, touching a
        // filter would also grab the timeline underneath.
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="drawer__head">
          <h2>View</h2>
          <button type="button" className="drawer__close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <section className="drawer__section">
          <h3>Categories</h3>
          <Legend activeCategories={activeCategories} onToggleCategory={onToggleCategory} />
        </section>

        <section className="drawer__section">
          <h3>Zoom and jumps</h3>
          <ViewControls
            zoomIndex={zoomIndex}
            yearsLived={yearsLived}
            placed={placed}
            onZoom={onZoom}
            onScrub={onScrub}
          />
        </section>

        <section className="drawer__section">
          <button
            type="button"
            className="control-btn drawer__settings"
            onClick={() => { onOpenSettings(); onClose(); }}
          >
            ⚙ Birth date and personal events
          </button>
        </section>

        <p className="drawer__hint">
          <strong>Tap any card</strong> for the full story, links and video.
        </p>
      </div>
    </div>
  );
}
