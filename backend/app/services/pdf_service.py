import pymupdf as fitz
from pathlib import Path
from typing import List, Dict, Any, Optional
import shutil
import uuid

class PDFService:
    def __init__(self, upload_dir: Path):
        self.upload_dir = upload_dir

    def save_pdf(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """Save an uploaded PDF to the storage directory and extract basic metadata."""
        file_id = str(uuid.uuid4())
        safe_filename = Path(filename).name
        target_path = self.upload_dir / f"{file_id}_{safe_filename}"
        
        with open(target_path, "wb") as f:
            f.write(file_bytes)

        metadata = self.get_pdf_info(target_path)
        metadata["file_id"] = file_id
        metadata["filename"] = safe_filename
        metadata["saved_path"] = str(target_path)
        return metadata

    def get_pdf_info(self, file_path: Path) -> Dict[str, Any]:
        """Extract page count, title, author, and dimensions."""
        doc = fitz.open(file_path)
        try:
            total_pages = len(doc)
            meta = doc.metadata or {}
            
            # Get dimensions of first page
            first_page_dims = None
            if total_pages > 0:
                rect = doc[0].rect
                first_page_dims = {"width": rect.width, "height": rect.height}

            return {
                "total_pages": total_pages,
                "title": meta.get("title") or file_path.stem,
                "author": meta.get("author") or "Unknown",
                "creation_date": meta.get("creationDate"),
                "file_size": file_path.stat().st_size,
                "dimensions": first_page_dims
            }
        finally:
            doc.close()

    def extract_pages(self, file_path: Path) -> List[Dict[str, Any]]:
        """Extract text content page-by-page."""
        doc = fitz.open(file_path)
        pages_data = []
        try:
            for page_idx in range(len(doc)):
                page = doc[page_idx]
                raw_text = page.get_text("text")
                # Sanitize Unicode punctuation and spacing
                text = (
                    raw_text
                    .replace('\u200a', ' ')
                    .replace('\u2009', ' ')
                    .replace('\u2003', ' ')
                    .replace('\u2002', ' ')
                    .replace('\u00a0', ' ')
                    .replace('\u202f', ' ')
                    .replace('\u2011', '-')
                    .replace('\u2012', '-')
                    .replace('\u2013', '-')
                    .replace('\u2014', '-')
                    .replace('\u2212', '-')
                    .replace('\u2018', "'")
                    .replace('\u2019', "'")
                    .replace('\u201c', '"')
                    .replace('\u201d', '"')
                )
                rect = page.rect
                pages_data.append({
                    "page_number": page_idx + 1,
                    "text": text,
                    "char_count": len(text),
                    "word_count": len(text.split()),
                    "width": rect.width,
                    "height": rect.height
                })
            return pages_data
        finally:
            doc.close()

    def search_quote_coordinates(
        self,
        file_path: Path,
        page_num: int,
        quote: str
    ) -> List[Dict[str, float]]:
        """
        Search for a verbatim or sub-phrase quote on a given page and return bounding boxes.
        Coordinates are normalized relative to page dimensions for easy frontend highlighting.
        """
        if not quote or page_num < 1:
            return []
        
        doc = fitz.open(file_path)
        try:
            if page_num > len(doc):
                return []
            
            page = doc[page_num - 1]
            page_rect = page.rect
            w = page_rect.width
            h = page_rect.height

            # Try exact search
            rects = page.search_for(quote.strip())
            
            # If exact match fails, try first 5-8 significant words
            if not rects:
                words = quote.strip().split()
                if len(words) > 5:
                    sub_phrase = " ".join(words[:6])
                    rects = page.search_for(sub_phrase)

            results = []
            for r in rects:
                results.append({
                    "x": r.x0 / w,
                    "y": r.y0 / h,
                    "width": (r.x1 - r.x0) / w,
                    "height": (r.y1 - r.y0) / h,
                    "raw_x0": r.x0,
                    "raw_y0": r.y0,
                    "raw_x1": r.x1,
                    "raw_y1": r.y1
                })
            return results
        finally:
            doc.close()
