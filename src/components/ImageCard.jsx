import React, { useState, useEffect } from 'react';
import { useCEP } from '../context/CEPContext';
import { loadImageAsDataUri } from '../services/importer';

export default function ImageCard({ image, mode, onPreview, index }) {
  const { isCEP } = useCEP();
  const [thumbSrc, setThumbSrc] = useState(null);

  // For Pixabay images in CEP, load thumbnails via Node.js (hotlink workaround)
  useEffect(() => {
    if (isCEP && mode === 'pngs' && image.source === 'pixabay') {
      loadImageAsDataUri(image.thumbUrl)
        .then((dataUri) => setThumbSrc(dataUri))
        .catch(() => setThumbSrc(null));
    } else {
      setThumbSrc(image.thumbUrl);
    }
  }, [image.thumbUrl, isCEP, mode, image.source]);

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
      
      {/* Overlay Icon to indicate clickability */}
      <div className="absolute top-1.5 right-1.5 w-[26px] h-[26px] flex items-center justify-center bg-black/65 backdrop-blur-[6px] rounded-full text-[11px] text-white opacity-0 transition-opacity duration-200 pointer-events-none group-hover:opacity-100 shadow-md">
        👁️
      </div>
    </div>
  );
}
