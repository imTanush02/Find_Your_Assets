import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  // Initialize with the user's provided key if not set, otherwise load from localStorage
  const [removeBgApiKey, setRemoveBgApiKey] = useState(() => {
    const saved = localStorage.getItem('removeBgApiKey');
    if (saved !== null) return saved;
    // Default to the key provided by the user for convenience
    return 'XFi6uo7w8S68kbS1Q1d6byyw'; 
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
