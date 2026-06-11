// ══════════════════════════════════════════
//  useToast Hook — manages toast notifications
// ══════════════════════════════════════════

import { useState, useCallback, useRef } from 'react';

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const addToast = useCallback((type, message, duration = 3000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);

    timersRef.current[id] = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      delete timersRef.current[id];
    }, duration);

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}
