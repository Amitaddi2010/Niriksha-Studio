export interface PromptItem {
  id: number;
  text: string;
  description?: string;
  column_index?: number;
}

export interface ExtractionItem {
  prompt_id: number;
  prompt: string;
  answer: string;
  source_quote?: string | null;
  page_number?: number | null;
  confidence?: 'high' | 'medium' | 'low';
  is_recorded?: boolean;
}

export interface LMStudioHealth {
  status: 'online' | 'offline' | 'warning';
  connected: boolean;
  latency_ms?: number | null;
  models: string[];
  base_url: string;
  error?: string | null;
}

export interface PDFDoc {
  id?: string;
  file_id: string;
  filename: string;
  total_pages: number;
  title?: string;
  author?: string;
  saved_path?: string;
  status?: string;
  extraction_count?: number;
  created_at?: string;
}

export interface SpreadsheetForm {
  file_id: string;
  filename: string;
  columns: string[];
  prompts: PromptItem[];
  row_count: number;
  records: Record<string, string>[];
}

export interface HighlightBox {
  x: number;
  y: number;
  width: number;
  height: number;
  raw_x0?: number;
  raw_y0?: number;
  raw_x1?: number;
  raw_y1?: number;
}
