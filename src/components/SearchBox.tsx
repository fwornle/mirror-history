import { useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORIES } from '@/config/categories';
import type { PlacedEvent } from '@/data/types';
import { useTimeline } from '@/state/timeline-store';
import { formatEventDate, formatYear } from '@/utils/time';

interface Props {
  onPick: (event: PlacedEvent) => void;
}

const MAX_RESULTS = 8;

/**
 * Ranks a match so that what the user most likely meant comes first: a title
 * that starts with the query beats one that merely contains it, which beats a
 * hit in the body text. Heavier events break ties, so "war" surfaces the world
 * wars before a minor treaty.
 */
function score(event: PlacedEvent, query: string): number {
  const title = event.title.toLowerCase();
  const index = title.indexOf(query);

  let base = 0;
  if (title === query) base = 1000;
  else if (index === 0) base = 800;
  else if (index > 0 && /\s|—|-/.test(title[index - 1] ?? ' ')) base = 600; // word start
  else if (index > 0) base = 400;
  else if (event.description.toLowerCase().includes(query)) base = 200;
  else if (CATEGORIES[event.category].label.toLowerCase().includes(query)) base = 100;
  else return 0;

  return base + event.weight * 10;
}

export default function SearchBox({ onPick }: Props) {
  const { timeline } = useTimeline();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return timeline.all
      .map((event) => ({ event, rank: score(event, q) }))
      .filter((r) => r.rank > 0)
      .sort((a, b) => b.rank - a.rank || a.event.yearsFromBirth - b.event.yearsFromBirth)
      .slice(0, MAX_RESULTS)
      .map((r) => r.event);
  }, [query, timeline]);

  useEffect(() => { setActive(0); }, [query]);

  // Close when the click lands anywhere else.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [open]);

  // "/" focuses search from anywhere, the way a search-first UI should.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      if (e.key === '/') { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const choose = (event: PlacedEvent) => {
    onPick(event);
    setOpen(false);
    setQuery(event.title);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // The timeline's own arrow-key handler ignores inputs, so these are ours.
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && results[active]) { e.preventDefault(); choose(results[active]); }
    else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
  };

  return (
    <div className="search" ref={boxRef}>
      <span className="search__icon" aria-hidden="true">⌕</span>
      <input
        ref={inputRef}
        className="search__input"
        type="search"
        value={query}
        placeholder="Search events  /"
        aria-label="Search events"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls="search-results"
        aria-autocomplete="list"
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {query && (
        <button type="button" className="search__clear" onClick={() => { setQuery(''); inputRef.current?.focus(); }} aria-label="Clear search">✕</button>
      )}

      {open && results.length > 0 && (
        <ul className="search__results" id="search-results" role="listbox">
          {results.map((event, i) => (
            <li key={event.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={`search__result${i === active ? ' search__result--active' : ''}`}
                style={{ ['--cat-hue' as string]: CATEGORIES[event.category].hue }}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(event)}
              >
                <span className="search__swatch" aria-hidden="true" />
                <span className="search__text">
                  <span className="search__title">{event.title}</span>
                  <span className="search__meta">
                    {formatEventDate(event.date, timeline.precision[event.id])}
                    {' · '}
                    {event.rail === 'forward' ? 'your life' : 'before you'}
                    {' · mirrors '}
                    {formatYear(new Date(
                      timeline.birth.getTime() * 2 - event.date.getTime()))}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && query.trim().length >= 2 && results.length === 0 && (
        <div className="search__results search__results--empty">
          Nothing matches “{query.trim()}”.
        </div>
      )}
    </div>
  );
}
