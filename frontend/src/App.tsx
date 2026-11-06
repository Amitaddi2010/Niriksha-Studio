import React, { useState, useEffect, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  FileSpreadsheet, 
  Sparkles, 
  Check, 
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Columns
} from 'lucide-react';
import { Header } from './components/Header';
import { PDFViewer } from './components/PDFViewer';
import { ExtractionCard } from './components/ExtractionCard';
import { SpreadsheetView } from './components/SpreadsheetView';
import { SettingsModal } from './components/SettingsModal';
import { LandingPage } from './components/LandingPage';
import type { 
  ExtractionItem, 
  LMStudioHealth, 
  PDFDoc, 
  SpreadsheetForm, 
  HighlightBox 
} from './types';

export const App: React.FC = () => {
  // Navigation & Modal States
  const [activeTab, setActiveTab] = useState<'landing' | 'workbench' | 'spreadsheet' | 'settings'>('workbench');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Responsive View Toggle on Smaller Screens (< 1280px): 'pdf' | 'form' | 'split'
  const [workbenchView, setWorkbenchView] = useState<'split' | 'pdf' | 'form'>('split');

  // LLM Configuration
  const [baseUrl, setBaseUrl] = useState<string>('http://localhost:1234/v1');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [temperature, setTemperature] = useState<number>(0.1);
  const [health, setHealth] = useState<LMStudioHealth | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(false);

  // Document Queue & Schema States (Database backed)
  const [documents, setDocuments] = useState<PDFDoc[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetForm | null>(null);
  const [extractions, setExtractions] = useState<ExtractionItem[]>([]);
  
  // PDF Viewer Interaction States
  const [targetPage, setTargetPage] = useState<number | null>(null);
  const [activeHighlights, setActiveHighlights] = useState<HighlightBox[]>([]);
  const [activeQuote, setActiveQuote] = useState<string | null>(null);

  // Extraction Execution States
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractionProgress, setExtractionProgress] = useState<number>(0);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [extractionPhase, setExtractionPhase] = useState<string>('');
  const [extractError, setExtractError] = useState<string | null>(null);
  const [reExtractingPromptId, setReExtractingPromptId] = useState<number | null>(null);
  const [isRecordingAll, setIsRecordingAll] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const activeDoc = documents.find(d => d.file_id === selectedDocId) || null;

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Check LM Studio health on startup and periodically
  const fetchHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const res = await fetch(`/api/llm/health?base_url=${encodeURIComponent(baseUrl)}`);
      const data = await res.json();
      setHealth(data);
      if (data.models && data.models.length > 0 && !selectedModel) {
        setSelectedModel(data.models[0]);
      }
    } catch (err: any) {
      setHealth({
        status: 'offline',
        connected: false,
        latency_ms: null,
        models: [],
        base_url: baseUrl,
        error: err.message
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  // Load document list from SQLite database
  const refreshDocuments = useCallback(async (selectDocId?: string) => {
    try {
      const res = await fetch('/api/pdf/list');
      if (res.ok) {
        const data = await res.json();
        const docs: PDFDoc[] = data.documents || [];
        setDocuments(docs);
        if (selectDocId) {
          setSelectedDocId(selectDocId);
        } else if (docs.length > 0 && !selectedDocId) {
          setSelectedDocId(docs[0].file_id);
        }
      }
    } catch (err) {
      console.error('Failed to load documents list from DB:', err);
    }
  }, [selectedDocId]);

  // Load active coding form from SQLite database
  const refreshActiveForm = useCallback(async () => {
    try {
      const res = await fetch('/api/spreadsheet/active');
      if (res.ok) {
        const data = await res.json();
        if (data.active && data.form) {
          const form: SpreadsheetForm = data.form;
          setSpreadsheet(form);

          setExtractions(prev => {
            if (prev.length > 0) return prev;
            return form.prompts.map((p, idx) => ({
              prompt_id: p.id || idx + 1,
              prompt: p.text,
              answer: '',
              source_quote: null,
              page_number: null,
              is_recorded: false
            }));
          });
        }
      }
    } catch (err) {
      console.error('Failed to load active coding form from DB:', err);
    }
  }, []);

  // When selected document changes, load its saved extractions from SQLite DB
  const loadExtractionsForDoc = useCallback(async (docId: string, currentPrompts?: ExtractionItem[]) => {
    try {
      const res = await fetch(`/api/pdf/${docId}/extractions`);
      if (res.ok) {
        const data = await res.json();
        const savedList: ExtractionItem[] = data.extractions || [];

        setExtractions(prev => {
          const base = (prev.length > 0 ? prev : (currentPrompts || []));
          if (savedList.length === 0) {
            return base.map(item => ({
              ...item,
              answer: '',
              source_quote: null,
              page_number: null,
              is_recorded: false
            }));
          }

          return base.map(item => {
            const match = savedList.find(s => s.prompt_id === item.prompt_id);
            if (match) {
              return {
                ...item,
                answer: match.answer || '',
                source_quote: match.source_quote || null,
                page_number: match.page_number || null,
                confidence: match.confidence || 'medium',
                is_recorded: match.is_recorded || false
              };
            }
            return {
              ...item,
              answer: '',
              source_quote: null,
              page_number: null,
              is_recorded: false
            };
          });
        });
      }
    } catch (err) {
      console.error('Failed to load document extractions:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchHealth();
    refreshDocuments();
    refreshActiveForm();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  // Trigger load when selected document changes
  useEffect(() => {
    if (selectedDocId) {
      loadExtractionsForDoc(selectedDocId);
      setTargetPage(1);
      setActiveHighlights([]);
      setActiveQuote(null);
    }
  }, [selectedDocId, loadExtractionsForDoc]);

  // Upload PDF Handler
  const handlePdfUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/pdf/upload', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed to upload PDF');
      const data: PDFDoc = await res.json();
      
      await refreshDocuments(data.file_id);
      setSelectedDocId(data.file_id);
      setTargetPage(1);
      setActiveHighlights([]);
      setActiveQuote(null);
      showNotification(`Saved to DB: ${data.filename} (${data.total_pages} pages)`);
    } catch (err: any) {
      alert(`PDF Upload Error: ${err.message}`);
    }
  };

  // Upload Coding Form Handler
  const handleFormUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/spreadsheet/upload', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed to upload spreadsheet');
      const data: SpreadsheetForm = await res.json();
      setSpreadsheet(data);

      const items: ExtractionItem[] = data.prompts.map((p, idx) => ({
        prompt_id: p.id || idx + 1,
        prompt: p.text,
        answer: '',
        source_quote: null,
        page_number: null,
        is_recorded: false
      }));
      setExtractions(items);

      if (selectedDocId) {
        loadExtractionsForDoc(selectedDocId, items);
      }

      showNotification(`Saved form to DB: ${data.prompts.length} variables detected.`);
    } catch (err: any) {
      alert(`Spreadsheet Upload Error: ${err.message}`);
    }
  };

  // Run Batch Extraction with LM Studio (with Live Countdown & Progress Bar)
  const handleRunExtraction = async () => {
    if (!activeDoc) {
      alert('Please upload or select a PDF document first.');
      return;
    }
    if (!spreadsheet || extractions.length === 0) {
      alert('Please upload a coding form or load sample prompts first.');
      return;
    }

    setIsExtracting(true);
    setExtractError(null);

    const count = extractions.length;
    const batchSize = 6;
    const totalBatches = Math.ceil(count / batchSize);
    // Estimate: first batch ~110s (cold KV), subsequent ~5s (cached)
    const estSeconds = Math.max(20, Math.round(110 + (totalBatches - 1) * 8));
    setCountdownSeconds(estSeconds);
    setElapsedSeconds(0);
    setExtractionProgress(4);
    setExtractionPhase('Connecting to LM Studio & sending document...');

    const startTime = Date.now();
    let completedBatches = 0;

    const timerInterval = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);
      const remaining = Math.max(1, estSeconds - elapsed);
      setCountdownSeconds(remaining);

      // Progress = batch-based + smooth fill within current batch
      const batchPct = (completedBatches / totalBatches) * 90;
      const withinBatchPct = completedBatches < totalBatches
        ? Math.min(90 / totalBatches, (elapsed / Math.max(1, estSeconds)) * 90 - batchPct)
        : 0;
      const pct = Math.min(95, Math.round(4 + batchPct + withinBatchPct));
      setExtractionProgress(pct);

      if (completedBatches === 0) {
        setExtractionPhase(`Prefilling document context in ${selectedModel?.split('/').pop() ?? 'local LLM'}...`);
      } else {
        setExtractionPhase(`Extracting batch ${completedBatches + 1} / ${totalBatches} — using cached context...`);
      }
    }, 1000);

    try {
      const payload = {
        pdf_file_id: activeDoc.file_id,
        prompts: extractions.map(e => ({ id: e.prompt_id, text: e.prompt })),
        base_url: baseUrl,
        model: selectedModel || (health?.models?.[0]),
        temperature: temperature
      };

      const res = await fetch('/api/extract/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(errData.detail || 'Extraction stream failed to start');
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const accumulatedResults: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines (each event ends with \n\n)
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6);
          if (!jsonStr) continue;

          let event: any;
          try { event = JSON.parse(jsonStr); } catch { continue; }

          if (event.type === 'start') {
            setExtractionPhase(`Processing ${event.total_prompts} variables in ${event.total_batches} batches...`);
          } else if (event.type === 'batch_done') {
            completedBatches = event.batch_index + 1;
            const batchResults: any[] = event.results ?? [];
            accumulatedResults.push(...batchResults);

            // Live-update UI cards as each batch arrives
            setExtractions(prev => prev.map(item => {
              const match = batchResults.find((r: any) => r.prompt_id === item.prompt_id);
              if (match) {
                return {
                  ...item,
                  answer: match.answer || 'Not reported in text',
                  source_quote: match.source_quote || null,
                  page_number: match.page_number ?? null,
                  confidence: match.confidence || 'medium',
                  is_recorded: false
                };
              }
              return item;
            }));

            setExtractionProgress(Math.min(95, Math.round(4 + (completedBatches / totalBatches) * 90)));
            setExtractionPhase(
              completedBatches < totalBatches
                ? `Batch ${completedBatches}/${totalBatches} done — extracting next batch...`
                : 'Finalising extraction & saving to database...'
            );
          } else if (event.type === 'done') {
            // Finished
            clearInterval(timerInterval);
            setExtractionProgress(100);
            setCountdownSeconds(0);
            setExtractionPhase('Extraction complete! All results saved to SQLite.');
            refreshDocuments(activeDoc.file_id);
            showNotification(`Extracted ${event.total} variables & saved to database!`);
            setTimeout(() => {
              setIsExtracting(false);
              setExtractionProgress(0);
            }, 900);
          } else if (event.type === 'error') {
            throw new Error(event.detail || 'Streaming extraction error');
          }
        }
      }
    } catch (err: any) {
      clearInterval(timerInterval);
      setExtractError(err.message);
      setIsExtracting(false);
      setExtractionProgress(0);
    }
  };

  // Re-extract a single variable prompt
  const handleReExtractSingle = async (item: ExtractionItem) => {
    if (!activeDoc) return;
    setReExtractingPromptId(item.prompt_id);
    try {
      const payload = {
        pdf_file_id: activeDoc.file_id,
        prompt: { id: item.prompt_id, text: item.prompt },
        base_url: baseUrl,
        model: selectedModel || (health?.models?.[0]),
        temperature: temperature
      };

      const res = await fetch('/api/extract/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const r = data.result;
        setExtractions(prev => prev.map(e => {
          if (e.prompt_id === item.prompt_id) {
            return {
              ...e,
              answer: r.answer || '',
              source_quote: r.source_quote || null,
              page_number: r.page_number || null,
              confidence: r.confidence || 'medium'
            };
          }
          return e;
        }));
        showNotification(`Re-extracted variable #${item.prompt_id}`);
      }
    } catch (err: any) {
      alert(`Re-extraction failed: ${err.message}`);
    } finally {
      setReExtractingPromptId(null);
    }
  };

  // Inspect Source in PDF
  const handleInspectSource = async (page: number, quote: string) => {
    setTargetPage(page);
    setActiveQuote(quote);

    // On mobile / small screens, automatically switch to PDF view so user can see highlight
    if (window.innerWidth < 1280 && workbenchView === 'form') {
      setWorkbenchView('pdf');
    }

    if (!activeDoc) return;

    try {
      const res = await fetch(
        `/api/pdf/${activeDoc.file_id}/highlight?page=${page}&quote=${encodeURIComponent(quote)}`
      );
      if (res.ok) {
        const data = await res.json();
        setActiveHighlights(data.matches || []);
      }
    } catch (err) {
      console.error('Highlight coordinates error:', err);
    }
  };

  // Update Answer Text and save to DB
  const handleUpdateAnswer = (promptId: number, newAnswer: string) => {
    setExtractions(prev => {
      const updated = prev.map(item => {
        if (item.prompt_id === promptId) {
          return { ...item, answer: newAnswer, is_recorded: false };
        }
        return item;
      });

      if (activeDoc) {
        const changedItem = updated.find(i => i.prompt_id === promptId);
        if (changedItem) {
          fetch('/api/extract/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              document_id: activeDoc.file_id,
              extractions: [changedItem]
            })
          }).catch(() => {});
        }
      }

      return updated;
    });
  };

  // Record Single Item
  const handleRecordSingle = async (item: ExtractionItem) => {
    if (!spreadsheet || !activeDoc) return;
    try {
      const res = await fetch(`/api/spreadsheet/${spreadsheet.file_id}/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: activeDoc.file_id,
          document_name: activeDoc.filename || 'Document',
          extractions: [item]
        })
      });
      if (res.ok) {
        setExtractions(prev => prev.map(e => 
          e.prompt_id === item.prompt_id ? { ...e, is_recorded: true } : e
        ));
        showNotification(`Recorded response for "${item.prompt.slice(0, 24)}..."`);
      }
    } catch (err: any) {
      alert(`Record error: ${err.message}`);
    }
  };

  // Record All Extractions to Row
  const handleRecordAll = async () => {
    if (!spreadsheet || !activeDoc) return;
    setIsRecordingAll(true);
    try {
      const res = await fetch(`/api/spreadsheet/${spreadsheet.file_id}/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: activeDoc.file_id,
          document_name: activeDoc.filename || 'Document',
          extractions: extractions
        })
      });
      if (res.ok) {
        setExtractions(prev => prev.map(e => ({ ...e, is_recorded: true })));
        
        const prevRes = await fetch(`/api/spreadsheet/${spreadsheet.file_id}/preview`);
        if (prevRes.ok) {
          const freshData = await prevRes.json();
          setSpreadsheet(prev => prev ? { ...prev, records: freshData.records, row_count: freshData.row_count } : null);
        }
        await refreshDocuments(activeDoc.file_id);
        showNotification('Saved full row to spreadsheet & database successfully!');
      }
    } catch (err: any) {
      alert(`Record all error: ${err.message}`);
    } finally {
      setIsRecordingAll(false);
    }
  };

  // Delete Document
  const handleDeleteDoc = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this paper and its extractions from the database?')) return;
    try {
      const res = await fetch(`/api/pdf/${docId}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification('Document deleted from database.');
        const remaining = documents.filter(d => d.file_id !== docId);
        setDocuments(remaining);
        if (selectedDocId === docId) {
          setSelectedDocId(remaining.length > 0 ? remaining[0].file_id : null);
        }
      }
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  // Navigation between documents in queue
  const handleSelectNextDoc = () => {
    if (documents.length === 0) return;
    const currentIndex = documents.findIndex(d => d.file_id === selectedDocId);
    const nextIndex = (currentIndex + 1) % documents.length;
    setSelectedDocId(documents[nextIndex].file_id);
  };

  const handleSelectPrevDoc = () => {
    if (documents.length === 0) return;
    const currentIndex = documents.findIndex(d => d.file_id === selectedDocId);
    const prevIndex = (currentIndex - 1 + documents.length) % documents.length;
    setSelectedDocId(documents[prevIndex].file_id);
  };

  const handleDownloadExcel = () => {
    if (!spreadsheet) return;
    window.open(`/api/spreadsheet/${spreadsheet.file_id}/download`, '_blank');
  };

  const handleDownloadTemplate = () => {
    window.open('/api/spreadsheet/template', '_blank');
  };

  // Delete a recorded row from coding form
  const handleDeleteRow = async (rowIndex: number) => {
    if (!spreadsheet) return;
    try {
      const res = await fetch(`/api/spreadsheet/${spreadsheet.file_id}/rows/${rowIndex}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Failed to delete row' }));
        throw new Error(err.detail || 'Failed to delete row');
      }
      const data = await res.json();
      setSpreadsheet(prev => prev ? {
        ...prev,
        row_count: data.total_rows,
        records: data.records
      } : null);
      showNotification(`Deleted row #${rowIndex + 1} from spreadsheet`);
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const recordedCount = extractions.filter(e => e.is_recorded).length;
  const currentDocIndex = documents.findIndex(d => d.file_id === selectedDocId);

  return (
    <div className="flex flex-col h-screen bg-[#f4f2f0] text-[#0c0a08] overflow-hidden font-normal">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        health={health}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onDownloadExcel={handleDownloadExcel}
        hasSpreadsheet={Boolean(spreadsheet)}
      />

      {/* Floating Notification Banner (Ramp Inverted Pill) */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2 bg-[#0c0a08] text-[#ffffff] rounded-[6px] border border-[#1a1919] flex items-center space-x-2 text-xs transition duration-200 shadow-md">
          <div className="w-1.5 h-1.5 rounded-full bg-[#e4f222]" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Content Viewports */}
      <main className="flex-1 overflow-hidden min-h-0 flex flex-col">
        {/* TAB 0: Landing Page Overview */}
        {activeTab === 'landing' && (
          <div className="flex-1 overflow-y-auto">
            <LandingPage
              onLaunchWorkbench={() => setActiveTab('workbench')}
              health={health}
              selectedModel={selectedModel}
            />
          </div>
        )}

        {/* TAB 1: Extraction Workbench */}
        {activeTab === 'workbench' && (
          <div className="flex-1 flex flex-col p-2 sm:p-3 md:p-4 min-h-0 max-w-[1920px] w-full mx-auto">
            {/* Mobile / Tablet View Switcher Pill (< 1280px) */}
            <div className="xl:hidden flex items-center justify-between bg-[#ffffff] border border-[#e5e7eb] rounded-[10px] p-1.5 mb-2 shrink-0">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setWorkbenchView('pdf')}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-[6px] text-xs transition ${
                    workbenchView === 'pdf'
                      ? 'bg-[#0c0a08] text-[#ffffff]'
                      : 'text-[#6d6c6b] hover:text-[#0c0a08] hover:bg-[#f4f2f0]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF Document {activeDoc ? `(${activeDoc.total_pages}p)` : ''}</span>
                </button>

                <button
                  onClick={() => setWorkbenchView('form')}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-[6px] text-xs transition ${
                    workbenchView === 'form'
                      ? 'bg-[#0c0a08] text-[#ffffff]'
                      : 'text-[#6d6c6b] hover:text-[#0c0a08] hover:bg-[#f4f2f0]'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Coding Form {extractions.length > 0 ? `(${recordedCount}/${extractions.length})` : ''}</span>
                </button>
              </div>

              <button
                onClick={() => setWorkbenchView('split')}
                className={`hidden md:flex items-center space-x-1 px-2.5 py-1 rounded-[6px] text-xs border ${
                  workbenchView === 'split'
                    ? 'bg-[#e4f222] text-[#0c0a08] border-[#0c0a08]'
                    : 'bg-[#f4f2f0] text-[#6d6c6b] border-[#e5e7eb]'
                }`}
                title="Split screen view"
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="text-[11px]">Split</span>
              </button>
            </div>

            {/* Split / Responsive Container */}
            <div className="flex-1 flex flex-col xl:flex-row gap-3 md:gap-4 min-h-0 w-full overflow-hidden">
              {/* Left Column: PDF Document Viewer & Document Queue */}
              <div className={`h-full flex flex-col min-h-0 min-w-0 ${
                workbenchView === 'form' ? 'hidden xl:flex' : 'flex'
              } ${
                workbenchView === 'split' ? 'w-full xl:w-[56%]' : 'w-full xl:w-[56%]'
              }`}>
                {activeDoc ? (
                  <div className="flex flex-col h-full space-y-2 min-h-0">
                    {/* Document Switcher & Info Bar */}
                    <div className="flex items-center justify-between px-3 md:px-4 py-2 bg-[#ffffff] border border-[#e5e7eb] rounded-[10px] text-xs shrink-0 gap-2">
                      {/* Document Selector Dropdown & Pagination */}
                      <div className="flex items-center space-x-2 min-w-0">
                        <FileText className="w-4 h-4 text-[#0c0a08] stroke-[1.5] shrink-0" />
                        
                        {documents.length > 1 ? (
                          <select
                            value={selectedDocId || ''}
                            onChange={(e) => setSelectedDocId(e.target.value)}
                            className="font-normal text-xs text-[#0c0a08] bg-transparent border-none focus:outline-none cursor-pointer truncate max-w-[140px] sm:max-w-[220px] md:max-w-[280px]"
                          >
                            {documents.map((d, idx) => (
                              <option key={d.file_id} value={d.file_id}>
                                {idx + 1}. {d.filename} ({d.total_pages}p) {d.status === 'recorded' ? '✓' : ''}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[#0c0a08] font-normal truncate max-w-[160px] sm:max-w-[260px]">
                            {activeDoc.filename}
                          </span>
                        )}

                        <span className="text-[#6d6c6b] text-[10px] font-mono shrink-0">
                          ({activeDoc.total_pages}p)
                        </span>

                        {/* Status Tag */}
                        <span className={`hidden sm:inline-block px-1.5 py-0.5 rounded-[4px] text-[10px] uppercase font-mono tracking-[0.18px] shrink-0 ${
                          activeDoc.status === 'recorded'
                            ? 'bg-[#e4f222] text-[#0c0a08]'
                            : activeDoc.status === 'extracted'
                            ? 'bg-[#f4f2f0] text-[#0c0a08] border border-[#e5e7eb]'
                            : 'bg-[#f4f2f0] text-[#6d6c6b]'
                        }`}>
                          {activeDoc.status || 'uploaded'}
                        </span>
                      </div>

                      {/* Action Buttons for Document Navigation & Upload */}
                      <div className="flex items-center space-x-1.5 shrink-0">
                        {documents.length > 1 && (
                          <div className="flex items-center space-x-0.5 bg-[#f4f2f0] p-0.5 rounded-[6px] border border-[#e5e7eb]">
                            <button
                              onClick={handleSelectPrevDoc}
                              className="p-1 hover:bg-[#ffffff] rounded-[4px] text-[#0c0a08] transition"
                              title="Previous Document"
                            >
                              <ChevronLeft className="w-3.5 h-3.5 stroke-[1.5]" />
                            </button>
                            <span className="px-1 text-[10px] font-mono text-[#6d6c6b]">
                              {currentDocIndex + 1}/{documents.length}
                            </span>
                            <button
                              onClick={handleSelectNextDoc}
                              className="p-1 hover:bg-[#ffffff] rounded-[4px] text-[#0c0a08] transition"
                              title="Next Document"
                            >
                              <ChevronRight className="w-3.5 h-3.5 stroke-[1.5]" />
                            </button>
                          </div>
                        )}

                        {/* Upload New Document Button */}
                        <label className="flex items-center space-x-1 text-[11px] text-[#0c0a08] hover:bg-[#f4f2f0] cursor-pointer px-2 py-1 rounded-[6px] border border-[#e5e7eb] transition whitespace-nowrap">
                          <Plus className="w-3 h-3 stroke-[2]" />
                          <span className="hidden sm:inline">Add PDF</span>
                          <input 
                            type="file" 
                            accept="application/pdf" 
                            className="hidden" 
                            onChange={(e) => {
                              if (e.target.files?.[0]) handlePdfUpload(e.target.files[0]);
                            }} 
                          />
                        </label>

                        {/* Delete Doc Button */}
                        <button
                          onClick={(e) => handleDeleteDoc(activeDoc.file_id, e)}
                          className="p-1 text-[#6d6c6b] hover:text-[#0c0a08] hover:bg-[#f4f2f0] rounded-[6px] border border-[#e5e7eb] transition"
                          title="Delete document from database"
                        >
                          <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-hidden">
                      <PDFViewer
                        fileUrl={`/api/pdf/${activeDoc.file_id}/file`}
                        targetPage={targetPage}
                        highlights={activeHighlights}
                        highlightQuote={activeQuote}
                        onPageChange={(p) => setTargetPage(p)}
                      />
                    </div>
                  </div>
                ) : (
                  /* PDF Upload Drop Zone (Ramp Content Card) */
                  <div className="h-full border border-[#e5e7eb] rounded-[16px] bg-[#ffffff] flex flex-col items-center justify-center p-6 text-center transition">
                    <div className="w-12 h-12 rounded-[12px] bg-[#f4f2f0] flex items-center justify-center text-[#0c0a08] mb-4">
                      <Upload className="w-6 h-6 stroke-[1.5]" />
                    </div>
                    <h3 className="text-base text-[#0c0a08] font-normal mb-1">Upload Academic Paper (PDF)</h3>
                    <p className="text-xs text-[#6d6c6b] max-w-sm mb-5 leading-relaxed">
                      Select a research study PDF to preview the document and run automated variable extraction with LM Studio.
                    </p>
                    <label className="px-5 py-2.5 rounded-[6px] bg-[#0c0a08] hover:bg-[#1a1919] text-[#ffffff] text-xs font-normal cursor-pointer transition">
                      Select PDF Document
                      <input 
                        type="file" 
                        accept="application/pdf" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files?.[0]) handlePdfUpload(e.target.files[0]);
                        }} 
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Right Column: Coding Form & LLM Extraction Workspace */}
              <div className={`h-full flex flex-col bg-[#ffffff] border border-[#e5e7eb] rounded-[16px] overflow-hidden min-h-0 min-w-0 ${
                workbenchView === 'pdf' ? 'hidden xl:flex' : 'flex'
              } ${
                workbenchView === 'split' ? 'w-full xl:w-[44%]' : 'w-full xl:w-[44%]'
              }`}>
                {/* Workspace Action Bar */}
                <div className="p-3 sm:p-4 border-b border-[#e5e7eb] bg-[#ffffff] flex flex-col space-y-3 shrink-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm text-[#0c0a08] font-normal flex items-center space-x-2 truncate">
                        <span>Coding Form Extraction</span>
                        {spreadsheet && (
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded-[6px] bg-[#f4f2f0] text-[#6d6c6b] border border-[#e5e7eb] shrink-0">
                            {recordedCount}/{extractions.length} Saved
                          </span>
                        )}
                      </h3>
                      <p className="text-[10px] uppercase tracking-[0.18px] text-[#6d6c6b] mt-0.5 truncate">
                        Human-in-the-loop review & SQLite persistence
                      </p>
                    </div>

                    {/* Coding Form Upload Pill */}
                    <label className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-[6px] border border-[#e5e7eb] bg-[#ffffff] hover:bg-[#f4f2f0] text-[#0c0a08] text-xs cursor-pointer transition shrink-0 whitespace-nowrap">
                      <FileSpreadsheet className="w-3.5 h-3.5 stroke-[1.5]" />
                      <span>{spreadsheet ? 'Replace Form' : 'Upload Form'}</span>
                      <input 
                        type="file" 
                        accept=".xlsx,.xls,.csv" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleFormUpload(e.target.files[0]);
                        }} 
                      />
                    </label>
                  </div>

                  {/* Primary Action Buttons — Ramp Design: Highlighter Yellow Primary + Outlined Secondary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {/* Primary CTA Button */}
                    <button
                      onClick={handleRunExtraction}
                      disabled={isExtracting || !activeDoc || extractions.length === 0}
                      className="flex items-center justify-center space-x-2 py-2 px-3 rounded-[6px] bg-[#e4f222] hover:bg-[#d8e61b] disabled:bg-[#f4f2f0] disabled:text-[#6d6c6b] disabled:border disabled:border-[#e5e7eb] disabled:cursor-not-allowed text-[#0c0a08] text-xs font-normal transition duration-150 cursor-pointer"
                    >
                      {isExtracting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin stroke-[2] shrink-0" />
                          <span className="truncate font-mono">Extracting (~{countdownSeconds}s)...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 stroke-[2] shrink-0" />
                          <span className="truncate">Extract with LM Studio</span>
                        </>
                      )}
                    </button>

                    {/* Ramp Outlined Secondary Button */}
                    <button
                      onClick={handleRecordAll}
                      disabled={isRecordingAll || isExtracting || !spreadsheet || extractions.length === 0 || !activeDoc}
                      className="flex items-center justify-center space-x-2 py-2 px-3 rounded-[6px] border border-[#0c0a08] bg-transparent hover:bg-[#f4f2f0] disabled:border-[#e5e7eb] disabled:text-[#6d6c6b] disabled:bg-[#ffffff] disabled:cursor-not-allowed text-[#0c0a08] text-xs font-normal transition duration-150 cursor-pointer"
                    >
                      {isRecordingAll ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin stroke-[1.5] shrink-0" />
                          <span className="truncate">Saving to DB...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[2] shrink-0" />
                          <span className="truncate">Record Full Row</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Ramp Live Progress Bar & Countdown Card */}
                  {isExtracting && (
                    <div className="p-3.5 rounded-[12px] bg-[#1a1919] text-[#ffffff] border border-[#0c0a08] space-y-2.5 shadow-sm transition-all animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className="relative flex h-2 w-2 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e4f222] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#e4f222]"></span>
                          </span>
                          <span className="text-xs text-[#ffffff] font-normal tracking-tight truncate">
                            Extracting {extractions.length} Variables
                          </span>
                        </div>

                        {/* Live Countdown & Elapsed Timer */}
                        <div className="flex items-center space-x-1.5 font-mono text-xs shrink-0">
                          <span className="text-[#e4f222] text-[11px] font-normal">
                            ⏱ {countdownSeconds > 0 ? `~${countdownSeconds}s remaining` : 'Finalizing...'}
                          </span>
                          <span className="text-[#6d6c6b] text-[10px]">
                            ({elapsedSeconds}s)
                          </span>
                        </div>
                      </div>

                      {/* Ramp Chartreuse Highlighter Yellow Progress Bar */}
                      <div className="w-full bg-[#2d2c2b] h-2 rounded-full overflow-hidden p-0.5">
                        <div 
                          className="bg-[#e4f222] h-full rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${Math.min(100, Math.max(5, extractionProgress))}%` }}
                        />
                      </div>

                      {/* Status message and percentage */}
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#6d6c6b] truncate max-w-[80%] font-mono text-[10px]">
                          {extractionPhase || 'Processing neural weights in LM Studio...'}
                        </span>
                        <span className="font-mono text-[#ffffff] text-[11px] font-normal">
                          {extractionProgress}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Error Banner */}
                  {extractError && (
                    <div className="p-3 bg-[#ffffff] border border-[#0c0a08] rounded-[8px] text-[#0c0a08] text-xs flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-normal">Extraction Notice</p>
                        <p className="text-[11px] text-[#6d6c6b] mt-0.5">{extractError}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Scrollable Prompts List */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-[#f4f2f0]">
                  {extractions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-[#ffffff] rounded-[12px] border border-[#e5e7eb]">
                      <div className="w-10 h-10 rounded-[8px] bg-[#f4f2f0] flex items-center justify-center text-[#0c0a08] mb-3">
                        <FileSpreadsheet className="w-5 h-5 stroke-[1.5]" />
                      </div>
                      <p className="text-sm font-normal text-[#0c0a08]">No Coding Form Loaded</p>
                      <p className="text-xs text-[#6d6c6b] max-w-xs mt-1 mb-4 leading-relaxed">
                        Upload an Excel or CSV file where columns represent your extraction variables.
                      </p>
                      <div className="flex items-center space-x-2">
                        <label className="px-3.5 py-1.5 bg-[#0c0a08] hover:bg-[#1a1919] text-[#ffffff] text-xs rounded-[6px] cursor-pointer transition">
                          Upload Form (.xlsx)
                          <input 
                            type="file" 
                            accept=".xlsx,.xls,.csv" 
                            className="hidden" 
                            onChange={(e) => {
                              if (e.target.files?.[0]) handleFormUpload(e.target.files[0]);
                            }} 
                          />
                        </label>
                        <button
                          onClick={handleDownloadTemplate}
                          className="px-3 py-1.5 bg-[#ffffff] hover:bg-[#f4f2f0] text-[#0c0a08] text-xs rounded-[6px] border border-[#e5e7eb] transition"
                        >
                          Get Template
                        </button>
                      </div>
                    </div>
                  ) : (
                    extractions.map((item, idx) => (
                      <ExtractionCard
                        key={item.prompt_id}
                        item={item}
                        index={idx}
                        onUpdateAnswer={handleUpdateAnswer}
                        onInspectSource={handleInspectSource}
                        onRecordSingle={handleRecordSingle}
                        onReExtractSingle={handleReExtractSingle}
                        isReExtracting={reExtractingPromptId === item.prompt_id}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Spreadsheet Data View */}
        {activeTab === 'spreadsheet' && (
          <div className="max-w-[1920px] mx-auto w-full h-full p-2 sm:p-4">
            <SpreadsheetView
              spreadsheet={spreadsheet}
              onDownload={handleDownloadExcel}
              onUploadForm={handleFormUpload}
              onDownloadTemplate={handleDownloadTemplate}
              onDeleteRow={handleDeleteRow}
            />
          </div>
        )}

        {/* TAB 3: Settings View */}
        {activeTab === 'settings' && (
          <div className="h-full flex items-center justify-center p-4">
            <div className="w-full max-w-xl">
              <SettingsModal
                isOpen={true}
                onClose={() => setActiveTab('workbench')}
                health={health}
                baseUrl={baseUrl}
                setBaseUrl={setBaseUrl}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                temperature={temperature}
                setTemperature={setTemperature}
                onRefreshHealth={fetchHealth}
                isChecking={isCheckingHealth}
              />
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal (Overlay) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        health={health}
        baseUrl={baseUrl}
        setBaseUrl={setBaseUrl}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        temperature={temperature}
        setTemperature={setTemperature}
        onRefreshHealth={fetchHealth}
        isChecking={isCheckingHealth}
      />
    </div>
  );
};

export default App;
