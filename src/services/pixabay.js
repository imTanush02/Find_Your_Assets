// ══════════════════════════════════════════
//  Pixabay API Service — Transparent PNGs
// ══════════════════════════════════════════

import { httpGetJSON } from './http';

const API_KEY = '56244709-043cbbdc718f8329df77bef03';
const PER_PAGE = 20;

/**
 * Search Pixabay for transparent images.
 * Returns normalized result: { total, totalPages, results[] }
 */
export async function searchPNGs(query, page = 1) {
  if (!API_KEY || API_KEY === 'YOUR_PIXABAY_API_KEY_HERE') {
    throw new Error('Pixabay API key not set! Edit src/services/pixabay.js');
  }

  const path = `/api/?key=${API_KEY}&q=${encodeURIComponent(query)}&page=${page}&per_page=${PER_PAGE}&image_type=photo&colors=transparent`;
  const data = await httpGetJSON('pixabay.com', path);

  const totalHits = data.totalHits || 0;

  return {
    total: totalHits,
    totalPages: Math.ceil(totalHits / PER_PAGE),
    results: (data.hits || []).map((hit) => ({
      id: String(hit.id),
      description: hit.tags || 'image',
      thumbUrl: hit.webformatURL,
      fullUrl: hit.largeImageURL,
      userName: hit.user,
      userUrl: `https://pixabay.com/users/${hit.user}-${hit.user_id}`,
      source: 'pixabay',
    })),
  };
}
