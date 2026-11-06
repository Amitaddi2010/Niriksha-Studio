# Niriksha Studio

A modern, high-performance web platform for systematic literature reviews, meta-analyses, and scientific data extraction powered by **Local LLMs via LM Studio**.

Inspired by research on LLMs with human-in-the-loop validation for systematic review data extraction (Noah Schroeder et al., arXiv:2501.11840).

---

## Key Features

- **100% Local & Private (LM Studio)**: Connects directly to LM Studio's OpenAI-compatible server (`http://localhost:1234/v1`). Your research data and manuscripts never leave your machine.
- **Ramp-Inspired Editorial Design**: Clean typography, high-contrast readability, and responsive split-screen workbench layout.
- **SSE Streaming Extraction**: Real-time batch extraction over Server-Sent Events with live countdown and progress tracking to avoid HTTP/TCP timeouts on large PDF papers.
- **Strict Structured JSON Extraction**: Multi-tier resilient parsing ensures deterministic outputs for answers, verbatim quotes, and page citations.
- **Real-Time Vector PDF Viewer**: Powered by Mozilla PDF.js. Crisp zooming, page jumping, and text selection without slow disk rasterization.
- **Interactive Citation Auditing**: Clicking **"Source"** on any extraction card auto-scrolls the PDF viewer to the cited page and visually highlights the exact supporting quote.
- **Human-in-the-Loop Verification**: Review, adjust, and approve extractions before committing them.
- **Spreadsheet Sync & Management**: Upload any `.xlsx`, `.xls`, or `.csv` coding form. Each analyzed PDF writes cleanly into a target row with one click. Supports row deletion to eliminate duplicate entries.
- **Persistent SQLite Database**: Stores all documents, coding forms, and extractions with relational integrity.
- **Network & Remote Ready (Tailscale)**: Host bound to `0.0.0.0` for access across your local LAN or Tailscale private mesh network.

---

## Quick Start

### 1. Launch LM Studio
1. Open **LM Studio**.
2. Download any capable instruction-tuned model (e.g., `Llama 3.3 70B`, `Qwen 2.5 14B/32B`, `Mistral 7B`, or `openai/gpt-oss-20b`).
3. Click the **Developer / Local Server** tab (`<->` icon on the left navigation bar).
4. Select your model and click **Start Server** (default port `1234`).

### 2. Launch Niriksha Studio
Simply double-click:
```bat
run.bat
```
This activates the backend virtual environment, starts Uvicorn, and opens `http://localhost:8000` in your browser.

*(For developers wanting live frontend hot reload, run `start_dev.bat` to run Vite on `:5173` with FastAPI on `:8000`).*

---

## Workflow Guide

1. **Check Connection**: Verify the LM Studio indicator in the header is green with active ping latency.
2. **Load Coding Form**: Click **"Upload Form"** to upload your Excel or CSV spreadsheet.
3. **Upload Academic Paper (PDF)**: Select or drag and drop your study PDF into the document pane.
4. **Extract with LM Studio**: Click **"Extract with LM Studio"**. Batches stream in real-time, populating cards as they complete.
5. **Audit & Record**: Click **"Source"** to jump to the cited page and verify quotes. Adjust answers if needed, then click **"Record Full Row"**.
6. **Spreadsheet View**: Inspect recorded rows, search variables, delete duplicates, or export the completed `.xlsx` file.

---

## Tech Stack

- **Backend**: Python 3.11+, FastAPI, SQLAlchemy 2.0, SQLite, PyMuPDF (`pymupdf`), openpyxl, pandas, httpx
- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Mozilla PDF.js
- **LLM Backend**: LM Studio Local Server (`http://localhost:1234/v1`)
