import React, { useState, useRef } from 'react';

export default function SearchBar({ onSearch, mode }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = () => {
    const q = value.trim();
    if (q) onSearch(q);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="flex items-center gap-2 bg-bg-secondary border border-border-subtle rounded-lg px-3 py-1 transition-all duration-150 focus-within:border-accent focus-within:shadow-[0_0_0_2px_rgba(74,158,255,0.25)]">
      <svg className="text-text-muted shrink-0" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        id="searchInput"
        placeholder={mode === 'pngs' ? 'Search transparent PNGs…' : 'Search photos…'}
        autoComplete="off"
        className="flex-1 py-1.5 px-1 border-none bg-transparent text-text-primary text-[13px] outline-none min-w-0 placeholder:text-text-muted"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
      />
      <button id="searchBtn" className="px-4 py-1.5 border-none rounded-md bg-accent-gradient text-white text-[11px] font-semibold cursor-pointer transition-all duration-150 hover:opacity-90 hover:-translate-y-px active:translate-y-0 active:opacity-80 whitespace-nowrap shrink-0" onClick={handleSubmit}>
        Search
      </button>
    </div>
  );
}
