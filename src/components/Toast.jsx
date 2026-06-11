import React from 'react';

export default function Toast({ toasts }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-8 left-3.5 right-3.5 flex flex-col gap-1.5 pointer-events-none z-[1000]">
      {toasts.map((toast) => (
        <div key={toast.id} className={`flex items-center gap-2 px-3.5 py-2.5 bg-bg-secondary border rounded-lg shadow-lg text-[11px] text-text-primary animate-toast-in pointer-events-auto ${toast.type === 'success' ? 'border-success' : toast.type === 'error' ? 'border-danger' : 'border-accent'}`}>
          <span className="text-[14px] shrink-0">
            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✗' : 'ℹ'}
          </span>
          <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
