import React from 'react';
import { useSettings } from '../context/SettingsContext';

export default function SettingsModal() {
  const { removeBgApiKey, setRemoveBgApiKey, replicateApiKey, setReplicateApiKey, isSettingsOpen, setIsSettingsOpen } = useSettings();

  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
      <div className="bg-bg-secondary border border-border-subtle rounded-lg shadow-xl w-full max-w-sm p-4 animate-fade-up">
        <h2 className="text-text-primary text-[14px] font-semibold mb-3 flex items-center gap-2">
          <span>⚙️</span> Settings
        </h2>
        
        <div className="mb-4">
          <label className="block text-text-muted text-[11px] mb-1.5 font-medium">
            Remove.bg API Key
          </label>
          <input
            type="password"
            className="w-full px-2.5 py-1.5 bg-bg-primary border border-border-subtle rounded text-text-primary text-[12px] focus:border-accent focus:outline-none transition-colors"
            placeholder="Paste API key here..."
            value={removeBgApiKey}
            onChange={(e) => setRemoveBgApiKey(e.target.value)}
          />
          <p className="text-[10px] text-text-muted mt-1.5 leading-relaxed">
            Required for image background removal. Get a free key at{' '}
            <a href="https://remove.bg/api" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              remove.bg/api
            </a>
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-text-muted text-[11px] mb-1.5 font-medium">
            Replicate API Token
          </label>
          <input
            type="password"
            className="w-full px-2.5 py-1.5 bg-bg-primary border border-border-subtle rounded text-text-primary text-[12px] focus:border-accent focus:outline-none transition-colors"
            placeholder="Paste API token here..."
            value={replicateApiKey}
            onChange={(e) => setReplicateApiKey(e.target.value)}
          />
          <p className="text-[10px] text-text-muted mt-1.5 leading-relaxed">
            Required for cloud video BG removal. Get a free token at{' '}
            <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              replicate.com
            </a>
            {' '}($5 free credits)
          </p>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="px-4 py-1.5 bg-accent-gradient text-white rounded text-[11px] font-medium hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
