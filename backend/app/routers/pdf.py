from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Depends
from fastapi.responses import FileResponse
from pathlib import Path
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.services.pdf_service import PDFService
from app.config import UPLOAD_DIR
from app.db.session import get_db
from app.db import models

router = APIRouter(prefix="/api/pdf", tags=["PDF"])
pdf_service = PDFService(UPLOAD_DIR)

def _find_pdf_path(file_id: str) -> Path:
    matches = list(UPLOAD_DIR.glob(f"{file_id}_*.pdf"))
    if not matches:
        raise HTTPException(status_code=404, detail="PDF file not found on disk")
    return matches[0]

@router.get("/list")
async def list_documents(db: Session = Depends(get_db)):
    """Retrieve all uploaded documents stored in the database."""
    docs = db.query(models.Document).order_by(models.Document.created_at.desc()).all()
    results = []
    for d in docs:
        results.append({
            "id": d.id,
            "file_id": d.id,
            "filename": d.filename,
            "file_size": d.file_size,
            "total_pages": d.total_pages,
            "title": d.title,
            "author": d.author,
            "status": d.status,
            "created_at": d.created_at.isoformat() if d.created_at else None,
            "extraction_count": len(d.extractions)
        })
    return {"documents": results}

@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload PDF document, save to storage, and persist to database."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    info = pdf_service.save_pdf(contents, file.filename)
    
    # Store or update in database
    db_doc = models.Document(
        id=info["file_id"],
        project_id="default",
        filename=info["filename"],
        file_path=info["saved_path"],
        file_size=info.get("file_size", len(contents)),
        total_pages=info.get("total_pages", 1),
        title=info.get("title") or info["filename"],
        author=info.get("author") or "Unknown",
        status="uploaded"
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)

    return info

@router.get("/{file_id}/extractions")
async def get_document_extractions(file_id: str, db: Session = Depends(get_db)):
    """Retrieve any saved extractions for this document from the database."""
    doc = db.query(models.Document).filter_by(id=file_id).first()
    if not doc:
        # Check if file exists on disk
        _find_pdf_path(file_id)
        return {"document_id": file_id, "extractions": []}

    extractions = db.query(models.Extraction).filter_by(document_id=file_id).order_by(models.Extraction.prompt_id.asc()).all()
    items = []
    for e in extractions:
        items.append({
            "prompt_id": e.prompt_id,
            "prompt": e.prompt_text,
            "answer": e.answer,
            "source_quote": e.source_quote,
            "page_number": e.page_number,
            "confidence": e.confidence,
            "is_recorded": e.is_recorded
        })
    return {
        "document_id": file_id,
        "status": doc.status,
        "extractions": items
    }

@router.get("/{file_id}/pages")
async def get_pdf_pages(file_id: str):
    """Retrieve text extracted from each page."""
    path = _find_pdf_path(file_id)
    pages = pdf_service.extract_pages(path)
    return {"file_id": file_id, "total_pages": len(pages), "pages": pages}

@router.get("/{file_id}/file")
async def stream_pdf_file(file_id: str):
    """Serve the raw PDF file for in-browser PDF.js vector rendering."""
    path = _find_pdf_path(file_id)
    return FileResponse(
        path=path,
        media_type="application/pdf",
        filename=path.name.split("_", 1)[-1]
    )

@router.get("/{file_id}/highlight")
async def get_highlight_coords(
    file_id: str,
    page: int = Query(..., ge=1),
    quote: str = Query(...)
):
    """Search for the source quote on the specified page and return bounding boxes."""
    path = _find_pdf_path(file_id)
    coords = pdf_service.search_quote_coordinates(path, page, quote)
    return {"page": page, "quote": quote, "matches": coords}

@router.delete("/{file_id}")
async def delete_document(file_id: str, db: Session = Depends(get_db)):
    """Delete document from database and disk."""
    doc = db.query(models.Document).filter_by(id=file_id).first()
    if doc:
        db.delete(doc)
        db.commit()
    
    try:
        path = _find_pdf_path(file_id)
        if path.exists():
            path.unlink()
    except Exception:
        pass

    return {"status": "deleted", "file_id": file_id}
