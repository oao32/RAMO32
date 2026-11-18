/**
 * Extracts an 11-character YouTube video ID from any standard YouTube URL
 * (shorts/, watch?v=, youtu.be/, embed/, live/) and returns an embeddable URL.
 * Returns null if the input is empty or not a valid YouTube link.
 */
export function toYouTubeEmbedUrl(rawUrl?: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const patterns = [
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})(?:[?&#/]|$)/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})(?:[?&#/]|$)/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[?&#/]|$)/,
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})(?:[?&#/]|$)/,
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})(?:[?&#/]|$)/,
  ];

  for (const re of patterns) {
    const match = trimmed.match(re);
    if (match?.[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }

  try {
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(candidate);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) {
        return `https://www.youtube.com/embed/${id}`;
      }
    } else if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
      const vParam = parsed.searchParams.get('v');
      if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
        return `https://www.youtube.com/embed/${vParam}`;
      }
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (
        parts.length >= 2 &&
        (parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live') &&
        /^[a-zA-Z0-9_-]{11}$/.test(parts[1])
      ) {
        return `https://www.youtube.com/embed/${parts[1]}`;
      }
    }
  } catch {
    return null;
  }

  return null;
}
