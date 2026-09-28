import { useEffect, useState } from 'react';

export interface WikiSummary {
  extract: string;
  thumbnail?: string;
  url: string;
}

/**
 * The slice of Wikipedia's REST summary response this app reads. Declared
 * rather than inferred, because `Response.json()` hands back `any` and every
 * field below would otherwise be an unchecked guess about someone else's API.
 */
interface WikiSummaryResponse {
  extract?: string;
  thumbnail?: { source?: string };
  content_urls?: { desktop?: { page?: string } };
}

/** Module-level cache: a title is fetched at most once per page load. */
const cache = new Map<string, WikiSummary | null>();
const inflight = new Map<string, Promise<WikiSummary | null>>();

async function fetchSummary(title: string): Promise<WikiSummary | null> {
  const endpoint = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  try {
    const res = await fetch(endpoint, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const json = await res.json() as WikiSummaryResponse;
    return {
      extract: json.extract ?? '',
      thumbnail: json.thumbnail?.source,
      url: json.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${title}`,
    };
  } catch {
    // Offline, blocked, or rate-limited. The card is complete without this.
    return null;
  }
}

/**
 * Lazily pulls a Wikipedia summary and thumbnail for a card.
 *
 * `enabled` is driven by proximity to the focus cursor, so scrolling past a
 * hundred cards does not fire a hundred requests — only what you stop on.
 */
export function useWikiSummary(title: string | undefined, enabled: boolean): WikiSummary | null {
  // A cache hit is answered during render, straight from the map. State is only
  // for the asynchronous arrival, and is tagged with the title it belongs to so
  // that a result landing after the card has moved on is simply ignored rather
  // than shown against the wrong event.
  const [resolved, setResolved] = useState<{ title: string; summary: WikiSummary | null } | null>(null);
  const cached = title !== undefined && cache.has(title) ? cache.get(title) ?? null : null;

  useEffect(() => {
    if (!title || !enabled || cache.has(title)) return;

    let cancelled = false;
    let pending = inflight.get(title);
    if (!pending) {
      pending = fetchSummary(title).then((result) => {
        cache.set(title, result);
        inflight.delete(title);
        return result;
      });
      inflight.set(title, pending);
    }
    // `fetchSummary` resolves to null on every failure, so this chain cannot
    // reject and there is nothing to catch.
    void pending.then((result) => { if (!cancelled) setResolved({ title, summary: result }); });

    return () => { cancelled = true; };
  }, [title, enabled]);

  if (cached) return cached;
  return resolved && resolved.title === title ? resolved.summary : null;
}
