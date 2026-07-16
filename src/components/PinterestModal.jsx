import React, { useState, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import { fetchPinterestVideo } from '../services/pinterest';
import { downloadPinterestVideoAndImport } from '../services/importer';

export default function PinterestModal({ addToast }) {
  const { isPinterestOpen, setIsPinterestOpen } = useSettings();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoData, setVideoData] = useState(null);
  const [importingQuality, setImportingQuality] = useState(null);
  const inputRef = useRef(null);

  const reset = () => {
    setUrl('');
    setVideoData(null);
    setLoading(false);
    setImportingQuality(null);
  };

  const handleClose = () => {
    setIsPinterestOpen(false);
    reset();
  };

  const handleFetch = async () => {
    if (!url.trim()) {
      addToast('error', 'Please paste a Pinterest URL.');
      return;
    }

    setLoading(true);
    setVideoData(null);

    try {
      const data = await fetchPinterestVideo(url.trim());
      setVideoData(data);
    } catch (err) {
      addToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleFetch();
    }
  };

  const handleImport = async (quality) => {
    setImportingQuality(quality.quality);
    try {
      const result = await downloadPinterestVideoAndImport(
        quality.url,
        videoData?.title || 'Pinterest Video',
        quality.quality,
      );
      addToast('success', `Imported: ${result.fileName}`);
      handleClose();
    } catch (err) {
      addToast('error', `Import failed: ${err.message}`);
      setImportingQuality(null);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return null;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!isPinterestOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
      <div className="bg-bg-secondary border border-border-subtle rounded-lg shadow-xl w-full max-w-sm flex flex-col overflow-hidden animate-fade-up">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-bg-tertiary">
          <h2 className="text-text-primary text-[14px] font-semibold flex items-center gap-2">
            <span>📌</span> Pinterest Video
          </h2>
          {!importingQuality && (
            <button
              onClick={handleClose}
              className="text-text-muted hover:text-text-primary p-1 leading-none text-lg"
            >
              &times;
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-3">

          {/* URL Input */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              className="flex-1 px-2.5 py-1.5 bg-bg-primary border border-border-subtle rounded text-text-primary text-[12px] focus:border-accent focus:outline-none transition-colors placeholder:text-text-muted/50"
              placeholder="Paste Pinterest pin URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || !!importingQuality}
            />
            <button
              onClick={handleFetch}
              disabled={loading || !!importingQuality || !url.trim()}
              className="px-3 py-1.5 bg-accent-gradient text-white rounded text-[11px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? 'Fetching…' : 'Fetch'}
            </button>
          </div>

          {/* Loading Spinner */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-8 h-8 border-3 border-border-subtle border-t-accent rounded-full animate-spin mb-3"></div>
              <p className="text-[11px] text-text-muted">Fetching video info from Pinterest…</p>
            </div>
          )}

          {/* Video Results */}
          {videoData && !loading && (
            <div className="flex flex-col gap-3">

              {/* Thumbnail + Title */}
              <div className="flex gap-3 items-start">
                {videoData.thumbnail && (
                  <div className="w-20 h-14 rounded overflow-hidden shrink-0 bg-bg-tertiary">
                    <img
                      src={videoData.thumbnail}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-text-primary leading-tight line-clamp-2">
                    {videoData.title}
                  </p>
                  {videoData.duration && (
                    <p className="text-[10px] text-text-muted mt-1">
                      Duration: {formatDuration(videoData.duration)}
                    </p>
                  )}
                </div>
              </div>

              {/* Quality Buttons */}
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider">
                  Available Qualities
                </p>
                {videoData.qualities.map((q) => (
                  <div
                    key={q.quality + q.url}
                    className="flex items-center justify-between px-3 py-2 bg-bg-primary rounded border border-border-subtle"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold text-text-primary">
                        {q.quality}
                      </span>
                      {q.width && q.height && (
                        <span className="text-[10px] text-text-muted">
                          {q.width}×{q.height}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleImport(q)}
                      disabled={!!importingQuality}
                      className="px-2.5 py-1 bg-accent-gradient text-white rounded text-[10px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {importingQuality === q.quality ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          Importing…
                        </>
                      ) : (
                        <>
                          <span>⬇</span> Import
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hint when empty */}
          {!videoData && !loading && (
            <p className="text-[10px] text-text-muted text-center py-2 leading-relaxed">
              Paste a Pinterest video pin URL above and click Fetch.<br />
              Works with pinterest.com/pin/... links.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
