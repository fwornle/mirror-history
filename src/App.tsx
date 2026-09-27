import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TopBar from '@/components/TopBar';
import BottomBar from '@/components/BottomBar';
import Rail from '@/components/Rail';
import FocusCursor from '@/components/FocusCursor';
import EventDetail from '@/components/EventDetail';
import SettingsPanel from '@/components/SettingsPanel';
import Drawer from '@/components/Drawer';
import { useTimelineScroll } from '@/hooks/useTimelineScroll';
import { useTimeline } from '@/state/timeline-store';
import { ALL_CATEGORY_IDS, type CategoryId } from '@/config/categories';
import { MIN_WEIGHT_BY_ZOOM } from '@/config/timeline';
import { assignLanes } from '@/utils/lanes';
import { addYears } from '@/utils/time';
import type { PlacedEvent } from '@/data/types';

export default function App() {
  const { profile, timeline } = useTimeline();

  // Start on today: the cursor then has life on one side and the mirrored
  // pre-history on the other, which is the comparison the app exists to make.
  const scroll = useTimelineScroll({
    maxSpan: timeline.maxSpan,
    initialOffset: timeline.yearsLived,
  });
  const { offset, pxPerYear, dragging, glideTo } = scroll;

  const [active, setActive] = useState<Set<CategoryId>>(() => new Set(ALL_CATEGORY_IDS));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // The setup card opens itself the first time, because a placeholder birth
  // date silently produces a plausible-looking but wrong timeline.
  const [settingsOpen, setSettingsOpen] = useState(() => !profile.configured);
  // Narrow screens park the filters and zoom controls behind a hamburger; on a
  // wide screen the drawer is never displayed and this stays false.
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleCategory = useCallback((id: CategoryId) => {
    setActive((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      // Never leave the user staring at an empty timeline.
      return next.size === 0 ? new Set(ALL_CATEGORY_IDS) : next;
    });
  }, []);

  // Changing the birth date rebuilds both rails, so a selection made against
  // the old hinge may no longer exist.
  useEffect(() => {
    setSelectedId((current) =>
      (current && timeline.all.some((e) => e.id === current) ? current : null));
  }, [timeline]);

  // Moving the inflection point invalidates where the cursor was standing: an
  // offset of "51 years from birth" means a different moment once birth moves.
  // Re-anchor on today, which is where the app opens. Skipped on first mount,
  // which already starts there.
  const birthKey = timeline.birth.getTime();
  const firstAnchor = useRef(true);
  useEffect(() => {
    if (firstAnchor.current) { firstAnchor.current = false; return; }
    glideTo(timeline.yearsLived);
  }, [birthKey, glideTo, timeline.yearsLived]);

  const selected: PlacedEvent | null = useMemo(
    () => timeline.all.find((e) => e.id === selectedId) ?? null,
    [timeline, selectedId],
  );

  /** Bring an event under the cursor and open its zoomed panel. */
  const openEvent = useCallback((event: PlacedEvent) => {
    setSelectedId(event.id);
    glideTo(event.yearsFromBirth);
  }, [glideTo]);

  const onCardSelect = useCallback((years: number, id: string) => {
    setSelectedId((current) => (current === id ? null : id));
    glideTo(years);
  }, [glideTo]);

  // Zoom and lane packing together decide how many events actually fit. Report
  // the real number rather than a vague label, so it is clear that zooming in
  // reveals events instead of merely enlarging the ones already on screen.
  const placed = useMemo(() => {
    const minWeight = MIN_WEIGHT_BY_ZOOM[scroll.zoomIndex] ?? 1;
    let shown = 0;
    let total = 0;

    for (const rail of ['forward', 'mirror'] as const) {
      const inScope = timeline.events(rail).filter((e) => active.has(e.category));
      total += inScope.length;
      const admitted = inScope.filter(
        (e) => e.weight >= minWeight || e.category === 'personal');
      shown += assignLanes(admitted, pxPerYear).filter((lane) => lane !== null).length;
    }
    return { shown, total };
  }, [timeline, scroll.zoomIndex, pxPerYear, active]);

  // The two dates the cursor is reading, one on each rail.
  const forwardDate = useMemo(() => addYears(timeline.birth, offset), [timeline.birth, offset]);
  const mirrorDate = useMemo(() => addYears(timeline.birth, -offset), [timeline.birth, offset]);

  return (
    <div className="app">
      <TopBar
        offset={offset}
        forwardDate={forwardDate}
        mirrorDate={mirrorDate}
        onSearchPick={openEvent}
        onOpenSettings={() => setSettingsOpen(true)}
        drawerOpen={drawerOpen}
        onToggleDrawer={() => setDrawerOpen((open) => !open)}
      />

      <main
        className={`stage${dragging ? ' stage--dragging' : ''}`}
        onWheel={scroll.handlers.onWheel}
        onPointerDown={scroll.handlers.onPointerDown}
        role="application"
        aria-label="Mirrored timeline. Drag or scroll to travel; arrow keys step by year."
      >
        <Rail
          rail="forward"
          offset={offset}
          pxPerYear={pxPerYear}
          zoomIndex={scroll.zoomIndex}
          activeCategories={active}
          selectedId={selectedId}
          onSelect={onCardSelect}
        />

        <FocusCursor offset={offset} forwardDate={forwardDate} mirrorDate={mirrorDate} />

        <Rail
          rail="mirror"
          offset={offset}
          pxPerYear={pxPerYear}
          zoomIndex={scroll.zoomIndex}
          activeCategories={active}
          selectedId={selectedId}
          onSelect={onCardSelect}
        />

        {selected && (
          <EventDetail event={selected} onClose={() => setSelectedId(null)} />
        )}
      </main>

      <BottomBar
        offset={offset}
        maxSpan={timeline.maxSpan}
        yearsLived={timeline.yearsLived}
        zoomIndex={scroll.zoomIndex}
        placed={placed}
        onZoom={scroll.setZoomIndex}
        onScrub={glideTo}
        activeCategories={active}
        onToggleCategory={toggleCategory}
      />

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeCategories={active}
        onToggleCategory={toggleCategory}
        zoomIndex={scroll.zoomIndex}
        yearsLived={timeline.yearsLived}
        placed={placed}
        onZoom={scroll.setZoomIndex}
        onScrub={glideTo}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {settingsOpen && (
        <SettingsPanel onClose={() => setSettingsOpen(false)} firstRun={!profile.configured} />
      )}
    </div>
  );
}
