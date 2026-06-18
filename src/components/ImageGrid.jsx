import React from 'react';
import ImageCard from './ImageCard';

export default function ImageGrid({ results, loading, page, totalPages, onLoadMore, onToast, onPreview }) {
  if (loading && results.length === 0) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5">
        <div className="flex justify-center items-center py-10 col-span-full">
          <div className="w-7 h-7 border-2 border-accent/15 border-t-accent rounded-full animate-spin-slow"></div>
        </div>
      </div>
    );
  }

  if (!loading && results.length === 0) {
    return null;
  }

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5">
        {results.map((img, i) => (
          <ImageCard
            key={`${img.id}-${i}`}
            image={img}
            onToast={onToast}
            onPreview={onPreview}
            index={i}
          />
        ))}
      </div>
      {page < totalPages && (
        <button
          className="flex items-center justify-center w-full mt-3.5 px-5 py-2.5 bg-accent-gradient border-none rounded-md text-white text-[12px] font-medium cursor-pointer transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:translate-y-0 active:opacity-80 hover:-translate-y-px"
          onClick={onLoadMore}
          disabled={loading}
        >
          {loading ? 'Loading…' : 'Load More'}
        </button>
      )}
    </>
  );
}

