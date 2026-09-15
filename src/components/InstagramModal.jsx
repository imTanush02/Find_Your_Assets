import React, { useState, useRef, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import {
  fetchInstagramPost,
  isYtDlpInstalled,
  downloadYtDlp,
  updateYtDlp,
  getYtDlpVersion,
} from '../services/instagram';
import {
  downloadInstagramReelAndImport,
  downloadInstagramImageAndImport,
  downloadInstagramCarouselAndImport,
} from '../services/importer';

export default function InstagramModal({ addToast }) {
  const { isInstagramOpen, setIsInstagramOpen } = useSettings();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [postData, setPostData] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [importingQuality, setImportingQuality] = useState(null);
  const [importingImage, setImportingImage] = useState(false);
  const [importingItems, setImportingItems] = useState(new Set());
  const [importAllProgress, setImportAllProgress] = useState(null); // { current, total }
  const [ytdlpReady, setYtdlpReady] = useState(false);
  const [ytdlpVersion, setYtdlpVersion] = useState(null);
  const [updatingDlp, setUpdatingDlp] = useState(false);
  const [setupProgress, setSetupProgress] = useState(null);
  const inputRef = useRef(null);

  // Check yt-dlp status and version when modal opens
  useEffect(() => {
    if (isInstagramOpen) {
      const installed = isYtDlpInstalled();
      setYtdlpReady(installed);
      if (installed) {
        getYtDlpVersion().then((ver) => setYtdlpVersion(ver));
      }
    }
  }, [isInstagramOpen]);

  const handleUpdateDlp = async () => {
    setUpdatingDlp(true);
    try {
      const res = await updateYtDlp();
      if (res.version) setYtdlpVersion(res.version);
      addToast(res.updated ? 'success' : 'info', res.message);
    } catch (err) {
      addToast('error', `Update failed: ${err.message}`);
    } finally {
      setUpdatingDlp(false);
    }
  };

  const reset = () => {
    setUrl('');
    setPostData(null);
    setFetchError(null);
    setLoading(false);
    setImportingQuality(null);
    setImportingImage(false);
    setImportingItems(new Set());
    setImportAllProgress(null);
  };

  const handleClose = () => {
    setIsInstagramOpen(false);
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
      addToast('error', 'Please paste an Instagram URL.');
      return;
    }

    setLoading(true);
    setPostData(null);
    setFetchError(null);

    try {
      const data = await fetchInstagramPost(url.trim());
      setPostData(data);
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

  // ── Import Handlers ──

  /** Import a video reel (existing behavior) */
  const handleImportReel = async (quality) => {
    setImportingQuality(quality.quality);
    try {
      const result = await downloadInstagramReelAndImport(
        url.trim(),
        quality.format_id,
        postData?.title || 'Instagram Reel',
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

  /** Import a single image post */
  const handleImportImage = async (imageUrl, index = 0) => {
    setImportingImage(true);
    try {
      const result = await downloadInstagramImageAndImport(
        imageUrl,
        postData?.title || 'Instagram Post',
        index,
      );
      addToast('success', `Imported: ${result.fileName}`);
      handleClose();
    } catch (err) {
      addToast('error', `Import failed: ${err.message}`);
      setImportingImage(false);
    }
  };

  /** Import a single carousel item */
  const handleImportCarouselItem = async (item, index) => {
    setImportingItems((prev) => new Set([...prev, index]));
    try {
      if (item.type === 'video' && item.qualities && item.qualities.length > 0) {
        const bestQuality = item.qualities[0];
        const result = await downloadInstagramReelAndImport(
          url.trim(),
          bestQuality.format_id,
          postData?.title || 'Instagram Video',
          bestQuality.quality,
          bestQuality.ext,
        );
        addToast('success', `Imported: ${result.fileName}`);
      } else if (item.url) {
        const result = await downloadInstagramImageAndImport(
          item.url,
          postData?.title || 'Instagram Image',
          index,
        );
        addToast('success', `Imported: ${result.fileName}`);
      }
    } catch (err) {
      addToast('error', `Import failed (item ${index + 1}): ${err.message}`);
    } finally {
      setImportingItems((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  };

  /** Import ALL carousel items */
  const handleImportAll = async () => {
    if (!postData || postData.type !== 'carousel' || !postData.items) return;

    const allIndices = new Set(postData.items.map((_, i) => i));
    setImportingItems(allIndices);
    setImportAllProgress({ current: 0, total: postData.items.length });

    try {
      const results = await downloadInstagramCarouselAndImport(
        postData.items,
        url.trim(),
        postData?.title || 'Instagram Post',
        (current) => {
          setImportAllProgress({ current: current + 1, total: postData.items.length });
        },
      );

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      if (failCount === 0) {
        addToast('success', `Imported all ${successCount} items!`);
        handleClose();
      } else {
        addToast('warning', `Imported ${successCount}/${results.length} items (${failCount} failed)`);
      }
    } catch (err) {
      addToast('error', `Import failed: ${err.message}`);
    } finally {
      setImportingItems(new Set());
      setImportAllProgress(null);
    }
  };

  // ── Utilities ──

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

  const isAnyImporting = !!importingQuality || importingImage || importingItems.size > 0 || !!importAllProgress;

  if (!isInstagramOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
      <div className="bg-bg-secondary border border-border-subtle rounded-lg shadow-xl w-full max-w-sm flex flex-col overflow-hidden animate-fade-up max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-bg-tertiary shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-text-primary text-[14px] font-semibold flex items-center gap-2">
              <span>📸</span> Instagram
            </h2>
            {ytdlpVersion && (
              <span className="text-[9px] font-mono text-text-muted bg-bg-primary px-1.5 py-0.5 rounded border border-border-subtle/50">
                v{ytdlpVersion}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {ytdlpReady && !setupProgress && (
              <button
                onClick={handleUpdateDlp}
                disabled={updatingDlp || loading || isAnyImporting}
                title="Update yt-dlp to latest version"
                className="px-2 py-1 bg-bg-primary/80 hover:bg-bg-primary border border-border-subtle hover:border-accent/40 text-text-secondary hover:text-text-primary rounded text-[10px] font-medium transition-all flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className={`text-[10px] ${updatingDlp ? 'animate-spin inline-block' : ''}`}>🔄</span>
                <span>{updatingDlp ? 'Updating…' : 'Update DLP'}</span>
              </button>
            )}
            {!isAnyImporting && !setupProgress && (
              <button
                onClick={handleClose}
                className="text-text-muted hover:text-text-primary p-1 leading-none text-lg"
              >
                &times;
              </button>
            )}
          </div>
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
                Instagram content requires a special tool (yt-dlp) to extract media.
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
                  placeholder="Paste Instagram URL..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading || isAnyImporting}
                />
                <button
                  onClick={handleFetch}
                  disabled={loading || isAnyImporting || !url.trim()}
                  className="px-3 py-1.5 bg-accent-gradient text-white rounded text-[11px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {loading ? 'Fetching…' : 'Fetch'}
                </button>
              </div>

              {/* Loading Spinner */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="w-8 h-8 border-3 border-border-subtle border-t-accent rounded-full animate-spin mb-3"></div>
                  <p className="text-[11px] text-text-muted">Extracting post info…</p>
                  <p className="text-[10px] text-text-muted/60 mt-1">This may take a few seconds</p>
                </div>
              )}

              {/* ═══ REEL (Video) Results ═══ */}
              {postData && postData.type === 'reel' && !loading && (
                <div className="flex flex-col gap-3">

                  {/* Thumbnail + Title */}
                  <div className="flex gap-3 items-start">
                    {postData.thumbnail && (
                      <div className="w-24 h-14 rounded overflow-hidden shrink-0 bg-bg-tertiary">
                        <img
                          src={postData.thumbnail}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded">Reel</span>
                      </div>
                      <p className="text-[13px] font-medium text-text-primary leading-tight line-clamp-2">
                        {postData.title}
                      </p>
                      {postData.author && (
                        <p className="text-[10px] text-text-muted mt-1">
                          By: @{postData.author}
                        </p>
                      )}
                      {postData.duration && (
                        <p className="text-[10px] text-text-muted mt-0.5">
                          Duration: {formatDuration(postData.duration)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quality Buttons */}
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider">
                      Available Qualities
                    </p>
                    {postData.qualities.map((q) => (
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
                          onClick={() => handleImportReel(q)}
                          disabled={isAnyImporting}
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

              {/* ═══ IMAGE (Single) Results ═══ */}
              {postData && postData.type === 'image' && !loading && (
                <div className="flex flex-col gap-3">

                  {/* Thumbnail + Title */}
                  <div className="flex gap-3 items-start">
                    {postData.thumbnail && (
                      <div className="w-24 h-24 rounded overflow-hidden shrink-0 bg-bg-tertiary">
                        <img
                          src={postData.thumbnail}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">Image</span>
                      </div>
                      <p className="text-[13px] font-medium text-text-primary leading-tight line-clamp-2">
                        {postData.title}
                      </p>
                      {postData.author && (
                        <p className="text-[10px] text-text-muted mt-1">
                          By: @{postData.author}
                        </p>
                      )}
                      {postData.images[0]?.width && postData.images[0]?.height && (
                        <p className="text-[10px] text-text-muted mt-0.5">
                          {postData.images[0].width}×{postData.images[0].height}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Import Button */}
                  <button
                    onClick={() => handleImportImage(postData.images[0]?.url || postData.thumbnail)}
                    disabled={isAnyImporting}
                    className="w-full py-2.5 bg-accent-gradient text-white rounded text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {importingImage ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Importing…
                      </>
                    ) : (
                      <>
                        <span>⬇</span> Import Image
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* ═══ CAROUSEL (Multi-item) Results ═══ */}
              {postData && postData.type === 'carousel' && !loading && (
                <div className="flex flex-col gap-3">

                  {/* Title + Author */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                        Carousel · {postData.items.length} items
                      </span>
                    </div>
                    <p className="text-[13px] font-medium text-text-primary leading-tight line-clamp-2">
                      {postData.title}
                    </p>
                    {postData.author && (
                      <p className="text-[10px] text-text-muted mt-1">
                        By: @{postData.author}
                      </p>
                    )}
                  </div>

                  {/* Import All Button */}
                  <button
                    onClick={handleImportAll}
                    disabled={isAnyImporting}
                    className="w-full py-2.5 bg-accent-gradient text-white rounded text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {importAllProgress ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Importing {importAllProgress.current}/{importAllProgress.total}…
                      </>
                    ) : (
                      <>
                        <span>⬇</span> Import All ({postData.items.length} items)
                      </>
                    )}
                  </button>

                  {/* Individual Items */}
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider">
                      Individual Items
                    </p>
                    {postData.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-3 py-2 bg-bg-primary rounded border border-border-subtle"
                      >
                        <div className="flex items-center gap-2.5">
                          {/* Item thumbnail */}
                          {(item.thumbnail || item.url) && (
                            <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-bg-tertiary">
                              <img
                                src={item.thumbnail || item.url}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            </div>
                          )}
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-medium text-text-primary">
                              {item.type === 'video' ? '🎬' : '🖼️'} Item {idx + 1}
                            </span>
                            <span className="text-[9px] text-text-muted">
                              {item.type === 'video' ? 'Video' : 'Image'}
                              {item.width && item.height ? ` · ${item.width}×${item.height}` : ''}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleImportCarouselItem(item, idx)}
                          disabled={isAnyImporting}
                          className="px-2.5 py-1 bg-accent-gradient text-white rounded text-[10px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shrink-0"
                        >
                          {importingItems.has(idx) ? (
                            <>
                              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                              {importAllProgress ? '' : 'Importing…'}
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
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] text-red-400 font-medium">⚠ Failed to extract post</p>
                    {ytdlpReady && (
                      <button
                        onClick={handleUpdateDlp}
                        disabled={updatingDlp}
                        className="text-[10px] text-accent hover:underline flex items-center gap-1 disabled:opacity-50"
                      >
                        <span className={updatingDlp ? 'animate-spin inline-block' : ''}>🔄</span>
                        <span>{updatingDlp ? 'Updating…' : 'Update yt-dlp'}</span>
                      </button>
                    )}
                  </div>
                  <pre className="text-[9px] text-text-muted whitespace-pre-wrap break-words leading-relaxed max-h-32 overflow-y-auto">
                    {fetchError}
                  </pre>
                </div>
              )}

              {/* Hint when empty */}
              {!postData && !loading && !fetchError && (
                <p className="text-[10px] text-text-muted text-center py-2 leading-relaxed">
                  Paste an Instagram URL above and click Fetch.<br />
                  Supports Reels, Image Posts, and Carousels.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
