'use client';

import { useState, useCallback, useRef } from 'react';
import Canvas from '@/components/Canvas';
import { PaintBrushIcon } from '@heroicons/react/24/outline';

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [currentTool] = useState<'brush' | 'bucket'>('brush');
  const downloadRef = useRef<string>(selectedImage);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newImage = e.target?.result as string;
        setSelectedImage(newImage);
        downloadRef.current = newImage;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNewImage = () => {
    setSelectedImage('');
    downloadRef.current = '';
    setCanUndo(false);
    setCanRedo(false);
  };

  const handleHistoryChange = useCallback((canUndo: boolean, canRedo: boolean) => {
    setCanUndo(canUndo);
    setCanRedo(canRedo);
  }, []);

  const handleStateChange = useCallback((newState: string) => {
    downloadRef.current = newState;
  }, []);

  const handleUndo = useCallback(() => {
    if (window.handleUndo) {
      window.handleUndo();
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (window.handleRedo) {
      window.handleRedo();
    }
  }, []);

  const handleDownload = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'my-coloring-page.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 'image/png');
  };

  return (
    <div className="min-h-screen h-screen flex flex-col bg-[#0f172a] overflow-hidden">
      <header className="bg-[#1e293b]/70 backdrop-blur-lg border-b border-white/5 flex-shrink-0">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-200 to-pink-200 text-transparent bg-clip-text">
              Our Coloring Corner ❤️
            </h1>
            {selectedImage && (
              <div className="w-full max-w-2xl flex justify-center gap-2">
                <button
                  onClick={handleUndo}
                  disabled={!canUndo}
                  className="w-[22%] px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed text-white/80 hover:text-white hover:border-white/20 disabled:hover:border-white/10 disabled:hover:bg-white/5 disabled:hover:text-white/80"
                  title="Undo"
                >
                  ↩️ Undo
                </button>
                <button
                  onClick={handleRedo}
                  disabled={!canRedo}
                  className="w-[22%] px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed text-white/80 hover:text-white hover:border-white/20 disabled:hover:border-white/10 disabled:hover:bg-white/5 disabled:hover:text-white/80"
                  title="Redo"
                >
                  ↪️ Redo
                </button>
                <button
                  onClick={handleDownload}
                  className="w-[26%] px-3 py-2 bg-gradient-to-r from-emerald-500/90 to-teal-500/90 hover:from-emerald-500 hover:to-teal-500 rounded-lg text-sm transition-all text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 font-medium"
                >
                  Download
                </button>
                <button
                  onClick={handleNewImage}
                  className="w-[26%] px-3 py-2 bg-gradient-to-r from-violet-500/90 to-purple-500/90 hover:from-violet-500 hover:to-purple-500 rounded-lg text-sm transition-all text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 font-medium"
                >
                  New Image
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <main className="flex-1 p-4 overflow-hidden">
        <div className="h-full max-w-6xl mx-auto">
          {!selectedImage ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-full max-w-md p-8 bg-[#1e293b]/50 backdrop-blur-sm rounded-2xl shadow-2xl shadow-black/20 border border-white/5 text-center">
                <div className="mb-6 relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-xl blur-xl transition-all duration-500 group-hover:blur-2xl"></div>
                  <PaintBrushIcon className="relative w-32 h-32 mx-auto text-white/80 transition-all duration-500 group-hover:text-white group-hover:scale-105" />
                </div>
                <h2 className="text-xl font-semibold text-white/90 mb-3">Colors for Mi and Mu</h2>
                <p className="text-white/60 mb-6">Tiny us, tiny colors!</p>
                <label 
                  htmlFor="image-upload-main"
                  className="inline-flex items-center gap-2 cursor-pointer bg-gradient-to-r from-violet-500/90 to-purple-500/90 hover:from-violet-500 hover:to-purple-500 px-6 py-3 rounded-xl text-sm transition-all text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 font-medium"
                >
                  <span className="text-lg">🎨</span>
                  Choose an Image
                  <input
                    id="image-upload-main"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                <div className="mt-4 text-xs text-white/40">Supported formats: PNG, JPG, JPEG</div>
              </div>
            </div>
          ) : (
            <div className="h-full bg-[#1e293b]/50 backdrop-blur-sm rounded-2xl shadow-2xl shadow-black/20 border border-white/5 overflow-hidden">
              <div className="bg-[#1e293b]/50 border-b border-white/5 px-3 py-2 rounded-t-2xl flex justify-center gap-3 items-center backdrop-blur-sm">
                <div className="text-xs text-white/40">
                  {currentTool === 'bucket' ? 'Adjust tolerance to control fill spread' : ''}
                </div>
              </div>
              <div className="p-3 h-[calc(100%-44px)]">
                <Canvas 
                  imageUrl={selectedImage} 
                  onStateChange={handleStateChange}
                  onHistoryChange={handleHistoryChange}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
