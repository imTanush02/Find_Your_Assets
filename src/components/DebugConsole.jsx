import React, { useState, useCallback, useRef, useEffect } from 'react';

export default function DebugConsole() {
  const [logs, setLogs] = useState([]);
  const [open, setOpen] = useState(false);
  const logRef = useRef(null);

  // Expose global _log function for legacy compatibility
  useEffect(() => {
    window._log = (msg) => {
      setLogs((prev) => [...prev, msg]);
      console.log(msg);
    };
    window.onerror = (msg, url, line) => {
      window._log(`❌ ERROR: ${msg} (line ${line})`);
    };
    window._log('✅ React app mounted');

    return () => {
      delete window._log;
    };
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (logRef.current && open) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs, open]);

  return (
    <div className="relative left-0 right-0 z-[9999] shrink-0">
      <button className="block w-full px-2.5 py-[3px] bg-[#111] border-none border-t border-[#333] text-[#888] font-mono text-[10px] cursor-pointer text-left hover:text-[#aaa] hover:bg-[#1a1a1a]" onClick={() => setOpen(!open)}>
        {open ? '▼' : '▲'} Console ({logs.length})
      </button>
      {open && (
        <div className="max-h-[100px] overflow-y-auto bg-[#1a1a1a] px-2.5 py-1.5 font-mono text-[10px] text-[#0f0]" ref={logRef}>
          {logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
      )}
    </div>
  );
}
