// ══════════════════════════════════════════
//  useSearch Hook — manages search state & pagination
// ══════════════════════════════════════════

import { useState, useCallback } from 'react';
import { searchPhotos } from '../services/unsplash';
import { searchPNGs } from '../services/pixabay';

export function useSearch() {
  const [results, setResults] = useState([]);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('photos'); // 'photos' | 'pngs'
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const search = useCallback(async (searchQuery, searchMode) => {
    if (!searchQuery.trim()) return;

    setQuery(searchQuery);
    setMode(searchMode);
    setPage(1);
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const searchFn = searchMode === 'pngs' ? searchPNGs : searchPhotos;
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
      const searchFn = mode === 'pngs' ? searchPNGs : searchPhotos;
      const data = await searchFn(query, nextPage);
      setResults((prev) => [...prev, ...data.results]);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, mode, query]);

  return {
    results,
    query,
    mode,
    page,
    totalPages,
    total,
    loading,
    error,
    search,
    loadMore,
    setMode,
  };
}
