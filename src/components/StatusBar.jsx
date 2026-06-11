import React from 'react';
import { useCEP } from '../context/CEPContext';

export default function StatusBar({ total, loading, error }) {
  const { isCEP } = useCEP();

  let text = isCEP ? 'Ready — search & import' : 'Ready — browser mode';

  if (loading) {
    text = 'Searching…';
  } else if (error) {
    text = 'Error';
  } else if (total > 0) {
    text = `${total.toLocaleString()} results`;
  }

  return (
    <div className="flex items-center px-3.5 py-1.5 text-[10px] text-text-muted bg-bg-secondary border-t border-border-subtle shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5 shrink-0 animate-pulse-dot"></span>
      <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{text}</span>
    </div>
  );
}
