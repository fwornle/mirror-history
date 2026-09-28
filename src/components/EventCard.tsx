import { CATEGORIES } from '@/config/categories';
import {
  CARD_LANE_SLACK, CARD_WIDTH, FOCUS_RADIUS, LANE_HEIGHT_FOR_IMAGE, MIN_LANE_HEIGHT,
  bodyLinesFor,
} from '@/config/timeline';
import type { PlacedEvent, RailId } from '@/data/types';
import { useTimeline } from '@/state/timeline-store';
import { depthStyleFor } from '@/utils/depth';
import { formatAge, formatEventDate } from '@/utils/time';
import { useWikiSummary } from '@/hooks/useWikiSummary';

interface Props {
  event: PlacedEvent;
  /** Signed pixels from the focus cursor. */
  dx: number;
  lane: number;
  rail: RailId;
  /** Measured height of one lane — the card's height budget. */
  laneHeight: number;
  selected: boolean;
  onSelect: (years: number, id: string) => void;
}

/** Description and enrichment appear only once a card is readable. */
const DETAIL_DEFOCUS = 0.30;
const ENRICH_DEFOCUS = 0.10;

/**
 * A tile on the rail. Clicking it glides the timeline to bring it under the
 * cursor and opens the zoomed detail panel, which is where the full text,
 * links and video live — a card on the rail is too small to hold a usable
 * player, and every card is a moving target while the rails scroll.
 */
export default function EventCard({
  event, dx, lane, rail, laneHeight, selected, onSelect,
}: Props) {
  const { timeline } = useTimeline();
  const precision = timeline.precision[event.id];

  const { scale, projectedDx, yawDeg, opacity, blurPx, defocus } = depthStyleFor(dx);
  const focused = Math.abs(dx) <= FOCUS_RADIUS;
  const category = CATEGORIES[event.category];

  const wiki = useWikiSummary(event.media.wiki, defocus < ENRICH_DEFOCUS);
  const showDetail = defocus < DETAIL_DEFOCUS;
  const showImage = wiki?.thumbnail && defocus < ENRICH_DEFOCUS && laneHeight >= LANE_HEIGHT_FOR_IMAGE;
  // The description gets the lines the lane can actually spare, and is dropped
  // outright when that is none — a short lane used to let `overflow: hidden`
  // slice the paragraph mid-sentence and take the footer's badges with it.
  const bodyLines = bodyLinesFor(laneHeight, focused);
  const showBody = showDetail && bodyLines > 0;
  // A lane below the fitting minimum — a landscape phone — cannot hold even the
  // two-line title the chrome budget assumes, so the title gives up a line too.
  const titleLines = laneHeight < MIN_LANE_HEIGHT ? 1 : 2;

  const dateLabel = formatEventDate(event.date, precision);
  const far = defocus > 0.8;

  const classes = [
    'card',
    `card--${event.category}`,
    focused ? 'card--focused' : '',
    selected ? 'card--selected' : '',
    event.category === 'personal' ? 'card--personal' : '',
    `card--weight-${event.weight}`,
  ].filter(Boolean).join(' ');

  return (
    <article
      className={classes}
      style={{
        // left:50% puts the card's anchor on the cursor; the -50% centres it
        // (scale is about the centre, so this stays correct at any scale),
        // projectedDx slides it along the rail and scale supplies the depth.
        // Deliberately no translateZ — see utils/depth.ts.
        transform: `translateX(calc(-50% + ${projectedDx.toFixed(1)}px)) scale(${scale.toFixed(4)}) rotateY(${yawDeg.toFixed(2)}deg)`,
        [rail === 'forward' ? 'bottom' : 'top']: `${lane * laneHeight}px`,
        opacity,
        filter: blurPx > 0.05 ? `blur(${blurPx}px)` : undefined,
        width: `${CARD_WIDTH}px`,
        maxHeight: `${laneHeight - CARD_LANE_SLACK}px`,
        // Near cards must paint over far ones regardless of DOM order.
        zIndex: Math.round(1000 - Math.abs(dx)),
        ['--cat-hue' as string]: category.hue,
        ['--card-body-lines' as string]: bodyLines,
        ['--card-title-lines' as string]: titleLines,
      }}
      // Far cards are decorative at best and must not be tab stops or read out.
      aria-hidden={far ? true : undefined}
    >
      <button
        type="button"
        className="card__hit"
        onClick={() => onSelect(event.yearsFromBirth, event.id)}
        tabIndex={far ? -1 : 0}
        aria-label={`${event.title}. ${dateLabel}. ${category.label}. Open details.`}
      >
        <header className="card__head">
          {/* Glyph *and* name: the palette's CVD margin relies on this label. */}
          <span className="card__cat">
            <span className="card__glyph" aria-hidden="true">{category.glyph}</span>
            {category.label}
          </span>
          <time className="card__date" dateTime={event.date.toISOString().slice(0, 10)}>
            {dateLabel}
          </time>
        </header>

        {showImage && (
          <div className="card__image">
            <img src={wiki.thumbnail} alt="" loading="lazy" decoding="async" />
          </div>
        )}

        <h3 className="card__title">{event.title}</h3>

        {showBody && event.description && (
          <p className="card__body">{event.description}</p>
        )}

        {showDetail && (
          <footer className="card__foot">
            <span className="card__age">
              {rail === 'forward'
                ? (event.yearsFromBirth < 0.02
                  ? 'the day you were born'
                  : `you were ${formatAge(event.yearsFromBirth)}`)
                : `${formatAge(event.yearsFromBirth)} before you`}
            </span>

            {/*
              Every card opens into the zoomed panel, but nothing said so —
              which made the whole feature invisible. These badges advertise
              what is behind each one, and the "expand" hint on hover says
              plainly that the card is a door.
            */}
            <span className="card__badges">
              {event.media.youtubeId && (
                <span className="card__badge card__badge--video" title="Plays a video here">
                  ▶ video
                </span>
              )}
              {event.media.wiki && (
                <span className="card__badge" title="Background from Wikipedia">
                  Wikipedia
                </span>
              )}
              {/*
                Always visible, never hover-only: a hover hint does not exist on
                a touch screen and does nothing for someone scanning the rails.
                This is the affordance that says the card is a door.
              */}
              <span className="card__badge card__badge--open" title="Click to expand">
                ⤢
              </span>
            </span>
          </footer>
        )}

        <span className="card__expand" aria-hidden="true">Click to expand</span>
      </button>
    </article>
  );
}
