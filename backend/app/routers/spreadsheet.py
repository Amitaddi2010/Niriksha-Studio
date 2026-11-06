import json
from fastapi import APIRouter, UploadFile, File, HTTPException, Body, Depends
from fastapi.responses import FileResponse
from pathlib import Path
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.services.spreadsheet_service import SpreadsheetService
from app.config import UPLOAD_DIR, EXPORT_DIR
from app.db.session import get_db
from app.db import models

router = APIRouter(prefix="/api/spreadsheet", tags=["Spreadsheet"])
sheet_service = SpreadsheetService(UPLOAD_DIR, EXPORT_DIR)

def _find_sheet_path(file_id: str) -> Path:
    matches = list(UPLOAD_DIR.glob(f"{file_id}_*.*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Coding form not found on disk")
    return matches[0]

@router.get("/active")
async def get_active_coding_form(db: Session = Depends(get_db)):
    """Retrieve the currently active coding form and prompts from the database."""
    form = db.query(models.CodingForm).filter_by(is_active=True).first()
    if not form:
        return {"active": False, "form": None}
    
    prompts = [
        {"id": p.id, "text": p.text, "field_name": p.field_name, "prompt_order": p.prompt_order}
        for p in form.prompts
    ]

    # Try to get latest preview from disk
    sheet_data = {}
    try:
        path = _find_sheet_path(form.id)
        sheet_data = sheet_service.parse_coding_form(path)
    except Exception:
        pass

    return {
        "active": True,
        "form": {
            "file_id": form.id,
            "filename": form.filename,
            "row_count": sheet_data.get("row_count", form.row_count),
            "columns": sheet_data.get("columns", [p["text"] for p in prompts]),
            "prompts": prompts,
            "records": sheet_data.get("records", [])
        }
    }

@router.post("/upload")
async def upload_coding_form(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload an existing Excel or CSV coding form and persist to database."""
    ext = Path(file.filename).suffix.lower()
    if ext not in [".xlsx", ".xls", ".csv"]:
        raise HTTPException(status_code=400, detail="Only Excel (.xlsx/.xls) or CSV files supported.")

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    parsed = sheet_service.save_form(contents, file.filename)
    file_id = parsed["file_id"]

    # Deactivate previous active forms
    db.query(models.CodingForm).filter_by(project_id="default").update({"is_active": False})

    # Create new coding form in DB
    new_form = models.CodingForm(
        id=file_id,
        project_id="default",
        filename=parsed["filename"],
        file_path=parsed["saved_path"],
        row_count=parsed.get("row_count", 0),
        is_active=True
    )
    db.add(new_form)
    db.flush()

    # Store prompts
    for idx, prompt_item in enumerate(parsed.get("prompts", [])):
        p_record = models.Prompt(
            coding_form_id=file_id,
            prompt_order=idx + 1,
            text=prompt_item["text"],
            field_name=f"col_{idx + 1}"
        )
        db.add(p_record)

    db.commit()
    db.refresh(new_form)

    # Return refreshed prompts with auto-assigned IDs
    parsed["prompts"] = [
        {"id": p.id, "text": p.text, "column_index": p.prompt_order - 1}
        for p in new_form.prompts
    ]
    return parsed

@router.get("/template")
async def get_default_template():
    """Download default systematic review extraction form template."""
    template_path = EXPORT_DIR / "AIDE_Default_Coding_Form.xlsx"
    sheet_service.generate_default_template(template_path)
    return FileResponse(
        path=template_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="AIDE_Systematic_Review_Template.xlsx"
    )

@router.get("/{file_id}/preview")
async def preview_spreadsheet(file_id: str):
    """View columns and existing records in the coding form."""
    path = _find_sheet_path(file_id)
    return sheet_service.parse_coding_form(path)

@router.post("/{file_id}/record")
async def record_row(
    file_id: str, 
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """Record verified responses for the current PDF into spreadsheet file and database."""
    path = _find_sheet_path(file_id)
    extractions = payload.get("extractions", [])
    document_name = payload.get("document_name", "Untitled")
    document_id = payload.get("document_id")
    target_row = payload.get("target_row")

    # 1. Update spreadsheet file on disk
    result = sheet_service.record_row(
        file_path=path,
        extractions=extractions,
        document_name=document_name,
        target_row=target_row
    )

    # 2. Persist in database as ProjectRecord
    row_data = {}
    for item in extractions:
        key = item.get("prompt") or str(item.get("prompt_id"))
        row_data[key] = item.get("answer", "")
    
    record = models.ProjectRecord(
        project_id="default",
        document_name=document_name,
        row_index=result.get("row_number", 1),
        data_json=json.dumps(row_data)
    )
    db.add(record)

    # 3. Mark extractions in database as recorded
    if document_id:
        doc = db.query(models.Document).filter_by(id=document_id).first()
        if doc:
            doc.status = "recorded"
        
        db.query(models.Extraction).filter_by(document_id=document_id).update({"is_recorded": True})

    db.commit()
    return result

@router.delete("/{file_id}/rows/{row_index}")
async def delete_row(file_id: str, row_index: int, db: Session = Depends(get_db)):
    """
    Delete a specific row from the coding form file and update database records.
    row_index is 0-based index of the data records.
    """
    path = _find_sheet_path(file_id)
    try:
        result = sheet_service.delete_row(path, row_index)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete row from file: {str(e)}")

    # Update row_count on CodingForm model if present
    form = db.query(models.CodingForm).filter_by(id=file_id).first()
    if form:
        form.row_count = result.get("total_rows", 0)
        db.commit()

    # Re-parse preview to return updated data
    preview = sheet_service.parse_coding_form(path)
    return {
        "status": "success",
        "message": f"Row {row_index + 1} deleted successfully",
        "total_rows": result.get("total_rows", 0),
        "records": preview.get("records", [])
    }

@router.get("/records/all")
async def list_all_records(db: Session = Depends(get_db)):
    """Retrieve all recorded rows across documents from the database."""
    records = db.query(models.ProjectRecord).order_by(models.ProjectRecord.created_at.desc()).all()
    results = []
    for r in records:
        try:
            parsed_data = json.loads(r.data_json)
        except Exception:
            parsed_data = {}
        results.append({
            "id": r.id,
            "document_name": r.document_name,
            "row_index": r.row_index,
            "data": parsed_data,
            "created_at": r.created_at.isoformat() if r.created_at else None
        })
    return {"records": results}

@router.get("/{file_id}/download")
async def download_spreadsheet(file_id: str):
    """Download the current state of the coding sheet."""
    path = _find_sheet_path(file_id)
    media_type = "text/csv" if path.suffix.lower() == ".csv" else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    filename = path.name.split("_", 1)[-1]
    return FileResponse(path=path, media_type=media_type, filename=filename)
