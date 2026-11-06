from pathlib import Path
from typing import List, Dict, Any, Optional
import openpyxl
import pandas as pd
import uuid

class SpreadsheetService:
    def __init__(self, upload_dir: Path, export_dir: Path):
        self.upload_dir = upload_dir
        self.export_dir = export_dir

    def save_form(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """Save uploaded spreadsheet file."""
        file_id = str(uuid.uuid4())
        safe_filename = Path(filename).name
        target_path = self.upload_dir / f"{file_id}_{safe_filename}"

        with open(target_path, "wb") as f:
            f.write(file_bytes)

        parsed = self.parse_coding_form(target_path)
        parsed["file_id"] = file_id
        parsed["filename"] = safe_filename
        parsed["saved_path"] = str(target_path)
        return parsed

    def parse_coding_form(self, file_path: Path) -> Dict[str, Any]:
        """Read column headers as extraction prompts and return existing rows."""
        ext = file_path.suffix.lower()
        if ext == ".csv":
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)

        columns = [str(c).strip() for c in df.columns if str(c).strip() and not str(c).startswith("Unnamed:")]
        
        # If headers are just Generic "Prompt 1, Prompt 2", check if row 0 has prompts
        prompts = []
        for i, col in enumerate(columns):
            prompts.append({
                "id": i + 1,
                "text": col,
                "column_index": i
            })

        # Convert rows into list of dicts for preview
        records = []
        for row_idx, row in df.iterrows():
            row_dict = {}
            for col in columns:
                val = row[col]
                row_dict[col] = "" if pd.isna(val) else str(val)
            records.append(row_dict)

        return {
            "columns": columns,
            "prompts": prompts,
            "row_count": len(records),
            "records": records[:50]  # preview first 50 rows
        }

    def record_row(
        self,
        file_path: Path,
        extractions: List[Dict[str, Any]],
        document_name: str,
        target_row: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Record a row of extracted values into the Excel/CSV file.
        Updates or appends a new row matching systematic review workflow.
        """
        ext = file_path.suffix.lower()
        
        if ext == ".csv":
            df = pd.read_csv(file_path)
            row_map = {item.get("prompt"): item.get("answer") for item in extractions}
            
            # If document_name is not in columns, add it as first column if requested
            if "Document Name" in df.columns:
                row_map["Document Name"] = document_name
                
            new_row = pd.DataFrame([row_map])
            df = pd.concat([df, new_row], ignore_index=True)
            df.to_csv(file_path, index=False)
            return {"status": "success", "total_rows": len(df), "saved_row": len(df)}
        else:
            # Use openpyxl for Excel to preserve formatting
            wb = openpyxl.load_workbook(file_path)
            ws = wb.active

            # Find column mapping from header row (Row 1)
            col_map = {}
            for col_idx in range(1, ws.max_column + 1):
                val = ws.cell(row=1, column=col_idx).value
                if val:
                    col_map[str(val).strip()] = col_idx

            # Determine target row
            if target_row is None or target_row <= 1:
                target_row = ws.max_row + 1
                # If row 1 is headers and max_row is 1, target is row 2

            # Populate answers
            for item in extractions:
                p_text = str(item.get("prompt", "")).strip()
                ans = str(item.get("answer", "")).strip()
                
                # Check direct header match
                if p_text in col_map:
                    ws.cell(row=target_row, column=col_map[p_text], value=ans)
                else:
                    # Check by prompt_id / column_index
                    p_id = item.get("prompt_id", 1)
                    if p_id <= len(col_map):
                        ws.cell(row=target_row, column=p_id, value=ans)

            # Record document name if there's a column for it
            for candidate in ["Document Name", "Document", "PDF Name", "File", "Title"]:
                if candidate in col_map:
                    ws.cell(row=target_row, column=col_map[candidate], value=document_name)
                    break

            wb.save(file_path)
            return {"status": "success", "total_rows": ws.max_row - 1, "saved_row": target_row}

    def delete_row(self, file_path: Path, row_index: int) -> Dict[str, Any]:
        """
        Delete a row from the Excel or CSV file.
        row_index: 0-based data row index (0 is the first data row, corresponding to row 2 in Excel / 1 in CSV header).
        """
        ext = file_path.suffix.lower()
        if ext == ".csv":
            df = pd.read_csv(file_path)
            if 0 <= row_index < len(df):
                df = df.drop(df.index[row_index]).reset_index(drop=True)
                df.to_csv(file_path, index=False)
                return {"status": "success", "total_rows": len(df)}
            raise ValueError(f"Row index {row_index} out of bounds (0 to {len(df) - 1})")
        else:
            wb = openpyxl.load_workbook(file_path)
            ws = wb.active
            excel_row = row_index + 2  # Row 1 is header, so row_index 0 is row 2
            if 2 <= excel_row <= ws.max_row:
                ws.delete_rows(excel_row, 1)
                wb.save(file_path)
                return {"status": "success", "total_rows": max(0, ws.max_row - 1)}
            raise ValueError(f"Excel row {excel_row} out of bounds (2 to {ws.max_row})")

    def generate_default_template(self, output_path: Path) -> Path:
        """Create a standard template for systematic review and meta-analysis data extraction."""
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "AIDE Extraction Form"

        headers = [
            "Document Name",
            "Study Title",
            "First Author & Year",
            "Country / Setting",
            "Study Design (e.g., RCT, Quasi-Exp, Survey)",
            "Total Sample Size (N)",
            "Intervention Group (Sample Size & Description)",
            "Control Group (Sample Size & Description)",
            "Primary Outcome Measure(s)",
            "Effect Size / Statistical Results (d, g, OR, p-value)",
            "Intervention Duration",
            "Key Findings / Conclusions"
        ]

        # Style headers
        header_fill = openpyxl.styles.PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
        header_font = openpyxl.styles.Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        border = openpyxl.styles.Border(
            bottom=openpyxl.styles.Side(style="thin", color="CCCCCC")
        )

        for col_idx, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_idx, value=header)
            cell.fill = header_fill
            cell.font = header_font
            cell.border = border
            ws.column_dimensions[openpyxl.utils.get_column_letter(col_idx)].width = max(len(header) + 4, 18)

        ws.row_dimensions[1].height = 28
        wb.save(output_path)
        return output_path

