import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  // Initialize from localStorage, fallback to env var
  const [removeBgApiKey, setRemoveBgApiKey] = useState(() => {
    const saved = localStorage.getItem('removeBgApiKey');
    if (saved !== null) return saved;
    return import.meta.env.VITE_REMOVEBG_API_KEY || ''; 
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLocalRemoveBgOpen, setIsLocalRemoveBgOpen] = useState(false);
  const [isPinterestOpen, setIsPinterestOpen] = useState(false);
  const [isYouTubeOpen, setIsYouTubeOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('removeBgApiKey', removeBgApiKey);
  }, [removeBgApiKey]);

  return (
    <SettingsContext.Provider
      value={{
        removeBgApiKey,
        setRemoveBgApiKey,
        isSettingsOpen,
        setIsSettingsOpen,
        isLocalRemoveBgOpen,
        setIsLocalRemoveBgOpen,
        isPinterestOpen,
        setIsPinterestOpen,
        isYouTubeOpen,
        setIsYouTubeOpen,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
