import mimetypes
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.routers import llm, pdf, spreadsheet, extract
from app.db.session import init_db

# Ensure .mjs and .js have correct javascript mime-type on Windows
mimetypes.add_type("application/javascript", ".mjs")
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database schema and default project
    init_db()
    yield

app = FastAPI(
    title="Niriksha Studio API",
    description="Backend for AI-Assisted Data Extraction with LM Studio (Local LLM)",
    version="2.0.0",
    lifespan=lifespan
)

# CORS setup for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(llm.router)
app.include_router(pdf.router)
app.include_router(spreadsheet.router)
app.include_router(extract.router)

@app.get("/api/info")
async def info():
    return {
        "name": "Niriksha Studio",
        "description": "Systematic Review & Meta-Analysis Data Extraction",
        "default_llm_backend": "LM Studio (http://localhost:1234/v1)"
    }

@app.get("/api/sample/paper")
async def get_sample_paper():
    """Serve pre-generated demo research paper for instant 1-click testing."""
    sample_path = Path(__file__).resolve().parent.parent.parent / "sample_data" / "sample_research_paper.pdf"
    if not sample_path.exists():
        sample_path = Path("sample_data/sample_research_paper.pdf")
    return FileResponse(
        path=sample_path,
        media_type="application/pdf",
        filename="STEM_Active_Learning_Trial.pdf"
    )

# Mount frontend production build if present
dist_path = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if dist_path.exists():
    app.mount("/", StaticFiles(directory=str(dist_path), html=True), name="frontend")
else:
    @app.get("/")
    async def root():
        return {
            "app": "Niriksha Studio",
            "version": "2.0.0",
            "status": "running",
            "frontend": "Run 'npm run dev' inside frontend/ or 'npm run build' to bundle."
        }
