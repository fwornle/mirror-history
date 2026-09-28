import { useEffect, useRef, useState } from 'react';
import { CATEGORIES } from '@/config/categories';
import type { PlacedEvent } from '@/data/types';
import { useTimeline } from '@/state/timeline-context';
import { useWikiSummary } from '@/hooks/useWikiSummary';
import { formatAge, formatEventDate, formatYear } from '@/utils/time';
import { addYears } from '@/utils/time';

interface Props {
  event: PlacedEvent;
  onClose: () => void;
}

/**
 * The zoomed view of a card.
 *
 * A tile on the rail is ~236px wide and drifts while the timeline scrolls, so
 * it cannot hold a video player or a paragraph of text usefully. Selecting a
 * card brings it under the cursor and opens this panel instead, which is a
 * stationary reading surface: full description, the Wikipedia extract with a
 * link out, and the embedded player where a verified video exists.
 */
export default function EventDetail({ event, onClose }: Props) {
  const { timeline } = useTimeline();
  const [playing, setPlaying] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const category = CATEGORIES[event.category];
  const wiki = useWikiSummary(event.media.wiki, true);
  const dateLabel = formatEventDate(event.date, timeline.precision[event.id]);

  // The same distance on the opposite rail — the comparison the app exists for.
  const twin = addYears(
    timeline.birth,
    event.rail === 'forward' ? -event.yearsFromBirth : event.yearsFromBirth,
  );

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key !== 'Tab') return;

      // Keep focus inside the panel while it is open.
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, a[href], iframe, [tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const searchUrl = event.media.youtubeQuery
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(event.media.youtubeQuery)}`
    : null;

  return (
    <div
      className="detail"
      // Stop drags and wheel gestures reaching the timeline underneath.
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="detail__scrim"
        onClick={onClose}
        aria-label="Close details"
        tabIndex={-1}
      />

      <div
        className={`detail__panel detail__panel--${event.category}`}
        style={{ ['--cat-hue' as string]: category.hue }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        ref={panelRef}
      >
        <header className="detail__head">
          <span className="detail__cat">
            <span className="detail__glyph" aria-hidden="true">{category.glyph}</span>
            {category.label}
          </span>
          <time className="detail__date" dateTime={event.date.toISOString().slice(0, 10)}>
            {dateLabel}
          </time>
          <button type="button" className="detail__close" onClick={onClose} ref={closeRef}>
            Close ✕
          </button>
        </header>

        <h2 className="detail__title" id="detail-title">{event.title}</h2>

        <p className="detail__mirror">
          {event.rail === 'forward'
            ? (event.yearsFromBirth < 0.02
              ? 'The day you were born.'
              : <>You were <strong>{formatAge(event.yearsFromBirth)}</strong>. The mirror of this moment is <strong>{formatYear(twin)}</strong>.</>)
            : <><strong>{formatAge(event.yearsFromBirth)}</strong> before you were born. Its mirror in your life is <strong>{formatYear(twin)}</strong>.</>}
        </p>

        <div className="detail__media">
          {event.media.youtubeId && playing ? (
            <div className="detail__player">
              <iframe
                src={`https://www.youtube.com/embed/${event.media.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                title={`${event.title} — video`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : event.media.youtubeId ? (
            <button
              type="button"
              className="detail__poster"
              onClick={() => setPlaying(true)}
              style={wiki?.thumbnail ? { backgroundImage: `url(${wiki.thumbnail})` } : undefined}
            >
              <span className="detail__playicon" aria-hidden="true">▶</span>
              <span className="detail__playlabel">Play video</span>
            </button>
          ) : wiki?.thumbnail ? (
            <img className="detail__image" src={wiki.thumbnail} alt="" />
          ) : null}
        </div>

        <div className="detail__body">
          {event.description && <p className="detail__lede">{event.description}</p>}

          {wiki?.extract && <p className="detail__extract">{wiki.extract}</p>}

          {event.media.wiki && !wiki && (
            <p className="detail__pending">Loading background from Wikipedia…</p>
          )}
        </div>

        <footer className="detail__links">
          {wiki?.url && (
            <a className="detail__link detail__link--primary" href={wiki.url} target="_blank" rel="noreferrer noopener">
              Read on Wikipedia ↗
            </a>
          )}
          {/* No verified video id for this event: a search never rots, where a
              guessed id would confidently play the wrong thing. */}
          {!event.media.youtubeId && searchUrl && (
            <a className="detail__link" href={searchUrl} target="_blank" rel="noreferrer noopener">
              Find on YouTube ↗
            </a>
          )}
          {event.media.youtubeId && (
            <a
              className="detail__link"
              href={`https://www.youtube.com/watch?v=${event.media.youtubeId}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              Watch on YouTube ↗
            </a>
          )}
        </footer>
      </div>
    </div>
  );
}
