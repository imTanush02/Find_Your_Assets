import React, { useState, useCallback, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import { removeBgLocalAndImport } from '../services/importer';
import { useToast } from '../hooks/useToast';

export default function LocalRemoveBgModal({ addToast }) {
  const { removeBgApiKey, setIsSettingsOpen, isLocalRemoveBgOpen, setIsLocalRemoveBgOpen } = useSettings();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleProcessFile = async (filePath) => {
    if (!removeBgApiKey) {
      addToast('error', 'Please set your Remove.bg API key in Settings first.');
      setIsLocalRemoveBgOpen(false);
      setIsSettingsOpen(true);
      return;
    }

    addToast('info', 'Removing background... please wait.');
    setIsLocalRemoveBgOpen(false); // close modal while processing
    try {
      const result = await removeBgLocalAndImport(filePath, removeBgApiKey);
      addToast('success', `BG Removed: ${result.fileName}`);
    } catch (err) {
      addToast('error', `Remove BG failed: ${err.message}`);
    }
  };

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer?.files?.[0];
    if (file && file.path) {
      handleProcessFile(file.path);
    } else {
      addToast('error', 'Only local files are supported.');
    }
  }, [addToast, removeBgApiKey, setIsLocalRemoveBgOpen, setIsSettingsOpen]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && file.path) {
      handleProcessFile(file.path);
    }
    // reset input
    e.target.value = '';
  };

  if (!isLocalRemoveBgOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
      <div className="bg-bg-secondary border border-border-subtle rounded-lg shadow-xl w-full max-w-sm flex flex-col overflow-hidden animate-fade-up">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-bg-tertiary">
          <h2 className="text-text-primary text-[14px] font-semibold flex items-center gap-2">
            <span>✂️</span> Local Remove BG
          </h2>
          <button 
            onClick={() => setIsLocalRemoveBgOpen(false)}
            className="text-text-muted hover:text-text-primary p-1 leading-none text-lg"
          >
            &times;
          </button>
        </div>

        {/* Body (Dropzone) */}
        <div className="p-4">
          <div 
            className={`border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-colors ${isDragging ? 'border-accent bg-accent/10' : 'border-border-subtle hover:border-text-muted'}`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-4xl mb-3 opacity-80">📥</div>
            <p className="text-[13px] font-medium text-text-primary mb-1">Click or drag image here</p>
            <p className="text-[11px] text-text-muted">JPG or PNG. Auto imports into project.</p>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/png, image/jpeg, image/webp" 
            onChange={handleFileChange} 
          />
        </div>
      </div>
    </div>
  );
}
