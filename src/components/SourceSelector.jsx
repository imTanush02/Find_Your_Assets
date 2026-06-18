import React from 'react';
import { SOURCE_CONTENT_TYPES } from '../hooks/useSearch';

const SOURCE_LABELS = {
  pexels: { emoji: '🎨', name: 'Pexels' },
  unsplash: { emoji: '📷', name: 'Unsplash' },
  pixabay: { emoji: '🖼️', name: 'Pixabay' },
};

const CONTENT_LABELS = {
  images: '🖼️ Images',
  videos: '🎬 Videos',
};

export default function SourceSelector({ source, contentType, onSourceChange, onContentTypeChange }) {
  const availableTypes = SOURCE_CONTENT_TYPES[source] || ['images'];

  return (
    <div className="flex flex-col gap-1.5 mt-2">
      {/* Source Selector */}
      <div className="flex gap-1 bg-bg-secondary rounded-md p-[3px] border border-border-subtle">
        {Object.entries(SOURCE_LABELS).map(([key, { emoji, name }]) => (
          <button
            key={key}
            className={`flex-1 px-2 py-1.5 border-none rounded bg-transparent text-text-muted text-[11px] font-medium cursor-pointer transition-all duration-150 hover:text-text-primary hover:bg-bg-tertiary ${
              source === key ? '!bg-accent-gradient !text-white font-semibold' : ''
            }`}
            id={`source-${key}`}
            onClick={() => onSourceChange(key)}
          >
            {emoji} {name}
          </button>
        ))}
      </div>

      {/* Content Type Sub-toggle (only show if source supports multiple types) */}
      {availableTypes.length > 1 && (
        <div className="flex gap-1 bg-bg-secondary/50 rounded-md p-[2px] border border-border-subtle/50">
          {availableTypes.map((type) => (
            <button
              key={type}
              className={`flex-1 px-2 py-1 border-none rounded bg-transparent text-text-muted text-[10px] font-medium cursor-pointer transition-all duration-150 hover:text-text-primary hover:bg-bg-tertiary ${
                contentType === type ? '!bg-bg-tertiary !text-text-primary font-semibold border !border-border-subtle' : ''
              }`}
              id={`type-${type}`}
              onClick={() => onContentTypeChange(type)}
            >
              {CONTENT_LABELS[type]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
