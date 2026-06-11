// ══════════════════════════════════════════
//  CEP Context — provides environment info to all components
// ══════════════════════════════════════════

import React, { createContext, useContext, useMemo } from 'react';
import { detectEnvironment } from '../services/cep';

const CEPContext = createContext(null);

export function CEPProvider({ children }) {
  const env = useMemo(() => detectEnvironment(), []);

  return (
    <CEPContext.Provider value={env}>
      {children}
    </CEPContext.Provider>
  );
}

export function useCEP() {
  const ctx = useContext(CEPContext);
  if (!ctx) throw new Error('useCEP must be used within CEPProvider');
  return ctx;
}
