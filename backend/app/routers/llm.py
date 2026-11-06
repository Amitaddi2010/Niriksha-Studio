from fastapi import APIRouter, Query, HTTPException
from typing import Optional, Dict, Any
from app.services.lmstudio_service import LMStudioService
from app.config import DEFAULT_LM_STUDIO_URL

router = APIRouter(prefix="/api/llm", tags=["LLM"])
llm_service = LMStudioService(DEFAULT_LM_STUDIO_URL)

@router.get("/health")
async def get_health(base_url: Optional[str] = Query(None)):
    """Check LM Studio connectivity and fetch available models."""
    return await llm_service.check_health(base_url)

@router.get("/models")
async def get_models(base_url: Optional[str] = Query(None)):
    """Return model IDs loaded in LM Studio."""
    res = await llm_service.check_health(base_url)
    return {"models": res.get("models", []), "connected": res.get("connected", False)}

@router.post("/test")
async def test_lm_studio(payload: Dict[str, Any]):
    """Test ping or single test prompt to LM Studio."""
    base_url = payload.get("base_url", DEFAULT_LM_STUDIO_URL)
    model = payload.get("model")
    if not model:
        health = await llm_service.check_health(base_url)
        if not health["connected"] or not health["models"]:
            raise HTTPException(status_code=400, detail="No models loaded in LM Studio or server offline.")
        model = health["models"][0]

    try:
        sample_page = [{"page_number": 1, "text": "Study tested 50 participants in London."}]
        sample_prompt = {"id": 1, "text": "What was the sample size?"}
        res = await llm_service.extract_single(base_url, model, sample_page, sample_prompt)
        return {"status": "success", "result": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

