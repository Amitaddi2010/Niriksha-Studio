import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  FileText, 
  Loader2,
  Highlighter,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import type { HighlightBox } from '../types';

if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  } catch (e) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
}

interface PDFViewerProps {
  fileUrl: string | null;
  targetPage?: number | null;
  highlights?: HighlightBox[];
  highlightQuote?: string | null;
  onPageChange?: (page: number) => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  fileUrl,
  targetPage,
  highlights = [],
  highlightQuote,
  onPageChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Load PDF Document when fileUrl changes
  useEffect(() => {
    if (!fileUrl) {
      setPdfDoc(null);
      setTotalPages(0);
      setErrorMessage(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setErrorMessage(null);

    const loadingTask = pdfjsLib.getDocument({
      url: fileUrl,
      cMapPacked: true,
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
    });

    loadingTask.promise
      .then((doc: any) => {
        if (!isMounted) return;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
        setLoading(false);
      })
      .catch((err: any) => {
        if (!isMounted) return;
        console.error("Error loading PDF document:", err);
        setErrorMessage(err?.message || "Failed to load PDF document.");
        setLoading(false);
      });

    return () => {
      isMounted = false;
      try {
        loadingTask.destroy();
      } catch (e) {}
    };
  }, [fileUrl]);

  // Jump to target page when requested externally
  useEffect(() => {
    if (targetPage && targetPage >= 1 && targetPage <= totalPages && targetPage !== currentPage) {
      setCurrentPage(targetPage);
      if (onPageChange) onPageChange(targetPage);
    }
  }, [targetPage, totalPages]);

  // Render current page onto Canvas
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    // Cancel any ongoing rendering task to prevent canvas collision
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch (e) {}
      renderTaskRef.current = null;
    }

    setLoading(true);
    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale, rotation });
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return;

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      setViewportSize({ width: Math.floor(viewport.width), height: Math.floor(viewport.height) });

      const task = page.render({
        canvasContext: context,
        viewport: viewport
      });
      renderTaskRef.current = task;

      await task.promise;
      renderTaskRef.current = null;
      setLoading(false);
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error("PDF render error:", err);
        setErrorMessage(err?.message || "Failed to render PDF page.");
      }
      setLoading(false);
    }
  }, [pdfDoc, currentPage, scale, rotation]);

  // Trigger render when pdfDoc, page, scale, or rotation changes
  useEffect(() => {
    renderPage();
  }, [renderPage]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const p = currentPage - 1;
      setCurrentPage(p);
      if (onPageChange) onPageChange(p);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      const p = currentPage + 1;
      setCurrentPage(p);
      if (onPageChange) onPageChange(p);
    }
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 2.5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.6));
  const handleResetZoom = () => setScale(1.2);
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  if (!fileUrl) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-[#ffffff] border border-[#e5e7eb] rounded-[16px] text-center">
        <div className="w-12 h-12 rounded-[12px] bg-[#f4f2f0] flex items-center justify-center text-[#0c0a08] mb-3">
          <FileText className="w-6 h-6 stroke-[1.5]" />
        </div>
        <h3 className="text-sm font-normal text-[#0c0a08] mb-1">No Document Loaded</h3>
        <p className="text-xs text-[#6d6c6b] max-w-xs mb-4">
          Upload an academic PDF paper to view pages and audit extraction sources.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#ffffff] border border-[#e5e7eb] rounded-[16px] overflow-hidden min-h-0">
      {/* Viewer Toolbar — Ramp Minimal Monochrome */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-[#ffffff] border-b border-[#e5e7eb] text-[#0c0a08] select-none text-xs shrink-0">
        {/* Page Nav */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || loading}
            className="p-1 sm:p-1.5 rounded-[6px] hover:bg-[#f4f2f0] disabled:opacity-25 disabled:hover:bg-transparent transition text-[#0c0a08] cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4 stroke-[1.5]" />
          </button>
          
          <div className="flex items-center space-x-1 text-xs text-[#6d6c6b]">
            <span className="hidden sm:inline text-[10px] uppercase tracking-[0.18px]">Page</span>
            <input
              type="number"
              min={1}
              max={totalPages || 1}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val >= 1 && val <= totalPages) {
                  setCurrentPage(val);
                  if (onPageChange) onPageChange(val);
                }
              }}
              className="w-10 sm:w-11 text-center py-0.5 px-1 bg-[#f4f2f0] border border-[#e5e7eb] rounded-[6px] text-[#0c0a08] focus:outline-none focus:border-[#0c0a08] font-mono text-xs"
            />
            <span>/ {totalPages || '-'}</span>
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages || loading}
            className="p-1 sm:p-1.5 rounded-[6px] hover:bg-[#f4f2f0] disabled:opacity-25 disabled:hover:bg-transparent transition text-[#0c0a08] cursor-pointer"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4 stroke-[1.5]" />
          </button>
        </div>

        {/* Ramp Neon Highlighter Badge if active quote highlighted */}
        {highlights && highlights.length > 0 && (
          <div className="flex items-center space-x-1 px-2 py-0.5 bg-[#e4f222] rounded-[6px] text-[#0c0a08] text-[10px] uppercase tracking-[0.18px] shrink-0 font-mono">
            <Highlighter className="w-3 h-3 stroke-[2]" />
            <span className="hidden sm:inline">Highlighter Active</span>
            <span className="sm:hidden">Active</span>
          </div>
        )}

        {/* Zoom & Rotation Controls */}
        <div className="flex items-center space-x-0.5 sm:space-x-1 shrink-0">
          <button
            onClick={handleZoomOut}
            className="p-1 sm:p-1.5 rounded-[6px] hover:bg-[#f4f2f0] text-[#0c0a08] transition cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>
          <button
            onClick={handleResetZoom}
            className="px-1.5 py-1 text-[11px] font-mono rounded-[6px] hover:bg-[#f4f2f0] text-[#0c0a08] transition cursor-pointer"
            title="Reset Zoom (120%)"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            className="p-1 sm:p-1.5 rounded-[6px] hover:bg-[#f4f2f0] text-[#0c0a08] transition cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>
          <div className="w-px h-3.5 bg-[#e5e7eb] mx-0.5 sm:mx-1" />
          <button
            onClick={handleRotate}
            className="p-1 sm:p-1.5 rounded-[6px] hover:bg-[#f4f2f0] text-[#0c0a08] transition cursor-pointer"
            title="Rotate Clockwise"
          >
            <RotateCw className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>
        </div>
      </div>

      {/* Main Viewport — Warm Bone Canvas (#f4f2f0) */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-4 flex justify-center items-start bg-[#f4f2f0] relative min-h-0"
      >
        {loading && (
          <div className="absolute inset-0 bg-[#f4f2f0]/60 backdrop-blur-xs flex items-center justify-center z-20">
            <div className="flex items-center space-x-2.5 bg-[#ffffff] px-4 py-2 rounded-[6px] border border-[#e5e7eb] shadow-sm">
              <Loader2 className="w-4 h-4 text-[#0c0a08] animate-spin stroke-[1.5]" />
              <span className="text-xs text-[#0c0a08]">Rendering page {currentPage}...</span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-6 bg-[#ffffff] border border-[#0c0a08] rounded-[12px] text-xs flex flex-col items-center space-y-3 max-w-sm m-auto text-center z-10">
            <AlertCircle className="w-6 h-6 text-[#0c0a08]" />
            <p className="text-[#0c0a08]">{errorMessage}</p>
            <button
              onClick={() => {
                setErrorMessage(null);
                renderPage();
              }}
              className="px-3 py-1.5 rounded-[6px] bg-[#0c0a08] text-[#ffffff] text-xs transition cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 inline mr-1" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Paper Document Canvas with Hairline Border — ALWAYS in DOM so canvasRef is never null */}
        <div 
          className={`relative rounded-[4px] bg-[#ffffff] border border-[#e5e7eb] shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-150 ${
            errorMessage ? 'hidden' : 'block'
          }`}
          style={{ 
            width: viewportSize.width > 0 ? viewportSize.width : 'auto', 
            height: viewportSize.height > 0 ? viewportSize.height : 'auto' 
          }}
        >
          <canvas ref={canvasRef} className="block rounded-[4px]" />

          {/* Neon Highlighter Yellow Box Overlays */}
          {highlights && highlights.length > 0 && (
            <div className="absolute inset-0 pointer-events-none">
              {highlights.map((h, i) => (
                <div
                  key={i}
                  className="absolute bg-[#e4f222]/50 border-b-2 border-[#0c0a08] transition-all duration-200"
                  style={{
                    left: `${h.x * 100}%`,
                    top: `${h.y * 100}%`,
                    width: `${h.width * 100}%`,
                    height: `${h.height * 100}%`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Source Quote Banner */}
      {highlightQuote && (
        <div className="px-4 py-2.5 bg-[#ffffff] border-t border-[#e5e7eb] text-xs flex items-start space-x-2 shrink-0">
          <span className="text-[10px] uppercase tracking-[0.18px] text-[#6d6c6b] shrink-0 mt-0.5">
            Citation Quote:
          </span>
          <p className="italic text-[#0c0a08] font-serif leading-relaxed line-clamp-2">
            "{highlightQuote}"
          </p>
        </div>
      )}
    </div>
  );
};
