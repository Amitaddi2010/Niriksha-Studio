import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Search, 
  Upload,
  Trash2,
  Loader2
} from 'lucide-react';
import type { SpreadsheetForm } from '../types';

interface SpreadsheetViewProps {
  spreadsheet: SpreadsheetForm | null;
  onDownload: () => void;
  onUploadForm: (file: File) => void;
  onDownloadTemplate: () => void;
  onDeleteRow?: (rowIndex: number) => Promise<void>;
}

export const SpreadsheetView: React.FC<SpreadsheetViewProps> = ({
  spreadsheet,
  onDownload,
  onUploadForm,
  onDownloadTemplate,
  onDeleteRow
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  if (!spreadsheet) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 bg-[#ffffff] border border-[#e5e7eb] rounded-[16px] text-center">
        <div className="w-12 h-12 rounded-[12px] bg-[#f4f2f0] flex items-center justify-center text-[#0c0a08] mb-3">
          <FileSpreadsheet className="w-6 h-6 stroke-[1.5]" />
        </div>
        <h3 className="text-sm font-normal text-[#0c0a08] mb-1">No Coding Form Loaded</h3>
        <p className="text-xs text-[#6d6c6b] max-w-sm mb-6 leading-relaxed">
          Upload an Excel or CSV file containing your extraction schema, or download the standard systematic review template.
        </p>
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 px-4 py-2 rounded-[6px] bg-[#0c0a08] hover:bg-[#1a1919] text-[#ffffff] text-xs font-normal cursor-pointer transition">
            <Upload className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Upload Coding Form</span>
            <input 
              type="file" 
              accept=".xlsx,.xls,.csv" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files?.[0]) onUploadForm(e.target.files[0]);
              }} 
            />
          </label>
          <button
            onClick={onDownloadTemplate}
            className="flex items-center space-x-2 px-4 py-2 rounded-[6px] border border-[#e5e7eb] bg-[#ffffff] hover:bg-[#f4f2f0] text-[#0c0a08] text-xs transition"
          >
            <Download className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Download Template (.xlsx)</span>
          </button>
        </div>
      </div>
    );
  }

  const handleDelete = async (rowIdx: number) => {
    if (!onDeleteRow) return;
    if (!window.confirm(`Delete row #${rowIdx + 1} from this coding sheet?`)) return;
    setDeletingIndex(rowIdx);
    try {
      await onDeleteRow(rowIdx);
    } finally {
      setDeletingIndex(null);
    }
  };

  const filteredRecords = (spreadsheet.records || []).map((row, originalIndex) => ({
    row,
    originalIndex
  })).filter(({ row }) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return Object.values(row).some(val => String(val).toLowerCase().includes(term));
  });

  return (
    <div className="flex flex-col h-full bg-[#ffffff] border border-[#e5e7eb] rounded-[16px] overflow-hidden">
      {/* Table Toolbar — Ramp Monochrome */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb] bg-[#ffffff]">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-[8px] bg-[#f4f2f0] border border-[#e5e7eb] text-[#0c0a08]">
            <FileSpreadsheet className="w-4 h-4 stroke-[1.5]" />
          </div>
          <div>
            <h3 className="text-sm font-normal text-[#0c0a08] flex items-center space-x-2">
              <span>{spreadsheet.filename}</span>
              <span className="px-2 py-0.5 rounded-[6px] bg-[#f4f2f0] text-[#6d6c6b] font-mono text-[10px]">
                {spreadsheet.records?.length || 0} rows
              </span>
            </h3>
            <p className="text-[10px] uppercase tracking-[0.18px] text-[#6d6c6b]">
              {spreadsheet.columns.length} extraction variables defined
            </p>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#6d6c6b] stroke-[1.5]" />
            <input
              type="text"
              placeholder="Search recorded entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-[#ffffff] border border-[#e5e7eb] rounded-[10px] text-xs text-[#0c0a08] placeholder-[#6d6c6b] focus:outline-none focus:border-[#0c0a08] w-52"
            />
          </div>

          <label className="flex items-center space-x-1.5 px-3 py-1.5 rounded-[6px] border border-[#e5e7eb] bg-[#ffffff] hover:bg-[#f4f2f0] text-[#0c0a08] text-xs cursor-pointer transition">
            <Upload className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Upload Form</span>
            <input 
              type="file" 
              accept=".xlsx,.xls,.csv" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files?.[0]) onUploadForm(e.target.files[0]);
              }} 
            />
          </label>

          <button
            onClick={onDownload}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-[6px] border border-[#0c0a08] bg-transparent hover:bg-[#f4f2f0] text-[#0c0a08] text-xs transition"
          >
            <Download className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Export (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Table Data Viewport */}
      <div className="flex-1 overflow-auto bg-[#ffffff]">
        <table className="w-full border-collapse text-left text-xs font-sans">
          <thead className="sticky top-0 bg-[#f4f2f0] border-b border-[#e5e7eb] z-10">
            <tr>
              <th className="py-2.5 px-3 font-mono text-[#6d6c6b] w-12 text-center border-r border-[#e5e7eb] text-[10px] uppercase tracking-[0.18px]">
                #
              </th>
              {onDeleteRow && (
                <th className="py-2.5 px-3 font-mono text-[#6d6c6b] w-16 text-center border-r border-[#e5e7eb] text-[10px] uppercase tracking-[0.18px]">
                  Action
                </th>
              )}
              {spreadsheet.columns.map((col, idx) => (
                <th 
                  key={idx} 
                  className="py-2.5 px-4 text-[#6d6c6b] whitespace-nowrap border-r border-[#e5e7eb] max-w-xs truncate text-[10px] uppercase tracking-[0.18px] font-normal"
                  title={col}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e7eb]">
            {filteredRecords.length === 0 ? (
              <tr>
                <td 
                  colSpan={spreadsheet.columns.length + (onDeleteRow ? 2 : 1)} 
                  className="py-12 text-center text-[#6d6c6b] text-xs font-normal"
                >
                  {searchTerm ? 'No matching rows found.' : 'No data recorded yet. Run extraction and click "Record" to append study rows.'}
                </td>
              </tr>
            ) : (
              filteredRecords.map(({ row, originalIndex }) => (
                <tr key={originalIndex} className="hover:bg-[#f4f2f0]/60 transition group">
                  <td className="py-2 px-3 font-mono text-[#6d6c6b] text-center border-r border-[#e5e7eb]">
                    {originalIndex + 1}
                  </td>
                  {onDeleteRow && (
                    <td className="py-2 px-3 text-center border-r border-[#e5e7eb]">
                      <button
                        onClick={() => handleDelete(originalIndex)}
                        disabled={deletingIndex === originalIndex}
                        className="p-1 rounded-[4px] text-[#6d6c6b] hover:text-[#0c0a08] hover:bg-[#e5e7eb] transition disabled:opacity-50"
                        title={`Delete row #${originalIndex + 1}`}
                      >
                        {deletingIndex === originalIndex ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
                        )}
                      </button>
                    </td>
                  )}
                  {spreadsheet.columns.map((col, cIdx) => (
                    <td 
                      key={cIdx} 
                      className="py-2 px-4 text-[#0c0a08] border-r border-[#e5e7eb] max-w-xs truncate"
                      title={row[col] || ''}
                    >
                      {row[col] ? (
                        <span>{row[col]}</span>
                      ) : (
                        <span className="text-[#6d6c6b] italic">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
