from fastapi import APIRouter, HTTPException, Body, Depends, Request
from fastapi.responses import StreamingResponse
from typing import Dict, Any, List, AsyncGenerator
from sqlalchemy.orm import Session
import json

from app.services.lmstudio_service import LMStudioService
from app.services.pdf_service import PDFService
from app.config import UPLOAD_DIR, DEFAULT_LM_STUDIO_URL
from app.db.session import get_db, SessionLocal
from app.db import models

router = APIRouter(prefix="/api/extract", tags=["Extraction"])
llm_service = LMStudioService(DEFAULT_LM_STUDIO_URL)
pdf_service = PDFService(UPLOAD_DIR)

def _find_pdf_path(file_id: str):
    matches = list(UPLOAD_DIR.glob(f"{file_id}_*.pdf"))
    if not matches:
        raise HTTPException(status_code=404, detail="PDF not found on disk")
    return matches[0]


async def _stream_extraction(
    pdf_file_id: str,
    prompts: List[Dict[str, Any]],
    base_url: str,
    model: str,
    temperature: float
) -> AsyncGenerator[str, None]:
    """
    SSE generator: streams one JSON event per batch as results arrive.
    Events:
      { "type": "batch_done", "batch_index": N, "total_batches": T, "results": [...] }
      { "type": "done", "total": N }
      { "type": "error", "detail": "..." }
    """
    db = SessionLocal()
    try:
        matches = list(UPLOAD_DIR.glob(f"{pdf_file_id}_*.pdf"))
        if not matches:
            yield f"data: {json.dumps({'type': 'error', 'detail': 'PDF not found on disk'})}\n\n"
            return

        pages = pdf_service.extract_pages(matches[0])
        doc_text = llm_service._prepare_document_text(pages)

        batch_size = 6
        batches = [prompts[i:i + batch_size] for i in range(0, len(prompts), batch_size)]
        total_batches = len(batches)
        all_results = []

        # Send heartbeat so browser knows connection is alive
        yield f"data: {json.dumps({'type': 'start', 'total_batches': total_batches, 'total_prompts': len(prompts)})}\n\n"

        import httpx
        url = (base_url or DEFAULT_LM_STUDIO_URL).rstrip("/")
        chat_endpoint = f"{url}/chat/completions"

        async with httpx.AsyncClient(timeout=300.0) as client:
            for b_idx, batch in enumerate(batches):
                try:
                    batch_res = await llm_service._extract_batch(
                        client=client,
                        chat_endpoint=chat_endpoint,
                        model=model,
                        doc_text=doc_text,
                        batch=batch,
                        temperature=temperature
                    )
                except Exception as e:
                    batch_res = [
                        {
                            "prompt_id": p.get("id", idx + 1),
                            "prompt": p.get("text", ""),
                            "answer": "Not reported in text",
                            "source_quote": None,
                            "page_number": None,
                            "confidence": "low",
                            "error": str(e)
                        }
                        for idx, p in enumerate(batch)
                    ]

                all_results.extend(batch_res)

                # Persist this batch to DB immediately
                prompt_lookup = {p["id"]: p.get("text", "") for p in prompts}
                for r in batch_res:
                    pid = r.get("prompt_id")
                    p_text = prompt_lookup.get(pid, f"Prompt {pid}")
                    existing = db.query(models.Extraction).filter_by(
                        document_id=pdf_file_id,
                        prompt_id=pid
                    ).first()
                    if existing:
                        existing.prompt_text = p_text
                        existing.answer = r.get("answer", "")
                        existing.source_quote = r.get("source_quote")
                        existing.page_number = r.get("page_number")
                        existing.confidence = r.get("confidence", "medium")
                        existing.is_recorded = False
                    else:
                        db.add(models.Extraction(
                            document_id=pdf_file_id,
                            prompt_id=pid,
                            prompt_text=p_text,
                            answer=r.get("answer", ""),
                            source_quote=r.get("source_quote"),
                            page_number=r.get("page_number"),
                            confidence=r.get("confidence", "medium"),
                            is_recorded=False
                        ))
                db.commit()

                # Stream batch results to frontend
                yield f"data: {json.dumps({'type': 'batch_done', 'batch_index': b_idx, 'total_batches': total_batches, 'results': batch_res}, ensure_ascii=False)}\n\n"

        # Update document status
        doc = db.query(models.Document).filter_by(id=pdf_file_id).first()
        if doc:
            doc.status = "extracted"
        db.commit()

        yield f"data: {json.dumps({'type': 'done', 'total': len(all_results)})}\n\n"

    except Exception as e:
        db.rollback()
        yield f"data: {json.dumps({'type': 'error', 'detail': str(e)})}\n\n"
    finally:
        db.close()


@router.post("/stream")
async def stream_extraction(request: Request, payload: Dict[str, Any] = Body(...)):
    """
    SSE streaming extraction endpoint.
    Streams batch results to the frontend as they arrive, preventing browser timeouts
    on long-running local LLM calls.
    """
    pdf_file_id = payload.get("pdf_file_id")
    prompts = payload.get("prompts", [])
    base_url = payload.get("base_url", DEFAULT_LM_STUDIO_URL)
    model = payload.get("model")
    temperature = float(payload.get("temperature", 0.1))

    if not pdf_file_id:
        raise HTTPException(status_code=400, detail="Missing pdf_file_id")
    if not prompts:
        raise HTTPException(status_code=400, detail="No prompts provided for extraction")
    if not model:
        health = await llm_service.check_health(base_url)
        if not health["connected"] or not health["models"]:
            raise HTTPException(
                status_code=400,
                detail="No model selected and LM Studio has no loaded models or is unreachable."
            )
        model = health["models"][0]

    return StreamingResponse(
        _stream_extraction(pdf_file_id, prompts, base_url, model, temperature),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )


@router.post("/run")
async def run_extraction(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    """Run extraction (non-streaming fallback). Use /stream for long documents."""
    pdf_file_id = payload.get("pdf_file_id")
    prompts = payload.get("prompts", [])
    base_url = payload.get("base_url", DEFAULT_LM_STUDIO_URL)
    model = payload.get("model")
    temperature = float(payload.get("temperature", 0.1))

    if not pdf_file_id:
        raise HTTPException(status_code=400, detail="Missing pdf_file_id")
    if not prompts:
        raise HTTPException(status_code=400, detail="No prompts provided for extraction")
    if not model:
        health = await llm_service.check_health(base_url)
        if not health["connected"] or not health["models"]:
            raise HTTPException(
                status_code=400,
                detail="No model selected and LM Studio has no loaded models or is unreachable."
            )
        model = health["models"][0]

    pdf_path = _find_pdf_path(pdf_file_id)
    pages = pdf_service.extract_pages(pdf_path)

    try:
        results = await llm_service.extract_data(
            base_url=base_url,
            model=model,
            pages=pages,
            prompts=prompts,
            temperature=temperature
        )

        prompt_lookup = {p["id"]: p.get("text", "") for p in prompts}
        for r in results:
            pid = r.get("prompt_id")
            p_text = prompt_lookup.get(pid, f"Prompt {pid}")
            existing = db.query(models.Extraction).filter_by(
                document_id=pdf_file_id,
                prompt_id=pid
            ).first()
            if existing:
                existing.prompt_text = p_text
                existing.answer = r.get("answer", "")
                existing.source_quote = r.get("source_quote")
                existing.page_number = r.get("page_number")
                existing.confidence = r.get("confidence", "medium")
                existing.is_recorded = False
            else:
                db.add(models.Extraction(
                    document_id=pdf_file_id,
                    prompt_id=pid,
                    prompt_text=p_text,
                    answer=r.get("answer", ""),
                    source_quote=r.get("source_quote"),
                    page_number=r.get("page_number"),
                    confidence=r.get("confidence", "medium"),
                    is_recorded=False
                ))

        doc = db.query(models.Document).filter_by(id=pdf_file_id).first()
        if doc and doc.status == "uploaded":
            doc.status = "extracted"
        db.commit()

        return {"status": "success", "model_used": model, "document_id": pdf_file_id, "extractions": results}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")

@router.post("/single")
async def run_single_extraction(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    """Re-extract a single prompt and update the database."""
    pdf_file_id = payload.get("pdf_file_id")
    prompt = payload.get("prompt")
    base_url = payload.get("base_url", DEFAULT_LM_STUDIO_URL)
    model = payload.get("model")
    temperature = float(payload.get("temperature", 0.1))

    if not pdf_file_id or not prompt:
        raise HTTPException(status_code=400, detail="pdf_file_id and prompt are required.")

    pdf_path = _find_pdf_path(pdf_file_id)
    pages = pdf_service.extract_pages(pdf_path)

    try:
        result = await llm_service.extract_single(
            base_url=base_url,
            model=model,
            pages=pages,
            prompt_item=prompt,
            temperature=temperature
        )

        pid = prompt.get("id")
        existing = db.query(models.Extraction).filter_by(
            document_id=pdf_file_id,
            prompt_id=pid
        ).first()

        if existing:
            existing.answer = result.get("answer", "")
            existing.source_quote = result.get("source_quote")
            existing.page_number = result.get("page_number")
            existing.confidence = result.get("confidence", "medium")
            existing.is_recorded = False
        else:
            db_extraction = models.Extraction(
                document_id=pdf_file_id,
                prompt_id=pid,
                prompt_text=prompt.get("text", ""),
                answer=result.get("answer", ""),
                source_quote=result.get("source_quote"),
                page_number=result.get("page_number"),
                confidence=result.get("confidence", "medium"),
                is_recorded=False
            )
            db.add(db_extraction)

        db.commit()
        return {"status": "success", "result": result}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Single extraction failed: {str(e)}")

@router.post("/save")
async def save_human_extractions(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    """Save manual human edits/adjustments to extractions in the database."""
    document_id = payload.get("document_id")
    extractions = payload.get("extractions", [])

    if not document_id:
        raise HTTPException(status_code=400, detail="Missing document_id")

    for item in extractions:
        pid = item.get("prompt_id")
        existing = db.query(models.Extraction).filter_by(
            document_id=document_id,
            prompt_id=pid
        ).first()

        if existing:
            existing.answer = item.get("answer", "")
            existing.source_quote = item.get("source_quote")
            existing.page_number = item.get("page_number")
            existing.confidence = item.get("confidence", existing.confidence)
            existing.is_recorded = item.get("is_recorded", existing.is_recorded)
        else:
            db_ext = models.Extraction(
                document_id=document_id,
                prompt_id=pid,
                prompt_text=item.get("prompt", ""),
                answer=item.get("answer", ""),
                source_quote=item.get("source_quote"),
                page_number=item.get("page_number"),
                confidence=item.get("confidence", "manual"),
                is_recorded=item.get("is_recorded", False)
            )
            db.add(db_ext)

    db.commit()
    return {"status": "saved", "count": len(extractions)}
