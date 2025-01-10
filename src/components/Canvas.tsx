'use client';

import { useEffect, useRef, useState } from 'react';

interface CanvasProps {
  imageUrl: string;
  onStateChange?: (state: string) => void;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
}

type Tool = 'brush' | 'bucket';

export default function Canvas({ imageUrl, onStateChange, onHistoryChange }: CanvasProps) {
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
  const historyStates = useRef<ImageData[]>([]);
  const currentStateIndex = useRef<number>(-1);

  const saveState = () => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    if (isFirstDraw.current) {
      isFirstDraw.current = false;
      return;
    }

    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Check if the new state is different from the last state
    const lastState = historyStates.current[currentStateIndex.current];
    if (lastState) {
      const isEqual = currentState.data.every((val, i) => val === lastState.data[i]);
      if (isEqual) return;
    }

    if (currentStateIndex.current < historyStates.current.length - 1) {
      historyStates.current = historyStates.current.slice(0, currentStateIndex.current + 1);
    }

    historyStates.current.push(currentState);
    currentStateIndex.current++;

    const maxStates = 50;
    if (historyStates.current.length > maxStates) {
      historyStates.current = historyStates.current.slice(-maxStates);
      currentStateIndex.current = historyStates.current.length - 1;
    }

    onHistoryChange?.(currentStateIndex.current > 0, false);
    
    // Only update parent state, no visual changes needed
    if (onStateChange && canvas) {
      onStateChange(canvas.toDataURL());
    }
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx || currentStateIndex.current <= 0) return;

    currentStateIndex.current--;
    const previousState = historyStates.current[currentStateIndex.current];
    ctx.putImageData(previousState, 0, 0);

    onHistoryChange?.(currentStateIndex.current > 0, true);
    if (onStateChange) {
      onStateChange(canvas.toDataURL());
    }
  };

  const handleRedo = () => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx || currentStateIndex.current >= historyStates.current.length - 1) return;

    currentStateIndex.current++;
    const nextState = historyStates.current[currentStateIndex.current];
    ctx.putImageData(nextState, 0, 0);

    onHistoryChange?.(true, currentStateIndex.current < historyStates.current.length - 1);
    if (onStateChange) {
      onStateChange(canvas.toDataURL());
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    // Scale coordinates
    x = (x * canvas.width) / rect.width;
    y = (y * canvas.height) / rect.height;

    return { x, y };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);

    if (currentTool === 'bucket') {
      floodFill(Math.round(x), Math.round(y));
      return;
    }

    setIsDrawing(true);
    setLastX(x);
    setLastY(y);

    if (contextRef.current) {
      contextRef.current.beginPath();
      contextRef.current.moveTo(x, y);
      contextRef.current.lineTo(x, y);
      contextRef.current.stroke();
      contextRef.current.closePath();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || currentTool !== 'brush' || !contextRef.current) return;

    const { x, y } = getCoordinates(e);

    // For smoother lines
    const dx = x - lastX;
    const dy = y - lastY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(Math.floor(dist / 2), 1);

    contextRef.current.beginPath();
    contextRef.current.moveTo(lastX, lastY);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const cx = lastX + dx * t;
      const cy = lastY + dy * t;
      contextRef.current.lineTo(cx, cy);
    }
    
    contextRef.current.stroke();
    contextRef.current.closePath();

    setLastX(x);
    setLastY(y);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (contextRef.current) {
      contextRef.current.closePath();
    }
    saveState();
  };

  const floodFill = (startX: number, startY: number) => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    // Create a temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Copy current canvas state to temp canvas
    tempCtx.drawImage(canvas, 0, 0);

    const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    const startPos = (startY * canvas.width + startX) * 4;
    const startR = pixels[startPos];
    const startG = pixels[startPos + 1];
    const startB = pixels[startPos + 2];

    const fillR = parseInt(currentColor.slice(1, 3), 16);
    const fillG = parseInt(currentColor.slice(3, 5), 16);
    const fillB = parseInt(currentColor.slice(5, 7), 16);

    if (
      startR === fillR &&
      startG === fillG &&
      startB === fillB
    ) {
      return;
    }

    const visited = new Uint8Array(canvas.width * canvas.height);
    const stack: [number, number][] = [[startX, startY]];

    while (stack.length) {
      const [x, y] = stack.pop()!;
      const pos = (y * canvas.width + x) * 4;
      const visitedPos = y * canvas.width + x;

      if (
        x < 0 || x >= canvas.width ||
        y < 0 || y >= canvas.height ||
        visited[visitedPos] === 1 ||
        pixels[pos + 3] === 0 ||
        pixels[pos] === fillR && pixels[pos + 1] === fillG && pixels[pos + 2] === fillB
      ) {
        continue;
      }

      visited[visitedPos] = 1;

      const r = pixels[pos];
      const g = pixels[pos + 1];
      const b = pixels[pos + 2];

      if (
        Math.abs(r - startR) <= tolerance &&
        Math.abs(g - startG) <= tolerance &&
        Math.abs(b - startB) <= tolerance
      ) {
        pixels[pos] = fillR;
        pixels[pos + 1] = fillG;
        pixels[pos + 2] = fillB;

        stack.push([x + 1, y], [x, y + 1], [x - 1, y], [x, y - 1]);
      }
    }

    // Update temp canvas with fill result
    tempCtx.putImageData(imageData, 0, 0);
    
    // Draw temp canvas to main canvas in one operation
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tempCanvas, 0, 0);
    
    // Clean up
    tempCanvas.remove();
    saveState();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRedo, handleUndo]);

  useEffect(() => {
    if (!contextRef.current) return;
    contextRef.current.strokeStyle = currentColor;
    contextRef.current.lineWidth = brushSize;
    saveState();
  }, [brushSize, currentColor, saveState]);

  useEffect(() => {
    window.handleUndo = handleUndo;
    window.handleRedo = handleRedo;

    return () => {
      window.handleUndo = undefined;
      window.handleRedo = undefined;
    };
  }, [onHistoryChange, handleRedo, handleUndo]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = currentColor;
    contextRef.current = ctx;

    if (imageUrl) {
      const img = new Image();
      img.onload = () => {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Calculate dimensions to maintain aspect ratio
        const scale = Math.min(
          canvas.width / img.width,
          canvas.height / img.height
        );
        const x = (canvas.width - img.width * scale) / 2;
        const y = (canvas.height - img.height * scale) / 2;
        
        ctx.drawImage(
          img,
          x,
          y,
          img.width * scale,
          img.height * scale
        );
        saveState();
      };
      img.src = imageUrl;
    }
  }, [imageUrl, brushSize, currentColor]);

  return (
    <div className="relative w-full h-[calc(100vh-11rem)] sm:h-[calc(100vh-13rem)] bg-white/90 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden">
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
