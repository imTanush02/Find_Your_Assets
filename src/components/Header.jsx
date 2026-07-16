import React from 'react';
import { useSettings } from '../context/SettingsContext';

export default function Header() {
  const { setIsSettingsOpen, setIsLocalRemoveBgOpen, setIsPinterestOpen } = useSettings();

  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 bg-bg-secondary border-b border-border-subtle shrink-0">
      <h1 className="flex items-center gap-2 text-[15px] font-semibold text-text-primary tracking-[0.3px]">
        <span className="text-base">🔍</span>
        Find_Your_Assets
      </h1>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-full">v1.0</span>
        
        <button
          onClick={() => setIsPinterestOpen(true)}
          className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 bg-bg-tertiary hover:bg-bg-tertiary-hover text-text-primary rounded border border-border-subtle transition-colors cursor-pointer"
          title="Pinterest Video Downloader"
        >
          <span>📌</span>
          <span className="hidden sm:inline">Pinterest</span>
        </button>

        <button
          onClick={() => setIsLocalRemoveBgOpen(true)}
          className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 bg-bg-tertiary hover:bg-bg-tertiary-hover text-text-primary rounded border border-border-subtle transition-colors cursor-pointer"
          title="Local Remove BG"
        >
          <span>✂️</span>
          <span className="hidden sm:inline">Remove BG</span>
        </button>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="text-[14px] p-1 text-text-muted hover:text-text-primary transition-colors cursor-pointer bg-transparent border-none outline-none ml-1"
          title="Settings"
        >
          ⚙️
        </button>
      </div>
    </div>
  );
}
