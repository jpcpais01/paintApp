'use client';

import { useState, useCallback } from 'react';
import Canvas from '@/components/Canvas';

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const [currentTool, setCurrentTool] = useState<string>('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newImage = e.target?.result as string;
        setSelectedImage(newImage);
        setHistory([newImage]);
        setCurrentHistoryIndex(0);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNewImage = () => {
    setSelectedImage('');
    setHistory([]);
    setCurrentHistoryIndex(-1);
  };

  const handleSaveState = useCallback((canvasState: string) => {
    setHistory(prevHistory => {
      const newHistory = prevHistory.slice(0, currentHistoryIndex + 1);
      return [...newHistory, canvasState];
    });
    setCurrentHistoryIndex(prevIndex => prevIndex + 1);
  }, [currentHistoryIndex]);

  const handleUndo = useCallback(() => {
    if (currentHistoryIndex > 0) {
      setCurrentHistoryIndex(prevIndex => prevIndex - 1);
      setSelectedImage(history[currentHistoryIndex - 1]);
    }
  }, [currentHistoryIndex, history]);

  const handleRedo = useCallback(() => {
    if (currentHistoryIndex < history.length - 1) {
      setCurrentHistoryIndex(prevIndex => prevIndex + 1);
      setSelectedImage(history[currentHistoryIndex + 1]);
    }
  }, [currentHistoryIndex, history]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = 'colored-image.png';
    link.href = selectedImage;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
      <header className="bg-[#1e293b]/70 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-6xl mx-auto px-2 py-3 sm:px-4 sm:py-4">
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-violet-200 to-pink-200 text-transparent bg-clip-text">
              Our Coloring Corner ❤️
            </h1>
            <div className="w-full max-w-2xl flex justify-center gap-[2%]">
              {selectedImage ? (
                <>
                  <button
                    onClick={handleUndo}
                    disabled={currentHistoryIndex <= 0}
                    className="w-[22%] px-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs sm:text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap overflow-hidden text-ellipsis text-white/80 hover:text-white hover:border-white/20 disabled:hover:border-white/10 disabled:hover:bg-white/5 disabled:hover:text-white/80"
                    title="Undo"
                  >
                    ↩️ Undo
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={currentHistoryIndex >= history.length - 1}
                    className="w-[22%] px-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs sm:text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap overflow-hidden text-ellipsis text-white/80 hover:text-white hover:border-white/20 disabled:hover:border-white/10 disabled:hover:bg-white/5 disabled:hover:text-white/80"
                    title="Redo"
                  >
                    ↪️ Redo
                  </button>
                  <button
                    onClick={handleDownload}
                    className="w-[26%] px-1 py-2 bg-gradient-to-r from-emerald-500/90 to-teal-500/90 hover:from-emerald-500 hover:to-teal-500 rounded-lg text-xs sm:text-sm transition-all whitespace-nowrap overflow-hidden text-ellipsis text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 font-medium"
                  >
                    Download
                  </button>
                  <button
                    onClick={handleNewImage}
                    className="w-[26%] px-1 py-2 bg-gradient-to-r from-violet-500/90 to-purple-500/90 hover:from-violet-500 hover:to-purple-500 rounded-lg text-xs sm:text-sm transition-all whitespace-nowrap overflow-hidden text-ellipsis text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 font-medium"
                  >
                    New Image
                  </button>
                </>
              ) : (
                <label 
                  htmlFor="image-upload"
                  className="w-[40%] cursor-pointer bg-gradient-to-r from-violet-500/90 to-purple-500/90 hover:from-violet-500 hover:to-purple-500 px-4 py-2 rounded-lg text-xs sm:text-sm transition-all text-center whitespace-nowrap overflow-hidden text-ellipsis text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 font-medium"
                >
                  Upload Image
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1 p-3 sm:p-4 overflow-hidden">
        <div className="h-full max-w-6xl mx-auto">
          {!selectedImage ? (
            <div className="flex flex-col items-center justify-center p-8 bg-[#1e293b]/50 backdrop-blur-sm rounded-2xl shadow-2xl shadow-black/20 border border-white/5 h-[calc(100vh-7rem)] sm:h-[calc(100vh-8rem)]">
              <div className="mb-8">
                <img 
                  src="/coloring-illustration.svg" 
                  alt="Upload illustration" 
                  className="w-32 sm:w-40 h-32 sm:h-40 opacity-30 transition-all hover:opacity-40"
                />
              </div>
              <p className="text-lg text-white/70 mb-3 text-center font-medium">Upload a coloring page to get started</p>
              <p className="text-sm text-white/40 text-center">Supported formats: PNG, JPG, JPEG</p>
            </div>
          ) : (
            <div className="bg-[#1e293b]/50 backdrop-blur-sm rounded-2xl shadow-2xl shadow-black/20 border border-white/5 h-full overflow-hidden">
              <div className="bg-[#1e293b]/50 border-b border-white/5 px-3 py-2 rounded-t-2xl flex justify-center gap-3 items-center backdrop-blur-sm">
                <div className="text-xs text-white/40">
                  {currentTool === 'bucket' ? 'Adjust tolerance to control fill spread' : ''}
                </div>
              </div>
              <div className="p-3">
                <Canvas 
                  imageUrl={selectedImage} 
                  onStateChange={handleSaveState}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
