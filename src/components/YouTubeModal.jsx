import React, { useState, useRef, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import {
  fetchYouTubeVideo,
  isYtDlpInstalled,
  downloadYtDlp,
} from '../services/youtube';
import { downloadYouTubeVideoAndImport } from '../services/importer';

export default function YouTubeModal({ addToast }) {
  const { isYouTubeOpen, setIsYouTubeOpen } = useSettings();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoData, setVideoData] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [importingQuality, setImportingQuality] = useState(null);
  const [ytdlpReady, setYtdlpReady] = useState(false);
  const [setupProgress, setSetupProgress] = useState(null);
  const inputRef = useRef(null);

  // Check yt-dlp status when modal opens
  useEffect(() => {
    if (isYouTubeOpen) {
      setYtdlpReady(isYtDlpInstalled());
    }
  }, [isYouTubeOpen]);

  const reset = () => {
    setUrl('');
    setVideoData(null);
    setFetchError(null);
    setLoading(false);
    setImportingQuality(null);
  };

  const handleClose = () => {
    setIsYouTubeOpen(false);
    reset();
  };

  const handleSetup = async () => {
    setSetupProgress('Starting download...');
    try {
      await downloadYtDlp((msg) => setSetupProgress(msg));
      setYtdlpReady(true);
      setSetupProgress(null);
      addToast('success', 'yt-dlp installed successfully!');
    } catch (err) {
      setSetupProgress(null);
      addToast('error', `Setup failed: ${err.message}`);
    }
  };

  const handleFetch = async () => {
    if (!url.trim()) {
      addToast('error', 'Please paste a YouTube URL.');
      return;
    }

    setLoading(true);
    setVideoData(null);
    setFetchError(null);

    try {
      const data = await fetchYouTubeVideo(url.trim());
      setVideoData(data);
    } catch (err) {
      setFetchError(err.message);
      const shortMsg = err.message.split('\n')[0];
      addToast('error', shortMsg);
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
      const result = await downloadYouTubeVideoAndImport(
        videoData.videoId,
        quality.format_id,
        videoData?.title || 'YouTube Video',
        quality.quality,
        quality.ext
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

  const formatFileSize = (bytes) => {
    if (!bytes) return null;
    if (bytes > 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes > 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
  };

  if (!isYouTubeOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
      <div className="bg-bg-secondary border border-border-subtle rounded-lg shadow-xl w-full max-w-sm flex flex-col overflow-hidden animate-fade-up max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-bg-tertiary shrink-0">
          <h2 className="text-text-primary text-[14px] font-semibold flex items-center gap-2">
            <span>🎬</span> YouTube Video
          </h2>
          {!importingQuality && !setupProgress && (
            <button
              onClick={handleClose}
              className="text-text-muted hover:text-text-primary p-1 leading-none text-lg"
            >
              &times;
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-3 overflow-y-auto">

          {/* yt-dlp Setup Required */}
          {!ytdlpReady && !setupProgress && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="text-[28px]">⚙️</div>
              <p className="text-[12px] text-text-primary font-medium text-center">
                One-time setup required
              </p>
              <p className="text-[10px] text-text-muted text-center leading-relaxed px-2">
                YouTube requires a special tool (yt-dlp) to extract video streams.
                This will download a small utility (~20 MB) to your computer.
              </p>
              <button
                onClick={handleSetup}
                className="px-4 py-2 bg-accent-gradient text-white rounded text-[12px] font-medium hover:opacity-90 transition-opacity"
              >
                Setup yt-dlp
              </button>
            </div>
          )}

          {/* Setup in progress */}
          {setupProgress && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-8 h-8 border-3 border-border-subtle border-t-accent rounded-full animate-spin mb-3"></div>
              <p className="text-[11px] text-text-muted">{setupProgress}</p>
            </div>
          )}

          {/* Main UI — only show when yt-dlp is ready */}
          {ytdlpReady && !setupProgress && (
            <>
              {/* URL Input */}
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  className="flex-1 px-2.5 py-1.5 bg-bg-primary border border-border-subtle rounded text-text-primary text-[12px] focus:border-accent focus:outline-none transition-colors placeholder:text-text-muted/50"
                  placeholder="Paste YouTube URL..."
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
                  <p className="text-[11px] text-text-muted">Extracting video info…</p>
                  <p className="text-[10px] text-text-muted/60 mt-1">This may take a few seconds</p>
                </div>
              )}

              {/* Video Results */}
              {videoData && !loading && (
                <div className="flex flex-col gap-3">

                  {/* Thumbnail + Title */}
                  <div className="flex gap-3 items-start">
                    {videoData.thumbnail && (
                      <div className="w-24 h-14 rounded overflow-hidden shrink-0 bg-bg-tertiary">
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
                      {videoData.author && (
                        <p className="text-[10px] text-text-muted mt-1">
                          By: {videoData.author}
                        </p>
                      )}
                      {videoData.duration && (
                        <p className="text-[10px] text-text-muted mt-0.5">
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
                          {q.hasAudio && (
                            <span className="text-[9px] text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded">
                              🔊
                            </span>
                          )}
                          {q.filesize && (
                            <span className="text-[9px] text-text-muted">
                              {formatFileSize(q.filesize)}
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

              {/* Error Details */}
              {fetchError && !loading && (
                <div className="bg-red-500/10 border border-red-500/30 rounded p-3">
                  <p className="text-[11px] text-red-400 font-medium mb-1">⚠ Failed to extract video</p>
                  <pre className="text-[9px] text-text-muted whitespace-pre-wrap break-words leading-relaxed max-h-32 overflow-y-auto">
                    {fetchError}
                  </pre>
                </div>
              )}

              {/* Hint when empty */}
              {!videoData && !loading && !fetchError && (
                <p className="text-[10px] text-text-muted text-center py-2 leading-relaxed">
                  Paste a YouTube video URL above and click Fetch.<br />
                  Supports youtube.com/watch, youtu.be, and Shorts links.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
