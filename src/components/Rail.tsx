import { useEffect, useMemo, useRef, useState } from 'react';
import EventCard from './EventCard';
import AxisRuler from './AxisRuler';
import { useTimeline } from '@/state/timeline-store';
import type { RailId } from '@/data/types';
import type { CategoryId } from '@/config/categories';
import { assignLanes } from '@/utils/lanes';
import {
  CULL_DISTANCE, LANES_PER_RAIL, MIN_LANE_HEIGHT, MIN_WEIGHT_BY_ZOOM, PERSPECTIVE,
} from '@/config/timeline';

interface Props {
  rail: RailId;
  offset: number;
  pxPerYear: number;
  zoomIndex: number;
  activeCategories: Set<CategoryId>;
  selectedId: string | null;
  onSelect: (years: number, id: string) => void;
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
  rail, offset, pxPerYear, zoomIndex, activeCategories, selectedId, onSelect,
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

  // Lane height is derived from the rail's real height rather than fixed, so
  // the outermost lane always fits on screen instead of clipping on short
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

  const laneHeight = Math.max(
    MIN_LANE_HEIGHT,
    (sceneHeight || MIN_LANE_HEIGHT * LANES_PER_RAIL) / LANES_PER_RAIL,
  );

  // Lane packing depends only on zoom, so it survives every scroll frame.
  const lanes = useMemo(() => assignLanes(events, pxPerYear), [events, pxPerYear]);

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
