// ══════════════════════════════════════════
//  useSearch Hook — manages search state & pagination
//  Supports source selection + content type (images/videos)
// ══════════════════════════════════════════

import { useState, useCallback } from 'react';
import { searchPhotos } from '../services/unsplash';
import { searchPixabayImages, searchPixabayVideos } from '../services/pixabay';
import { searchPexelsPhotos, searchPexelsVideos } from '../services/pexels';

// Map source + contentType to the correct API function
const SEARCH_FN_MAP = {
  pexels: {
    images: searchPexelsPhotos,
    videos: searchPexelsVideos,
  },
  unsplash: {
    images: searchPhotos,
    // Unsplash has no video API
  },
  pixabay: {
    images: searchPixabayImages,
    videos: searchPixabayVideos,
  },
};

// Which content types each source supports
export const SOURCE_CONTENT_TYPES = {
  pexels: ['images', 'videos'],
  unsplash: ['images'],
  pixabay: ['images', 'videos'],
};

export function useSearch() {
  const [results, setResults] = useState([]);
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('pexels'); // 'pexels' | 'unsplash' | 'pixabay'
  const [contentType, setContentType] = useState('images'); // 'images' | 'videos'
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const search = useCallback(async (searchQuery, searchSource, searchContentType) => {
    if (!searchQuery.trim()) return;

    setQuery(searchQuery);
    setSource(searchSource);
    setContentType(searchContentType);
    setPage(1);
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const searchFn = SEARCH_FN_MAP[searchSource]?.[searchContentType];
      if (!searchFn) {
        throw new Error(`${searchSource} does not support ${searchContentType}`);
      }
      const data = await searchFn(searchQuery, 1);
      setResults(data.results);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    setLoading(true);

    try {
      const searchFn = SEARCH_FN_MAP[source]?.[contentType];
      if (!searchFn) {
        throw new Error(`${source} does not support ${contentType}`);
      }
      const data = await searchFn(query, nextPage);
      setResults((prev) => [...prev, ...data.results]);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, source, contentType, query]);

  return {
    results,
    query,
    source,
    contentType,
    page,
    totalPages,
    total,
    loading,
    error,
    search,
    loadMore,
    setSource,
    setContentType,
  };
}
