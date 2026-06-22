import React, { useState, useCallback, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import { removeVideoBgLocalAndImport } from '../services/importer';
import { useToast } from '../hooks/useToast';

export default function LocalVideoBgModal({ addToast }) {
  const { isLocalVideoBgOpen, setIsLocalVideoBgOpen } = useSettings();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleProcessFile = async (filePath) => {
    setIsProcessing(true);
    setProgress(0);
    addToast('info', 'Starting video processing... this may take a while.');
    
    try {
      const result = await removeVideoBgLocalAndImport(filePath, (val) => {
        setProgress(val);
      });
      addToast('success', `Video BG Removed: ${result.fileName}`);
      setIsLocalVideoBgOpen(false); // close after success
    } catch (err) {
      addToast('error', `Remove Video BG failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
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

    if (isProcessing) return;

    const file = e.dataTransfer?.files?.[0];
    if (file && file.path) {
      if (!file.type.startsWith('video/')) {
        addToast('error', 'Please drop a valid video file.');
        return;
      }
      handleProcessFile(file.path);
    } else {
      addToast('error', 'Only local files are supported.');
    }
  }, [addToast, isProcessing]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && file.path) {
      handleProcessFile(file.path);
    }
    // reset input
    e.target.value = '';
  };

  if (!isLocalVideoBgOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
      <div className="bg-bg-secondary border border-border-subtle rounded-lg shadow-xl w-full max-w-sm flex flex-col overflow-hidden animate-fade-up">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-bg-tertiary">
          <h2 className="text-text-primary text-[14px] font-semibold flex items-center gap-2">
            <span>🎬</span> Local Video BG
          </h2>
          {!isProcessing && (
            <button 
              onClick={() => setIsLocalVideoBgOpen(false)}
              className="text-text-muted hover:text-text-primary p-1 leading-none text-lg"
            >
              &times;
            </button>
          )}
        </div>

        {/* Body (Dropzone) */}
        <div className="p-4">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="w-12 h-12 border-4 border-border-subtle border-t-accent rounded-full animate-spin mb-4"></div>
              <p className="text-[13px] font-medium text-text-primary mb-2">Processing Video...</p>
              <div className="w-full bg-bg-tertiary h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-accent h-full transition-all duration-300 ease-out" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[11px] text-text-muted mt-2">{progress.toFixed(1)}%</p>
              <p className="text-[10px] text-text-muted mt-1 italic">This requires Python, PyTorch, and FFmpeg.</p>
            </div>
          ) : (
            <div 
              className={`border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-colors ${isDragging ? 'border-accent bg-accent/10' : 'border-border-subtle hover:border-text-muted'}`}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-4xl mb-3 opacity-80">🎥</div>
              <p className="text-[13px] font-medium text-text-primary mb-1">Click or drag video here</p>
              <p className="text-[11px] text-text-muted">MP4 or MOV. Processed locally via RVM.</p>
            </div>
          )}

          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="video/*" 
            onChange={handleFileChange} 
            disabled={isProcessing}
          />
        </div>
      </div>
    </div>
  );
}
