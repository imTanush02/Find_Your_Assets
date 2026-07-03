import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  // Initialize from localStorage, fallback to env var
  const [removeBgApiKey, setRemoveBgApiKey] = useState(() => {
    const saved = localStorage.getItem('removeBgApiKey');
    if (saved !== null) return saved;
    return import.meta.env.VITE_REMOVEBG_API_KEY || ''; 
  });

  const [replicateApiKey, setReplicateApiKey] = useState(() => {
    const saved = localStorage.getItem('replicateApiKey');
    if (saved !== null) return saved;
    return import.meta.env.VITE_REPLICATE_API_KEY || '';
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLocalRemoveBgOpen, setIsLocalRemoveBgOpen] = useState(false);
  const [isLocalVideoBgOpen, setIsLocalVideoBgOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('removeBgApiKey', removeBgApiKey);
  }, [removeBgApiKey]);

  useEffect(() => {
    localStorage.setItem('replicateApiKey', replicateApiKey);
  }, [replicateApiKey]);

  return (
    <SettingsContext.Provider
      value={{
        removeBgApiKey,
        setRemoveBgApiKey,
        replicateApiKey,
        setReplicateApiKey,
        isSettingsOpen,
        setIsSettingsOpen,
        isLocalRemoveBgOpen,
        setIsLocalRemoveBgOpen,
        isLocalVideoBgOpen,
        setIsLocalVideoBgOpen,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
