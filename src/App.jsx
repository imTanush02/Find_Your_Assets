import React, { useState, useCallback } from 'react';
import { CEPProvider } from './context/CEPContext';
import { SettingsProvider } from './context/SettingsContext';
import { useSearch } from './hooks/useSearch';
import { useToast } from './hooks/useToast';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import ModeToggle from './components/ModeToggle';
import ImageGrid from './components/ImageGrid';
import Toast from './components/Toast';
import StatusBar from './components/StatusBar';
import DebugConsole from './components/DebugConsole';
import SettingsModal from './components/SettingsModal';
import PreviewModal from './components/PreviewModal';

function AppContent() {
  const {
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
  } = useSearch();

  const { toasts, addToast } = useToast();
  const [previewImage, setPreviewImage] = useState(null);

  const handleSearch = useCallback((searchQuery) => {
    search(searchQuery, mode);
  }, [search, mode]);

  const handleModeChange = useCallback((newMode) => {
    if (query) {
      search(query, newMode);
    }
  }, [search, query]);

  const statusText = (() => {
    if (loading && results.length === 0) return `Searching for "${query}"…`;
    if (error) return `⚠ ${error}`;
    if (total > 0) return `${total.toLocaleString()} images — page ${page}/${totalPages}`;
    if (query && !loading && results.length === 0) return `No results for "${query}"`;
    return '';
  })();

  return (
    <div id="app" className="flex flex-col h-full overflow-hidden min-h-0 bg-bg-primary text-text-primary">
      <Header />

      <div className="px-3.5 pt-2.5 pb-1.5 shrink-0 bg-bg-primary">
        <SearchBar onSearch={handleSearch} mode={mode} />
        <ModeToggle mode={mode} onModeChange={handleModeChange} />
      </div>

      {statusText && <p className="text-center text-text-muted text-[11px] min-h-[1.2em] px-3.5 py-1 shrink-0">{statusText}</p>}

      <div className="flex-1 overflow-y-scroll overflow-x-hidden px-3.5 pt-2 pb-10 min-h-0 relative touch-pan-y">
        {!loading && results.length === 0 && query && !error && (
          <div className="col-span-full flex flex-col items-center justify-center py-10 px-5 text-text-muted text-center">
            <div className="text-[32px] mb-2.5 opacity-60">🔍</div>
            <p className="text-[11px] leading-relaxed">No results found for "{query}"</p>
          </div>
        )}

        <ImageGrid
          results={results}
          mode={mode}
          loading={loading}
          page={page}
          totalPages={totalPages}
          onLoadMore={loadMore}
          onToast={addToast}
          onPreview={setPreviewImage}
        />
      </div>

      <Toast toasts={toasts} />
      <DebugConsole />
      <StatusBar total={total} loading={loading} error={error} />
      <SettingsModal />
      
      {previewImage && (
        <PreviewModal 
          image={previewImage} 
          onClose={() => setPreviewImage(null)} 
          onToast={addToast} 
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <CEPProvider>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </CEPProvider>
  );
}

