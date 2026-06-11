// ══════════════════════════════════════════
//  Unsplash API Service
// ══════════════════════════════════════════

import { httpGetJSON } from './http';

const ACCESS_KEY = '4-LwakiGNcRca-LkpiBfcyWfmLZT1ZS2DT6FAws-r7o';
const PER_PAGE = 20;

/**
 * Search Unsplash for photos.
 * Returns normalized result: { total, totalPages, results[] }
 */
export async function searchPhotos(query, page = 1) {
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
    })),
  };
}
