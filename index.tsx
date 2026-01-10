import React, { useState, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Upload, Image as ImageIcon, Palette, Smartphone, Trash2, Monitor, Info, ZoomIn, ZoomOut, RotateCcw, Maximize } from 'lucide-react';

const App = () => {
  const [screenImage, setScreenImage] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState<string>('#e2e8f0');
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');
  const [imageZoom, setImageZoom] = useState<number>(1); // Zoom for the image inside the phone
  const [phoneZoom, setPhoneZoom] = useState<number>(1); // Zoom for the phone itself
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            <Smartphone className="text-blue-600" /> MockupPro
          </h1>
          <p className="text-xs text-slate-400 mt-1">HD iPhone Mockup Generator</p>
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
                              <RotateCcw className="w-3 h-3"/>
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
        className="flex-1 relative flex items-center justify-center overflow-hidden transition-colors duration-500 ease-in-out"
        style={{ backgroundColor: bgColor }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        
        {/* Top-Left Phone Scale Control */}
        <div className="absolute top-6 left-6 z-50 bg-white/90 backdrop-blur-md shadow-xl border border-white/20 p-4 rounded-2xl flex flex-col gap-3 w-56 animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                    <Maximize className="w-4 h-4 text-blue-600" />
                    <span>Device Size</span>
                </div>
                <div className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                   {Math.round(phoneZoom * 100)}%
                </div>
            </div>
            <div className="flex items-center gap-2">
                 <button onClick={() => setPhoneZoom(Math.max(0.2, phoneZoom - 0.1))} className="p-1 hover:bg-slate-100 rounded-md text-slate-500"><ZoomOut className="w-4 h-4"/></button>
                 <input 
                    type="range" 
                    min="0.2" 
                    max="1.5" 
                    step="0.05"
                    value={phoneZoom}
                    onChange={(e) => setPhoneZoom(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                 />
                 <button onClick={() => setPhoneZoom(Math.min(1.5, phoneZoom + 0.1))} className="p-1 hover:bg-slate-100 rounded-md text-slate-500"><ZoomIn className="w-4 h-4"/></button>
            </div>
             <button 
                onClick={() => setPhoneZoom(1)} 
                className="text-xs text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-1 justify-center mt-1"
             >
                <RotateCcw className="w-3 h-3" /> Reset Size
             </button>
        </div>

        {/* Device Container with Dynamic Zoom */}
        <div 
          className="relative z-10 transition-transform duration-100 ease-out will-change-transform origin-center"
          style={{ transform: `scale(${phoneZoom})` }}
        >
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

        {/* Floating Hint */}
        {!screenImage && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-xl border border-white/20 text-sm font-medium text-slate-600 animate-bounce">
            ↑ Drag & Drop your screenshot anywhere ↑
          </div>
        )}
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
      {/* Outer Case Outline / Shadow */}
      <div className="absolute -inset-[1px] bg-slate-400/30 rounded-[60px] blur-sm"></div>
      
      {/* Main Chassis (Titanium Frame) */}
      <div className="relative w-[360px] h-[780px] bg-slate-800 rounded-[55px] p-[12px] shadow-2xl border-[6px] border-[#4a4a4a] ring-1 ring-white/10">
        
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
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none z-20">
             {/* The Island itself */}
             <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[120px] h-[35px] bg-black rounded-full flex items-center justify-center">
                {/* Camera reflection hint */}
                <div className="absolute right-4 w-2 h-2 rounded-full bg-blue-900/20 blur-[1px]"></div>
                <div className="absolute right-3 w-[6px] h-[6px] rounded-full bg-[#1a1a1a] ring-1 ring-white/5"></div>
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