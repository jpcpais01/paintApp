'use client';

import { useEffect, useRef, useState } from 'react';

interface CanvasProps {
  imageUrl: string;
  onStateChange?: (state: string) => void;
}

type Tool = 'brush' | 'bucket';

export default function Canvas({ imageUrl, onStateChange }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [tolerance, setTolerance] = useState(30);
  const [currentTool, setCurrentTool] = useState<Tool>('brush');
  const [lastX, setLastX] = useState(0);
  const [lastY, setLastY] = useState(0);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const isFirstDraw = useRef(true);
  const drawTimeout = useRef<NodeJS.Timeout>();

  const saveCurrentState = () => {
    const canvas = canvasRef.current;
    if (!canvas || !onStateChange) {
      return; // Early return if either canvas or onStateChange is not available
    }

    // Clear any pending save
    if (drawTimeout.current) {
      clearTimeout(drawTimeout.current);
    }
    // Save the state after a short delay to avoid too frequent saves
    drawTimeout.current = setTimeout((_: any) => {
      if (canvasRef.current) {
        onStateChange(canvasRef.current.toDataURL());
      }
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (drawTimeout.current) {
        clearTimeout(drawTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Make canvas responsive
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    context.lineCap = 'round';
    context.strokeStyle = currentColor;
    context.lineWidth = brushSize;
    contextRef.current = context;

    // Load background image
    const image = new Image();
    image.src = imageUrl;
    image.onload = () => {
      // Clear the canvas first
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      // Scale image to fit canvas while maintaining aspect ratio
      const scale = Math.min(
        canvas.width / image.width,
        canvas.height / image.height
      );
      const x = (canvas.width - image.width * scale) / 2;
      const y = (canvas.height - image.height * scale) / 2;
      
      context.drawImage(
        image,
        x,
        y,
        image.width * scale,
        image.height * scale
      );

      // Only save initial state if this is the first load
      if (isFirstDraw.current) {
        isFirstDraw.current = false;
        saveCurrentState();
      }
    };
  }, [imageUrl]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e)
      ? e.touches[0].clientX - rect.left
      : e.clientX - rect.left;
    const y = ('touches' in e)
      ? e.touches[0].clientY - rect.top
      : e.clientY - rect.top;
    
    // Scale coordinates based on canvas size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return { 
      x: x * scaleX,
      y: y * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (currentTool === 'bucket') {
      const { x, y } = getCoordinates(e);
      floodFill(Math.round(x), Math.round(y));
      return;
    }

    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    setLastX(x);
    setLastY(y);

    const canvas = canvasRef.current;
    if (!canvas || !contextRef.current) return;

    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current || !canvasRef.current || currentTool === 'bucket') return;

    e.preventDefault();
    const { x, y } = getCoordinates(e);

    contextRef.current.globalCompositeOperation = 'source-over';
    contextRef.current.strokeStyle = currentColor;

    // For smoother lines, especially on mobile
    const dx = x - lastX;
    const dy = y - lastY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(Math.floor(distance / 2), 1);
    
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const cx = lastX + dx * t;
      const cy = lastY + dy * t;
      contextRef.current.lineTo(cx, cy);
      contextRef.current.stroke();
    }

    setLastX(x);
    setLastY(y);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      if (contextRef.current) {
        contextRef.current.closePath();
        saveCurrentState();
      }
    }
  };

  const floodFill = (startX: number, startY: number) => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // Get the color we're filling
    const startPos = (startY * canvas.width + startX) * 4;
    const startR = pixels[startPos];
    const startG = pixels[startPos + 1];
    const startB = pixels[startPos + 2];
    const startA = pixels[startPos + 3];

    // Convert current color from hex to rgba
    const fillColor = {
      r: parseInt(currentColor.slice(1, 3), 16),
      g: parseInt(currentColor.slice(3, 5), 16),
      b: parseInt(currentColor.slice(5, 7), 16),
      a: 255
    };

    function matchesStartColor(pos: number) {
      return (
        Math.abs(pixels[pos] - startR) <= tolerance &&
        Math.abs(pixels[pos + 1] - startG) <= tolerance &&
        Math.abs(pixels[pos + 2] - startB) <= tolerance &&
        Math.abs(pixels[pos + 3] - startA) <= tolerance
      );
    }

    function colorPixel(pos: number) {
      pixels[pos] = fillColor.r;
      pixels[pos + 1] = fillColor.g;
      pixels[pos + 2] = fillColor.b;
      pixels[pos + 3] = fillColor.a;
    }

    const pixelsToCheck = [startPos];
    while (pixelsToCheck.length > 0) {
      const currentPos = pixelsToCheck.pop()!;
      if (!matchesStartColor(currentPos)) continue;

      const currentX = (currentPos / 4) % canvas.width;
      const currentY = Math.floor((currentPos / 4) / canvas.width);

      colorPixel(currentPos);

      // Check neighboring pixels
      if (currentX > 0) { // left
        const pos = currentPos - 4;
        if (matchesStartColor(pos)) pixelsToCheck.push(pos);
      }
      if (currentX < canvas.width - 1) { // right
        const pos = currentPos + 4;
        if (matchesStartColor(pos)) pixelsToCheck.push(pos);
      }
      if (currentY > 0) { // up
        const pos = currentPos - canvas.width * 4;
        if (matchesStartColor(pos)) pixelsToCheck.push(pos);
      }
      if (currentY < canvas.height - 1) { // down
        const pos = currentPos + canvas.width * 4;
        if (matchesStartColor(pos)) pixelsToCheck.push(pos);
      }
    }

    ctx.putImageData(imageData, 0, 0);
    saveCurrentState();
  };

  return (
    <div className="relative w-full h-[calc(100vh-11rem)] sm:h-[calc(100vh-13rem)] bg-white/90 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden">
      {/* Tools panel - sticky on mobile, floating on desktop */}
      <div className="fixed bottom-0 left-0 right-0 sm:absolute sm:bottom-auto sm:right-auto sm:top-2 sm:left-2 flex flex-col sm:flex-row items-center sm:items-start gap-2 p-2 bg-[#1e293b]/95 sm:bg-[#1e293b]/80 shadow-2xl sm:shadow-xl backdrop-blur-md sm:rounded-xl border-t sm:border border-white/10 z-50">
        <div className="flex w-full sm:w-auto items-center sm:items-start gap-3 sm:flex-col">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={currentColor}
              onChange={(e) => {
                setCurrentColor(e.target.value);
                if (contextRef.current) {
                  contextRef.current.strokeStyle = e.target.value;
                }
              }}
              className="w-8 h-8 cursor-pointer rounded-lg bg-transparent"
            />
            <div className="flex sm:hidden gap-1.5">
              <button
                onClick={() => setCurrentTool('brush')}
                className={`p-2 rounded-lg transition-all ${
                  currentTool === 'brush' 
                    ? 'bg-violet-500/90 text-white shadow-lg shadow-violet-500/20' 
                    : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white border border-white/10 hover:border-white/20'
                }`}
                title="Brush Tool"
              >
                🖌️
              </button>
              <button
                onClick={() => setCurrentTool('bucket')}
                className={`p-2 rounded-lg transition-all ${
                  currentTool === 'bucket' 
                    ? 'bg-violet-500/90 text-white shadow-lg shadow-violet-500/20' 
                    : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white border border-white/10 hover:border-white/20'
                }`}
                title="Fill Tool"
              >
                🪣
              </button>
            </div>
          </div>
          <div className="flex-1 min-w-0 sm:min-w-[120px]">
            <label className="text-xs text-white/60 hidden sm:block mb-1">
              {currentTool === 'bucket' ? 'Tolerance' : 'Size'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={currentTool === 'bucket' ? 1 : 1}
                max={currentTool === 'bucket' ? 100 : 50}
                value={currentTool === 'bucket' ? tolerance : brushSize}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (currentTool === 'bucket') {
                    setTolerance(value);
                  } else {
                    setBrushSize(value);
                    if (contextRef.current) {
                      contextRef.current.lineWidth = value;
                    }
                  }
                }}
                className="w-full max-w-[200px] sm:max-w-none sm:w-32 accent-violet-500"
              />
              <span className="text-xs text-white/60 min-w-[2rem] sm:min-w-0">
                {currentTool === 'bucket' ? `${tolerance}%` : brushSize}
              </span>
            </div>
          </div>
        </div>
        <div className="hidden sm:flex flex-col gap-1.5">
          <button
            onClick={() => setCurrentTool('brush')}
            className={`p-2 rounded-lg transition-all ${
              currentTool === 'brush' 
                ? 'bg-violet-500/90 text-white shadow-lg shadow-violet-500/20' 
                : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white border border-white/10 hover:border-white/20'
            }`}
            title="Brush Tool"
          >
            🖌️
          </button>
          <button
            onClick={() => setCurrentTool('bucket')}
            className={`p-2 rounded-lg transition-all ${
              currentTool === 'bucket' 
                ? 'bg-violet-500/90 text-white shadow-lg shadow-violet-500/20' 
                : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white border border-white/10 hover:border-white/20'
            }`}
            title="Fill Tool"
          >
            🪣
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="touch-none w-full h-full"
      />
    </div>
  );
}
