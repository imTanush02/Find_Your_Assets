import React, { useState, useCallback } from 'react';
import { useCEP } from '../context/CEPContext';
import { useSettings } from '../context/SettingsContext';
import { downloadAndImport, browserDownload, removeBgAndImport } from '../services/importer';

export default function PreviewModal({ image, onClose, onToast }) {
  const { isCEP, cs } = useCEP();
  const { removeBgApiKey, setIsSettingsOpen } = useSettings();
  const [status, setStatus] = useState('idle'); // idle | importing | importing-bg | success | error

  const handleImport = useCallback(async () => {
    if (status !== 'idle' && status !== 'error') return;
    setStatus('importing');
    try {
      if (isCEP && cs) {
        const result = await downloadAndImport(image.fullUrl, image.description, image.id);
        setStatus('success');
        onToast('success', `Imported: ${result.fileName}`);
        setTimeout(() => { setStatus('idle'); onClose(); }, 1500);
      } else {
        await browserDownload(image.fullUrl, image.description, image.id);
        setStatus('success');
        onToast('success', 'Downloaded!');
        setTimeout(() => { setStatus('idle'); onClose(); }, 1500);
      }
    } catch (err) {
      setStatus('error');
      onToast('error', `Import failed: ${err.message}`);
      setTimeout(() => setStatus('idle'), 2500);
    }
  }, [image, isCEP, cs, status, onToast, onClose]);

  const handleRemoveBg = useCallback(async () => {
    if (status !== 'idle' && status !== 'error') return;
    if (!removeBgApiKey) {
      onToast('error', 'Please set your Remove.bg API key in settings.');
      setIsSettingsOpen(true);
      return;
    }
    setStatus('importing-bg');
    try {
      if (isCEP && cs) {
        const result = await removeBgAndImport(image.fullUrl, image.description, image.id, removeBgApiKey);
        setStatus('success');
        onToast('success', `BG Removed: ${result.fileName}`);
        setTimeout(() => { setStatus('idle'); onClose(); }, 1500);
      } else {
        onToast('error', 'Background removal only works inside After Effects.');
        setStatus('error');
        setTimeout(() => setStatus('idle'), 2500);
      }
    } catch (err) {
      setStatus('error');
      onToast('error', `Remove BG failed: ${err.message}`);
      setTimeout(() => setStatus('idle'), 3500);
    }
  }, [image, isCEP, cs, status, onToast, onClose, removeBgApiKey, setIsSettingsOpen]);

  if (!image) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex flex-col animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent shrink-0">
        <div className="flex flex-col">
          <span className="text-white font-semibold text-[14px]">Image Preview</span>
          <span className="text-text-muted text-[11px]">
            by <a href={image.userUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{image.userName}</a>
          </span>
        </div>
        <button 
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors border-none cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Image Container */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center p-4">
        <img 
          src={image.fullUrl} 
          alt={image.description} 
          className="max-w-full max-h-full object-contain rounded drop-shadow-2xl" 
        />
        
        {/* Loading / Status Overlays */}
        {status === 'importing' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded">
            <div className="w-10 h-10 border-4 border-white/20 border-t-accent rounded-full animate-spin-slow"></div>
          </div>
        )}
        {status === 'importing-bg' && (
          <div className="absolute inset-0 flex flex-col gap-3 items-center justify-center bg-black/60 rounded backdrop-blur-sm animate-fade-up">
            <div className="w-10 h-10 border-4 border-white/20 border-t-accent rounded-full animate-spin-slow"></div>
            <span className="text-white text-[12px] font-medium tracking-wider uppercase drop-shadow-md">Applying Magic...</span>
          </div>
        )}
        {status === 'success' && (
          <div className="absolute inset-0 flex items-center justify-center bg-success/80 rounded backdrop-blur-sm animate-fade-up">
            <div className="w-14 h-14 flex items-center justify-center border-4 border-white rounded-full text-[24px] font-bold text-white animate-success-pop">
              ✓
            </div>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="p-4 bg-bg-secondary border-t border-border-subtle shrink-0 flex gap-3">
        <button 
          onClick={handleImport}
          disabled={status !== 'idle' && status !== 'error'}
          className="flex-1 py-2.5 px-4 bg-bg-tertiary hover:bg-bg-hover text-white text-[13px] font-semibold rounded-md border border-border-subtle transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          ⬇️ Standard Import
        </button>
        <button 
          onClick={handleRemoveBg}
          disabled={status !== 'idle' && status !== 'error'}
          className="flex-1 py-2.5 px-4 bg-accent-gradient hover:opacity-90 text-white text-[13px] font-semibold rounded-md border-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
        >
          ✂️ Remove BG & Import
        </button>
      </div>
    </div>
  );
}
