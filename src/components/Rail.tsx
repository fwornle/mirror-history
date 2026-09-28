import { useEffect, useMemo, useRef, useState } from 'react';
import EventCard from './EventCard';
import AxisRuler from './AxisRuler';
import { useTimeline } from '@/state/timeline-context';
import type { RailId } from '@/data/types';
import type { CategoryId } from '@/config/categories';
import { assignLanes } from '@/utils/lanes';
import { CULL_DISTANCE, MIN_WEIGHT_BY_ZOOM, PERSPECTIVE, laneGeometry } from '@/config/timeline';

interface Props {
  rail: RailId;
  offset: number;
  pxPerYear: number;
  zoomIndex: number;
  activeCategories: Set<CategoryId>;
  selectedId: string | null;
  onSelect: (years: number, id: string) => void;
  /**
   * Reports the rail's measured scene height so the app can count what will
   * actually be placed. Only one rail needs to supply it: both are
   * `flex: 1 1 0` siblings of the same column, so one measurement describes
   * both.
   */
  onMeasure?: (sceneHeight: number) => void;
}

const RAIL_COPY: Record<RailId, { title: string; hint: string }> = {
  forward: { title: 'Your life', hint: 'birth → onward' },
  mirror: { title: 'Mirrored time', hint: 'birth → backward' },
};

/**
 * One time axis. Both rails are identical in construction — they differ only in
 * which half of the dataset they draw and which way they read the calendar.
 */
export default function Rail({
  rail, offset, pxPerYear, zoomIndex, activeCategories, selectedId, onSelect, onMeasure,
}: Props) {
  const { timeline } = useTimeline();
  const minWeight = MIN_WEIGHT_BY_ZOOM[zoomIndex] ?? 1;

  // Only the events this zoom level admits take part in lane packing, so the
  // survivors spread into the space the dropped ones would have taken.
  const events = useMemo(
    () => timeline.events(rail)
      .filter((e) => e.weight >= minWeight || e.category === 'personal'),
    [timeline, rail, minWeight],
  );

  // Both the lane count and the lane height come from the rail's real height,
  // so the outermost lane always fits on screen instead of clipping on short
  // viewports. Measured, not assumed.
  const sceneRef = useRef<HTMLDivElement>(null);
  const [sceneHeight, setSceneHeight] = useState(0);

  useEffect(() => {
    const node = sceneRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setSceneHeight(entry.contentRect.height);
    });
    observer.observe(node);
    setSceneHeight(node.clientHeight);
    return () => observer.disconnect();
  }, []);

  useEffect(() => { onMeasure?.(sceneHeight); }, [onMeasure, sceneHeight]);

  const { lanes: laneCount, laneHeight } = laneGeometry(sceneHeight);

  // Lane packing depends only on zoom and the lane budget, so it survives
  // every scroll frame.
  const lanes = useMemo(
    () => assignLanes(events, pxPerYear, laneCount),
    [events, pxPerYear, laneCount],
  );

  // Viewport culling: only cards near the cursor are in the DOM at all.
  const visible = useMemo(() => {
    const out: { event: (typeof events)[number]; dx: number; lane: number }[] = [];
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (!activeCategories.has(event.category)) continue;
      const lane = lanes[i];
      if (lane === null) continue; // no room in any lane at this zoom
      const dx = (event.yearsFromBirth - offset) * pxPerYear;
      if (Math.abs(dx) > CULL_DISTANCE) continue;
      out.push({ event, dx, lane });
    }
    return out;
  }, [events, lanes, offset, pxPerYear, activeCategories]);

  const copy = RAIL_COPY[rail];

  return (
    <section className={`rail rail--${rail}`} aria-label={`${copy.title} axis`}>
      <div className="rail__scene" ref={sceneRef} style={{ perspective: `${PERSPECTIVE}px` }}>
        <div className="rail__cards">
          {visible.map(({ event, dx, lane }) => (
            <EventCard
              key={event.id}
              event={event}
              dx={dx}
              lane={lane}
              rail={rail}
              laneHeight={laneHeight}
              selected={selectedId === event.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>

      <AxisRuler rail={rail} offset={offset} pxPerYear={pxPerYear} />

      <div className="rail__legend">
        <span className="rail__legend-title">{copy.title}</span>
        <span className="rail__legend-hint">{copy.hint}</span>
      </div>
    </section>
  );
}
