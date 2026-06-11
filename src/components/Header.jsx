import React from 'react';
import { useSettings } from '../context/SettingsContext';

export default function Header() {
  const { setIsSettingsOpen } = useSettings();

  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 bg-bg-secondary border-b border-border-subtle shrink-0">
      <h1 className="flex items-center gap-2 text-[15px] font-semibold text-text-primary tracking-[0.3px]">
        <span className="text-base">🔍</span>
        Find_Your_Assets
      </h1>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-full">v1.0</span>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="text-[14px] p-1 text-text-muted hover:text-text-primary transition-colors cursor-pointer bg-transparent border-none outline-none"
          title="Settings"
        >
          ⚙️
        </button>
      </div>
    </div>
  );
}
