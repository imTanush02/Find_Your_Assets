// ══════════════════════════════════════════
//  Pixabay API Service — Images & Videos
// ══════════════════════════════════════════

import { httpGetJSON } from './http';

const API_KEY = import.meta.env.VITE_PIXABAY_API_KEY;
const PER_PAGE = 20;

/**
 * Search Pixabay for images.
 * Returns normalized result: { total, totalPages, results[] }
 */
export async function searchPixabayImages(query, page = 1) {
  if (!API_KEY) {
    throw new Error('Pixabay API key not set! Add VITE_PIXABAY_API_KEY to .env');
  }

  const path = `/api/?key=${API_KEY}&q=${encodeURIComponent(query)}&page=${page}&per_page=${PER_PAGE}&image_type=photo`;
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
      type: 'image',
    })),
  };
}

/**
 * Search Pixabay for videos.
 * Returns normalized result: { total, totalPages, results[] }
 */
export async function searchPixabayVideos(query, page = 1) {
  if (!API_KEY) {
    throw new Error('Pixabay API key not set! Add VITE_PIXABAY_API_KEY to .env');
  }

  const path = `/api/videos/?key=${API_KEY}&q=${encodeURIComponent(query)}&page=${page}&per_page=${PER_PAGE}`;
  const data = await httpGetJSON('pixabay.com', path);

  const totalHits = data.totalHits || 0;

  return {
    total: totalHits,
    totalPages: Math.ceil(totalHits / PER_PAGE),
    results: (data.hits || []).map((hit) => {
      // Prefer "large" quality, fallback to "medium" or "small"
      const bestVideo = hit.videos?.large || hit.videos?.medium || hit.videos?.small;

      return {
        id: String(hit.id),
        description: hit.tags || 'video',
        thumbUrl: `https://i.vimeocdn.com/video/${hit.picture_id}_295x166.jpg`,
        fullUrl: bestVideo?.url || '',
        videoUrl: bestVideo?.url || '',
        userName: hit.user,
        userUrl: `https://pixabay.com/users/${hit.user}-${hit.user_id}`,
        source: 'pixabay',
        type: 'video',
        duration: hit.duration || 0,
        width: bestVideo?.width || 0,
        height: bestVideo?.height || 0,
      };
    }),
  };
}
