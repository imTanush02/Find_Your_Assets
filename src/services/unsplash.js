// ══════════════════════════════════════════
//  Unsplash API Service
// ══════════════════════════════════════════

import { httpGetJSON } from './http';

const ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
const PER_PAGE = 20;

/**
 * Search Unsplash for photos.
 * Returns normalized result: { total, totalPages, results[] }
 */
export async function searchPhotos(query, page = 1) {
  if (!ACCESS_KEY) {
    throw new Error('Unsplash API key not set! Add VITE_UNSPLASH_ACCESS_KEY to .env');
  }

  const path = `/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${PER_PAGE}&client_id=${ACCESS_KEY}`;
  const data = await httpGetJSON('api.unsplash.com', path);

  return {
    total: data.total,
    totalPages: data.total_pages,
    results: data.results.map((img) => ({
      id: img.id,
      description: img.alt_description || 'image',
      thumbUrl: img.urls.small,
      fullUrl: img.urls.full,
      userName: img.user.name,
      userUrl: img.user.links.html + '?utm_source=ae_extension&utm_medium=referral',
      source: 'unsplash',
      type: 'image',
    })),
  };
}
