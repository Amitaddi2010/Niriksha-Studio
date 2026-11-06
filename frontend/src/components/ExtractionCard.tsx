import React, { useState } from 'react';
import { 
  Check, 
  FileSearch, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Save, 
  Quote,
  ExternalLink
} from 'lucide-react';
import type { ExtractionItem } from '../types';

interface ExtractionCardProps {
  item: ExtractionItem;
  index: number;
  onUpdateAnswer: (promptId: number, newAnswer: string) => void;
  onInspectSource: (page: number, quote: string) => void;
  onRecordSingle: (item: ExtractionItem) => void;
  onReExtractSingle?: (item: ExtractionItem) => void;
  isReExtracting?: boolean;
}

export const ExtractionCard: React.FC<ExtractionCardProps> = ({
  item,
  index,
  onUpdateAnswer,
  onInspectSource,
  onRecordSingle,
  onReExtractSingle,
  isReExtracting = false
}) => {
  const [showSource, setShowSource] = useState<boolean>(false);

  const handleInspect = () => {
    setShowSource(true);
    if (item.page_number && item.source_quote) {
      onInspectSource(item.page_number, item.source_quote);
    }
  };

  return (
    <div className={`p-5 rounded-[16px] bg-[#ffffff] border transition-colors duration-150 ${
      item.is_recorded 
        ? 'border-[#0c0a08]' 
        : 'border-[#e5e7eb] hover:border-[#d3d3d3]'
    }`}>
      {/* Header: Prompt Number, Title, and State Tag */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start space-x-2.5">
          <span className="flex items-center justify-center w-5 h-5 rounded-[6px] bg-[#f4f2f0] border border-[#e5e7eb] text-[#0c0a08] font-mono text-[11px] shrink-0 mt-0.5">
            {index + 1}
          </span>
          <h4 className="text-[14px] text-[#0c0a08] leading-snug font-normal">
            {item.prompt}
          </h4>
        </div>

        {/* Ramp Status Tag */}
        {item.is_recorded ? (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-[6px] bg-[#e4f222] text-[#0c0a08] text-[10px] uppercase tracking-[0.18px] shrink-0">
            <Check className="w-3 h-3 stroke-[2.5]" />
            <span>Recorded</span>
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-[6px] bg-[#f4f2f0] text-[#6d6c6b] text-[10px] uppercase tracking-[0.18px] shrink-0 border border-[#e5e7eb]">
            Unsaved
          </span>
        )}
      </div>

      {/* Answer Input (Ramp 10px radius input) */}
      <div className="mb-3">
        <textarea
          rows={2}
          value={item.answer}
          onChange={(e) => onUpdateAnswer(item.prompt_id, e.target.value)}
          placeholder="Extracted data value will appear here..."
          className="w-full px-3.5 py-2.5 text-[13px] bg-[#ffffff] border border-[#e5e7eb] rounded-[10px] text-[#0c0a08] placeholder-[#6d6c6b] focus:outline-none focus:border-[#0c0a08] transition-colors resize-y leading-relaxed font-normal"
        />
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between text-xs pt-0.5">
        <div className="flex items-center space-x-2">
          {item.source_quote ? (
            <button
              type="button"
              onClick={handleInspect}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-[6px] border text-xs transition duration-150 ${
                showSource 
                  ? 'bg-[#0c0a08] text-[#ffffff] border-[#0c0a08]' 
                  : 'bg-[#ffffff] border-[#e5e7eb] hover:bg-[#f4f2f0] text-[#0c0a08]'
              }`}
            >
              <FileSearch className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>Source {item.page_number ? `(Page ${item.page_number})` : ''}</span>
              {showSource ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
            </button>
          ) : (
            <span className="text-[#6d6c6b] text-[11px] italic">No direct quote cited</span>
          )}

          {/* Re-extract Single Prompt Button */}
          {onReExtractSingle && (
            <button
              type="button"
              onClick={() => onReExtractSingle(item)}
              disabled={isReExtracting}
              className="p-1.5 rounded-[6px] border border-[#e5e7eb] bg-[#ffffff] hover:bg-[#f4f2f0] text-[#6d6c6b] hover:text-[#0c0a08] transition duration-150"
              title="Re-extract with LM Studio"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReExtracting ? 'animate-spin text-[#0c0a08]' : ''}`} />
            </button>
          )}
        </div>

        {/* Record Button */}
        <button
          type="button"
          onClick={() => onRecordSingle(item)}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-[6px] text-xs transition duration-150 ${
            item.is_recorded
              ? 'bg-[#ffffff] text-[#0c0a08] border border-[#e5e7eb] hover:bg-[#f4f2f0]'
              : 'bg-[#0c0a08] text-[#ffffff] hover:bg-[#1a1919]'
          }`}
        >
          <Save className="w-3.5 h-3.5 stroke-[1.5]" />
          <span>{item.is_recorded ? 'Update' : 'Record'}</span>
        </button>
      </div>

      {/* Expandable Source Evidence Drawer (Wash Card) */}
      {showSource && item.source_quote && (
        <div className="mt-3 p-3.5 bg-[#f4f2f0] rounded-[12px] border border-[#e5e7eb] text-xs space-y-2">
          <div className="flex items-center justify-between text-[#6d6c6b] text-[10px] uppercase tracking-[0.18px]">
            <span className="flex items-center space-x-1.5 text-[#0c0a08]">
              <Quote className="w-3 h-3 stroke-[1.5]" />
              <span>Verbatim Source Evidence</span>
            </span>
            {item.page_number && (
              <span className="font-mono text-[#0c0a08]">Page {item.page_number}</span>
            )}
          </div>
          <p className="font-serif italic text-[#0c0a08] leading-relaxed bg-[#ffffff] p-3 rounded-[8px] border border-[#e5e7eb]">
            "{item.source_quote}"
          </p>
          <div className="flex justify-end pt-0.5">
            <button
              type="button"
              onClick={handleInspect}
              className="text-[#0c0a08] hover:text-[#6d6c6b] text-[11px] flex items-center space-x-1 transition"
            >
              <ExternalLink className="w-3 h-3 stroke-[1.5]" />
              <span>Jump to Page & Highlight</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
