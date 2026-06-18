// ══════════════════════════════════════════
//  Pexels API Service — Photos & Videos
// ══════════════════════════════════════════

import { httpGetJSON } from './http';

const API_KEY = import.meta.env.VITE_PEXELS_API_KEY;
const PER_PAGE = 20;

/**
 * Search Pexels for photos.
 * Returns normalized result: { total, totalPages, results[] }
 */
export async function searchPexelsPhotos(query, page = 1) {
  if (!API_KEY) {
    throw new Error('Pexels API key not set! Add VITE_PEXELS_API_KEY to .env');
  }

  const path = `/v1/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${PER_PAGE}`;
  const data = await httpGetJSON('api.pexels.com', path, {
    Authorization: API_KEY,
  });

  const totalResults = data.total_results || 0;

  return {
    total: totalResults,
    totalPages: Math.ceil(totalResults / PER_PAGE),
    results: (data.photos || []).map((photo) => ({
      id: String(photo.id),
      description: photo.alt || 'photo',
      thumbUrl: photo.src.medium,
      fullUrl: photo.src.original,
      userName: photo.photographer,
      userUrl: photo.photographer_url,
      source: 'pexels',
      type: 'image',
    })),
  };
}

/**
 * Search Pexels for videos.
 * Returns normalized result: { total, totalPages, results[] }
 */
export async function searchPexelsVideos(query, page = 1) {
  if (!API_KEY) {
    throw new Error('Pexels API key not set! Add VITE_PEXELS_API_KEY to .env');
  }

  const path = `/videos/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${PER_PAGE}`;
  const data = await httpGetJSON('api.pexels.com', path, {
    Authorization: API_KEY,
  });

  const totalResults = data.total_results || 0;

  return {
    total: totalResults,
    totalPages: Math.ceil(totalResults / PER_PAGE),
    results: (data.videos || []).map((video) => {
      // Pick the best video file (HD preferred, fallback to first)
      const hdFile = video.video_files.find(
        (f) => f.quality === 'hd' && f.width && f.width >= 1280
      );
      const bestFile = hdFile || video.video_files[0];

      // Pick the best thumbnail (landscape preferred)
      const bestThumb =
        video.video_pictures?.[0]?.picture || video.image;

      return {
        id: String(video.id),
        description: video.url?.split('/').pop()?.replace(/-/g, ' ') || 'video',
        thumbUrl: bestThumb,
        fullUrl: bestFile?.link || '',
        videoUrl: bestFile?.link || '',
        userName: video.user?.name || 'Unknown',
        userUrl: video.user?.url || 'https://pexels.com',
        source: 'pexels',
        type: 'video',
        duration: video.duration || 0,
        width: bestFile?.width || video.width || 0,
        height: bestFile?.height || video.height || 0,
      };
    }),
  };
}
