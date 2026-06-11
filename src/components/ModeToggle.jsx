import React from 'react';

export default function ModeToggle({ mode, onModeChange }) {
  return (
    <div className="flex gap-1 mt-2 bg-bg-secondary rounded-md p-[3px] border border-border-subtle">
      <button
        className={`flex-1 px-2.5 py-1.5 border-none rounded bg-transparent text-text-muted text-[11px] font-medium cursor-pointer transition-all duration-150 hover:text-text-primary hover:bg-bg-tertiary ${mode === 'photos' ? '!bg-accent-gradient !text-white font-semibold' : ''}`}
        data-mode="photos"
        id="modePhotos"
        onClick={() => onModeChange('photos')}
      >
        📷 Photos
      </button>
      <button
        className={`flex-1 px-2.5 py-1.5 border-none rounded bg-transparent text-text-muted text-[11px] font-medium cursor-pointer transition-all duration-150 hover:text-text-primary hover:bg-bg-tertiary ${mode === 'pngs' ? '!bg-accent-gradient !text-white font-semibold' : ''}`}
        data-mode="pngs"
        id="modePngs"
        onClick={() => onModeChange('pngs')}
      >
        🖼️ PNGs
      </button>
    </div>
  );
}
