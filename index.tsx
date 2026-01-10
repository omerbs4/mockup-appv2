import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Upload, Image as ImageIcon, Palette, Smartphone, Trash2, Monitor, Info, ZoomIn, ZoomOut, RotateCcw, Maximize, Download, Type, X, Move, GripHorizontal } from 'lucide-react';
import html2canvas from 'html2canvas';

interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  align: 'left' | 'center' | 'right';
}

const EXPORT_SIZES = {
  original: { label: 'Transparent (Phone Only)', width: 1080, height: 2340 },
  phone: { label: 'Phone (1080x1920)', width: 1080, height: 1920 },
  tablet7: { label: 'Tablet 7" (1200x1920)', width: 1200, height: 1920 },
  tablet10: { label: 'Tablet 10" (1600x2560)', width: 1600, height: 2560 },
} as const; // Define as const for better type inference

const App = () => {
  const [screenImage, setScreenImage] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState<string>('#e2e8f0');
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');
  const [imageZoom, setImageZoom] = useState<number>(1); // Zoom for the image inside the phone
  const [phoneZoom, setPhoneZoom] = useState<number>(1); // Zoom for the phone itself (relative to artboard now)
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [exportTarget, setExportTarget] = useState<keyof typeof EXPORT_SIZES>('phone');

  // Phone Position State
  const [phonePos, setPhonePos] = useState<{ x: number, y: number } | null>(null); // Null means centered default initially

  // Text State
  const [texts, setTexts] = useState<TextElement[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  // View State
  const [viewScale, setViewScale] = useState<number>(0.4);
  const [guides, setGuides] = useState<{ x: boolean, y: boolean }>({ x: false, y: false });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const dragItem = useRef<{
    type: 'text' | 'phone';
    id?: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  const currentSize = EXPORT_SIZES[exportTarget];

  // Initialize phone position when size changes if not set
  useEffect(() => {
    // Force reset to center when target changes to ensure correct alignment
    setPhonePos({ x: currentSize.width / 2, y: currentSize.height / 2 });
  }, [exportTarget]); // Depend specifically on exportTarget changing

  // Text Handlers
  const addText = (type: 'heading' | 'body') => {
    const newText: TextElement = {
      id: Date.now().toString(),
      text: type === 'heading' ? 'Heading Text' : 'Body Text',
      x: currentSize.width / 2,
      y: currentSize.height / 2,
      color: type === 'heading' ? '#1e293b' : '#64748b',
      fontSize: type === 'heading' ? 80 : 40,
      fontWeight: type === 'heading' ? 'bold' : 'normal',
      align: 'center',
    };
    setTexts([...texts, newText]);
    setSelectedTextId(newText.id);
  };

  const updateText = (id: string, updates: Partial<TextElement>) => {
    setTexts(texts.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteText = (id: string) => {
    setTexts(texts.filter(t => t.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  const handleTextDragStart = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedTextId(id);
    const text = texts.find(t => t.id === id);
    if (text) {
      dragItem.current = {
        type: 'text',
        id,
        startX: e.clientX,
        startY: e.clientY,
        initialX: text.x,
        initialY: text.y
      };
    }
  };

  const handlePhoneDragStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (phonePos) {
      dragItem.current = {
        type: 'phone',
        startX: e.clientX,
        startY: e.clientY,
        initialX: phonePos.x,
        initialY: phonePos.y
      };
    }
  };

  const handleGlobalMouseMove = (e: React.MouseEvent) => {
    if (!dragItem.current) return;

    const { type, id, startX, startY, initialX, initialY } = dragItem.current;

    // Calculate raw delta scaled by view
    const deltaX = (e.clientX - startX) / viewScale;
    const deltaY = (e.clientY - startY) / viewScale;

    let newX = initialX + deltaX;
    let newY = initialY + deltaY;

    // Snapping Logic
    const SNAP_THRESHOLD = 15;
    const centerX = currentSize.width / 2;
    const centerY = currentSize.height / 2;

    let snapX = false;
    let snapY = false;

    // Snap X (Center)
    if (Math.abs(newX - centerX) < SNAP_THRESHOLD) {
      newX = centerX;
      snapX = true;
    }

    // Snap Y (Center)
    if (Math.abs(newY - centerY) < SNAP_THRESHOLD) {
      newY = centerY;
      snapY = true;
    }

    setGuides({ x: snapX, y: snapY });

    if (type === 'text' && id) {
      updateText(id, { x: newX, y: newY });
    } else if (type === 'phone') {
      setPhonePos({ x: newX, y: newY });
    }
  };

  const handleGlobalMouseUp = () => {
    dragItem.current = null;
    setGuides({ x: false, y: false });
  };

  // Handle Download (High Res Fix)
  const handleDownload = async () => {
    if (!captureRef.current) return;
    setIsDownloading(true);
    setSelectedTextId(null); // Deselect

    await new Promise(r => setTimeout(r, 100)); // Wait for UI update

    try {
      // 1. Clone the Artboard
      // We clone the *inner* content, but we need to ensure it's rendered at full 100% scale
      // decoupled from the "viewScale" of the preview.

      const originalElement = captureRef.current;
      const clone = originalElement.cloneNode(true) as HTMLElement;

      // 2. Setup a hidden container for the clone
      // We place it off-screen but ensure it's visible to the rendering engine
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '-10000px';
      container.style.left = '-10000px';
      container.style.width = `${currentSize.width}px`;
      container.style.height = `${currentSize.height}px`;
      container.style.zIndex = '-9999';
      container.style.overflow = 'hidden';
      // Ensure the container itself isn't scaled
      container.style.transform = 'none';

      // Append clone
      container.appendChild(clone);
      document.body.appendChild(container);

      // 3. Capture the clone
      // Since 'container' is unscaled and sized correctly, html2canvas will see the full pixels.
      const canvas = await html2canvas(clone, {
        scale: 1, // 1 CSS pixel = 1 Output pixel (since we forced size 1080px etc)
        width: currentSize.width,
        height: currentSize.height,
        useCORS: true,
        backgroundColor: null,
        logging: false,
        allowTaint: true,
        // Fix for text offset issues sometimes seen
        onclone: (clonedDoc, element) => {
          // Ensure local fonts or styles are applied if needed, usually auto-handled
        }
      });

      // 4. Cleanup
      document.body.removeChild(container);

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `mockup-${exportTarget}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to generate image. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Handle Drag & Drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const processFile = (file: File) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setScreenImage(event.target?.result as string);
        setImageZoom(1); // Reset image zoom on new upload
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setScreenImage(null);
    setImageZoom(1);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white text-slate-800 font-sans">

      {/* Sidebar Controls */}
      <div className="w-80 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col z-20 shadow-lg relative">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
            <Smartphone className="text-blue-600" /> omer
          </h1>
          <p className="text-xs text-slate-400 mt-1">mockup generator for aso</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">

          {/* Section: Upload */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Görsel (Image)</h2>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group cursor-pointer border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-center">
                <span className="text-sm font-medium text-slate-700 block">Click to Upload</span>
                <span className="text-xs text-slate-400">or drag and drop here</span>
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            {screenImage && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex gap-2">
                  <button
                    onClick={() => setFitMode(fitMode === 'cover' ? 'contain' : 'cover')}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <Monitor className="w-4 h-4" />
                    {fitMode === 'cover' ? 'Fit Screen' : 'Fill Screen'}
                  </button>
                  <button
                    onClick={clearImage}
                    className="flex items-center justify-center p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    title="Remove Image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Inner Image Zoom Control */}
                <div className="pt-2 border-t border-slate-100 mt-2 space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                    <div className="flex items-center gap-1">
                      <ZoomIn className="w-3 h-3" />
                      <span>Image Zoom</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{Math.round(imageZoom * 100)}%</span>
                      <button onClick={() => setImageZoom(1)} className="hover:text-blue-600 transition-colors" title="Reset Image Zoom">
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ZoomOut className="w-3 h-3 text-slate-400" />
                    <input
                      type="range"
                      min="0.1"
                      max="3"
                      step="0.05"
                      value={imageZoom}
                      onChange={(e) => setImageZoom(parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                    <ZoomIn className="w-3 h-3 text-slate-400" />
                  </div>
                </div>
              </div>
            )}
          </div>


          {/* Section: Text */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Metin (Text)</h2>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => addText('heading')} className="p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 text-slate-600 flex flex-col items-center gap-1 transition-all">
                <Type className="w-5 h-5" />
                <span className="text-xs">Add Heading</span>
              </button>
              <button onClick={() => addText('body')} className="p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 text-slate-600 flex flex-col items-center gap-1 transition-all">
                <span className="text-xs font-serif">Aa</span>
                <span className="text-xs">Add Body</span>
              </button>
            </div>

            {/* Selected Text Controls */}
            {selectedTextId && (
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3 animate-in fade-in slide-in-from-left-2">
                <div className="flex justify-between items-center text-xs text-blue-800 font-semibold uppercase">
                  <span>Edit Text</span>
                  <button onClick={() => deleteText(selectedTextId)} className="text-red-500 hover:bg-red-100 p-1 rounded"><Trash2 className="w-3 h-3" /></button>
                </div>
                {(() => {
                  const txt = texts.find(t => t.id === selectedTextId);
                  if (!txt) return null;
                  return (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={txt.text}
                        onChange={(e) => updateText(txt.id, { text: e.target.value })}
                        className="w-full text-xs p-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                      <div className="flex gap-2">
                        <input type="color" value={txt.color} onChange={(e) => updateText(txt.id, { color: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                        <input
                          type="number"
                          value={txt.fontSize}
                          onChange={(e) => updateText(txt.id, { fontSize: parseInt(e.target.value) })}
                          className="w-16 text-xs p-2 border border-blue-200 rounded-lg"
                        />
                        <button onClick={() => updateText(txt.id, { fontWeight: txt.fontWeight === 'bold' ? 'normal' : 'bold' })} className={`px-2 rounded border border-blue-200 text-xs font-bold ${txt.fontWeight === 'bold' ? 'bg-blue-200' : 'bg-white'}`}>B</button>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>

          {/* Section: Background */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Arka Plan (Background)</h2>
            <div className="flex items-center gap-3">
              <div className="relative w-full">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
                <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-white shadow-sm cursor-pointer hover:border-blue-400 transition-colors">
                  <div
                    className="w-10 h-10 rounded-full shadow-inner border border-black/10"
                    style={{ backgroundColor: bgColor }}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-700">Pick Color</span>
                    <span className="text-xs text-slate-400 font-mono uppercase">{bgColor}</span>
                  </div>
                  <Palette className="w-5 h-5 text-slate-400 ml-auto" />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Download */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">İndir (Download)</h2>
            </div>

            {/* Resolution Selector */}
            <div className="bg-slate-50 p-1 rounded-lg border border-slate-200 flex flex-col gap-1">
              {Object.entries(EXPORT_SIZES).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setExportTarget(key as any)}
                  className={`text-left px-3 py-2 rounded-md text-xs font-medium transition-all ${exportTarget === key
                    ? 'bg-white text-blue-600 shadow-sm border border-slate-100'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                    }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span>{config.label}</span>
                    {key === exportTarget && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleDownload}
              disabled={!screenImage || isDownloading}
              className={`w-full py-4 px-6 rounded-xl flex items-center justify-center gap-3 font-semibold transition-all duration-300 shadow-md ${!screenImage
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
                }`}
            >
              {isDownloading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Download {EXPORT_SIZES[exportTarget].width > 0 ? `${EXPORT_SIZES[exportTarget].width}x${EXPORT_SIZES[exportTarget].height}` : 'PNG'}</span>
                </>
              )}
            </button>
            {!screenImage && (
              <p className="text-xs text-center text-slate-400">Upload an image first to enable download</p>
            )}
          </div>

          {/* Instructions */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 leading-relaxed">
            <div className="flex items-center gap-2 mb-2 text-slate-700 font-medium">
              <Info className="w-4 h-4" />
              <span>How to use</span>
            </div>
            Upload a screenshot of your app. Use "Image Zoom" to scale the screenshot inside the phone, and "Canvas Zoom" (top-left) to scale the phone itself.
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 text-center text-xs text-slate-400 border-t border-slate-100">
          HD Quality Mockup Generator
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden bg-slate-200/50"
        onMouseMove={handleGlobalMouseMove}
        onMouseUp={handleGlobalMouseUp}
        onMouseLeave={handleGlobalMouseUp}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >

        {/* Floating View Controls */}
        <div className="absolute top-6 left-6 z-50 flex flex-col gap-2">
          <div className="bg-white/90 backdrop-blur-md shadow-xl border border-white/20 p-3 rounded-xl flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase">View Zoom</span>
            <button onClick={() => setViewScale(Math.max(0.1, viewScale - 0.05))} className="p-1 hover:bg-slate-100 rounded"><ZoomOut className="w-4 h-4 text-slate-600" /></button>
            <span className="text-xs font-mono w-12 text-center">{Math.round(viewScale * 100)}%</span>
            <button onClick={() => setViewScale(Math.min(2, viewScale + 0.05))} className="p-1 hover:bg-slate-100 rounded"><ZoomIn className="w-4 h-4 text-slate-600" /></button>
          </div>

          <div className="bg-white/90 backdrop-blur-md shadow-xl border border-white/20 p-3 rounded-xl flex flex-col gap-2 w-48">
            <span className="text-xs font-semibold text-slate-500 uppercase">Phone Scale</span>
            <div className="flex items-center gap-2">
              <input type="range" min="0.5" max="1.5" step="0.05" value={phoneZoom} onChange={(e) => setPhoneZoom(parseFloat(e.target.value))} className="flex-1 h-1 bg-slate-300 rounded cursor-pointer accent-blue-600" />
              <span className="text-[10px] w-8">{Math.round(phoneZoom * 100)}%</span>
            </div>
          </div>

          {/* Manual Center Button */}
          <button
            onClick={() => setPhonePos({ x: currentSize.width / 2, y: currentSize.height / 2 })}
            className="bg-white/90 backdrop-blur-md shadow-xl border border-white/20 p-3 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-colors text-slate-600 text-xs font-semibold uppercase"
          >
            <Move className="w-4 h-4" />
            Center Phone
          </button>
        </div>

        {/* ARTBOARD - The actual exportable area */}
        <div
          className="shadow-2xl relative origin-center"
          style={{
            width: currentSize.width,
            height: currentSize.height,
            transform: `scale(${viewScale})`,
            backgroundColor: bgColor,
            transition: 'transform 0.05s linear, background-color 0.5s ease-in-out'
          }}
        >
          {/* Capture Target Wrapper - Matches Artboard Size */}
          <div
            ref={captureRef}
            className="w-full h-full relative overflow-hidden"
            style={{
              backgroundColor: bgColor,
              transition: 'background-color 0.5s ease-in-out'
            }}
          >

            {/* Guides */}
            {guides.x && (
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-red-500 z-50 pointer-events-none border-l border-dashed border-red-500 opacity-70"></div>
            )}
            {guides.y && (
              <div className="absolute left-0 right-0 top-1/2 h-px bg-red-500 z-50 pointer-events-none border-t border-dashed border-red-500 opacity-70"></div>
            )}

            {/* Center Content (Phone) */}
            <div
              className="absolute flex items-center justify-center cursor-move"
              style={{
                left: phonePos?.x || currentSize.width / 2,
                top: phonePos?.y || currentSize.height / 2,
                transform: 'translate(-50%, -50%) scale(' + phoneZoom + ')', // Application of position + zoom
                zIndex: 10
              }}
              onMouseDown={handlePhoneDragStart}
            >
              {/* Prevent default drag behavior of images inside */}
              <div className="pointer-events-none">
                <IPhone15Pro>
                  {screenImage ? (
                    <img
                      src={screenImage}
                      alt="App Screen"
                      style={{
                        transform: `scale(${imageZoom})`,
                        transition: 'transform 0.1s ease-out',
                        transformOrigin: 'center center'
                      }}
                      className={`w-full h-full ${fitMode === 'cover' ? 'object-cover' : 'object-contain'} bg-black`}
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center text-slate-400 gap-4">
                      <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center">
                        <ImageIcon className="w-10 h-10 text-slate-400" />
                      </div>
                      <div className="text-center">
                        <p className="font-medium">Drop Image Here</p>
                        <p className="text-sm opacity-70">1179 x 2556 px recommended</p>
                      </div>
                    </div>
                  )}
                </IPhone15Pro>
              </div>
            </div>

            {/* Text Layer */}
            <div className="absolute inset-0 z-20 pointer-events-none">
              {texts.map(text => (
                <div
                  key={text.id}
                  onMouseDown={(e) => handleTextDragStart(e, text.id)}
                  className={`absolute cursor-move pointer-events-auto leading-tight select-none ${selectedTextId === text.id ? 'ring-2 ring-blue-500 ring-offset-2' : 'hover:ring-1 hover:ring-blue-300 ring-offset-1'}`}
                  style={{
                    left: text.x,
                    top: text.y,
                    transform: 'translate(-50%, -50%)', // Center align coordinate
                    color: text.color,
                    fontSize: `${text.fontSize}px`,
                    fontWeight: text.fontWeight,
                    textAlign: text.align,
                    whiteSpace: 'pre-wrap',
                    width: 'max-content',
                    maxWidth: '300%'
                  }}
                >
                  {text.text}
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

// Realistic iPhone 15/16 Pro Component (CSS-only)
const IPhone15Pro = ({ children }: { children?: React.ReactNode }) => {
  return (
    /* 
       Aspect Ratio approx 19.5:9 
       Dimensions based on relative scaling to look realistic
    */
    <div className="relative group select-none">
      {/* Outer Case Outline / Shadow - Replaced blur with standard shadow for reliable export */}
      <div className="absolute -inset-[1px] rounded-[60px] shadow-xl"></div>

      {/* Main Chassis (Titanium Frame) - Removed ring, simplified border */}
      <div className="relative w-[360px] h-[780px] bg-slate-800 rounded-[55px] p-[12px] shadow-2xl border-[6px] border-[#4a4a4a]">

        {/* Antenna Bands */}
        <div className="absolute top-24 left-0 w-[6px] h-3 bg-[#333] -translate-x-full rounded-l-md"></div>
        <div className="absolute top-24 right-0 w-[6px] h-3 bg-[#333] translate-x-full rounded-r-md"></div>
        <div className="absolute bottom-24 left-0 w-[6px] h-3 bg-[#333] -translate-x-full rounded-l-md"></div>
        <div className="absolute bottom-24 right-0 w-[6px] h-3 bg-[#333] translate-x-full rounded-r-md"></div>

        {/* Buttons */}
        {/* Silent Switch */}
        <div className="absolute top-28 left-[-16px] w-[6px] h-8 bg-[#2d2d2d] rounded-l-md shadow-sm border-l border-white/10"></div>
        {/* Volume Up */}
        <div className="absolute top-44 left-[-16px] w-[6px] h-14 bg-[#2d2d2d] rounded-l-md shadow-sm border-l border-white/10"></div>
        {/* Volume Down */}
        <div className="absolute top-64 left-[-16px] w-[6px] h-14 bg-[#2d2d2d] rounded-l-md shadow-sm border-l border-white/10"></div>
        {/* Power Button */}
        <div className="absolute top-48 right-[-16px] w-[6px] h-20 bg-[#2d2d2d] rounded-r-md shadow-sm border-r border-white/10"></div>

        {/* Inner Bezel (Black Border) */}
        <div className="relative w-full h-full bg-black rounded-[46px] overflow-hidden ring-4 ring-black">

          {/* Screen Content */}
          <div className="w-full h-full relative z-0 bg-black overflow-hidden">
            {children}
          </div>

          {/* Dynamic Island / Notch */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-20 flex justify-center">
            {/* The Island itself */}
            <div className="mt-3 w-[120px] h-[35px] bg-black rounded-full flex items-center justify-center relative shadow-sm border border-[#1a1a1a]">
              {/* Camera reflection hint */}
              <div className="absolute right-4 w-2 h-2 rounded-full bg-blue-900/20"></div>
              <div className="absolute right-3 w-[6px] h-[6px] rounded-full bg-[#1a1a1a]"></div>
            </div>
          </div>

          {/* Screen Gloss/Reflection (Subtle) */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/5 to-transparent opacity-30 z-30 rounded-[46px]"></div>
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);