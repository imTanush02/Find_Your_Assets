import React, { useState, useEffect } from 'react';
import { useCEP } from '../context/CEPContext';
import { loadImageAsDataUri } from '../services/importer';

/**
 * Format seconds to MM:SS
 */
function formatDuration(seconds) {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ImageCard({ image, onPreview, index }) {
  const { isCEP } = useCEP();
  const [thumbSrc, setThumbSrc] = useState(null);
  const isVideo = image.type === 'video';

  // For Pixabay images in CEP, load thumbnails via Node.js (hotlink workaround)
  useEffect(() => {
    if (isCEP && image.source === 'pixabay') {
      loadImageAsDataUri(image.thumbUrl)
        .then((dataUri) => setThumbSrc(dataUri))
        .catch(() => setThumbSrc(null));
    } else {
      setThumbSrc(image.thumbUrl);
    }
  }, [image.thumbUrl, isCEP, image.source]);

  return (
    <div
      className="relative rounded-lg overflow-hidden bg-bg-card border border-border-subtle cursor-pointer transition-all duration-250 animate-fade-up group hover:-translate-y-[3px] hover:shadow-lg hover:border-accent"
      style={{ animationDelay: `${index * 0.04}s` }}
      onClick={() => onPreview(image)}
    >
      {thumbSrc ? (
        <img 
          src={thumbSrc} 
          alt={image.description} 
          loading="lazy" 
          className="w-full h-[130px] object-cover block transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="bg-bg-tertiary min-h-[100px] w-full" />
      )}

      {/* Video Play Icon Overlay */}
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 flex items-center justify-center bg-black/60 backdrop-blur-[4px] rounded-full shadow-lg">
            <svg width="16" height="18" viewBox="0 0 16 18" fill="white">
              <path d="M15 9L1 17.66V0.34L15 9Z" />
            </svg>
          </div>
        </div>
      )}

      {/* Video Duration Badge */}
      {isVideo && image.duration > 0 && (
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/70 backdrop-blur-[4px] rounded text-[9px] text-white font-medium tracking-wide pointer-events-none">
          {formatDuration(image.duration)}
        </div>
      )}

      {/* Attribution Overlay */}
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/80 to-transparent text-[10px] text-[#bbb] opacity-0 transition-opacity duration-250 whitespace-nowrap overflow-hidden text-ellipsis group-hover:opacity-100">
        by{' '}
        <a
          href={image.userUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent no-underline hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {image.userName}
        </a>
      </div>
      
      {/* Preview/Eye Icon */}
      <div className="absolute top-1.5 right-1.5 w-[26px] h-[26px] flex items-center justify-center bg-black/65 backdrop-blur-[6px] rounded-full text-[11px] text-white opacity-0 transition-opacity duration-200 pointer-events-none group-hover:opacity-100 shadow-md">
        {isVideo ? '🎬' : '👁️'}
      </div>
    </div>
  );
}
