import { useEffect, useState } from 'react';

export interface WikiSummary {
  extract: string;
  thumbnail?: string;
  url: string;
}

/** Module-level cache: a title is fetched at most once per page load. */
const cache = new Map<string, WikiSummary | null>();
const inflight = new Map<string, Promise<WikiSummary | null>>();

async function fetchSummary(title: string): Promise<WikiSummary | null> {
  const endpoint = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  try {
    const res = await fetch(endpoint, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const json = await res.json();
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
  const [summary, setSummary] = useState<WikiSummary | null>(() =>
    (title ? cache.get(title) ?? null : null));

  useEffect(() => {
    if (!title || !enabled) return;
    if (cache.has(title)) { setSummary(cache.get(title) ?? null); return; }

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
    pending.then((result) => { if (!cancelled) setSummary(result); });

    return () => { cancelled = true; };
  }, [title, enabled]);

  return summary;
}
