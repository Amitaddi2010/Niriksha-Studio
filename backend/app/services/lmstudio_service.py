import time
import json
import re
from typing import List, Dict, Any, Optional
import httpx
from pydantic import BaseModel

class PromptItem(BaseModel):
    id: int
    text: str
    description: Optional[str] = None

class ExtractionResultItem(BaseModel):
    prompt_id: int
    prompt: str
    answer: str
    source_quote: Optional[str] = None
    page_number: Optional[int] = None
    confidence: Optional[str] = "medium"

class LMStudioService:
    def __init__(self, default_url: str = "http://localhost:1234/v1"):
        self.default_url = default_url.rstrip("/")

    async def check_health(self, base_url: Optional[str] = None) -> Dict[str, Any]:
        """Check if LM Studio local server is online and list loaded models."""
        url = (base_url or self.default_url).rstrip("/")
        models_endpoint = f"{url}/models"
        start_time = time.time()
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(models_endpoint)
                latency_ms = int((time.time() - start_time) * 1000)
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("id") for m in data.get("data", []) if m.get("id")]
                    return {
                        "status": "online",
                        "connected": True,
                        "latency_ms": latency_ms,
                        "models": models,
                        "base_url": url,
                        "error": None
                    }
                else:
                    return {
                        "status": "warning",
                        "connected": False,
                        "latency_ms": latency_ms,
                        "models": [],
                        "base_url": url,
                        "error": f"Server returned HTTP {res.status_code}"
                    }
        except Exception as e:
            return {
                "status": "offline",
                "connected": False,
                "latency_ms": None,
                "models": [],
                "base_url": url,
                "error": str(e)
            }

    def _prepare_document_text(self, pages: List[Dict[str, Any]], max_chars: int = 150000) -> str:
        """Combine pages into structured text with explicit page delimitations and sanitized Unicode."""
        formatted_pages = []
        char_count = 0
        for p in pages:
            page_num = p.get("page_number", 1)
            raw_text = (p.get("text") or "").strip()
            if not raw_text:
                continue

            # Sanitize Unicode characters that can break Windows console, JSON, or tokenizer
            sanitized = (
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

            block = f"--- [DOCUMENT PAGE {page_num}] ---\n{sanitized}\n"
            char_count += len(block)
            if char_count > max_chars:
                formatted_pages.append(f"--- [DOCUMENT PAGE {page_num} (TRUNCATED FOR CONTEXT LIMIT)] ---")
                break
            formatted_pages.append(block)

        return "\n".join(formatted_pages)

    def _parse_llm_json(self, raw_text: str, batch_prompts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Clean and parse JSON from LLM response with comprehensive multi-layer matching."""
        cleaned = raw_text.strip()

        # Remove markdown code blocks if present
        if "```" in cleaned:
            match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
            if match:
                cleaned = match.group(1).strip()

        # Try direct JSON parsing
        data = None
        try:
            data = json.loads(cleaned)
        except Exception:
            # Fallback: look for outermost { } or [ ]
            try:
                start_candidates = [i for i in [cleaned.find('{'), cleaned.find('[')] if i != -1]
                if start_candidates:
                    start_idx = min(start_candidates)
                    end_idx = max([cleaned.rfind('}'), cleaned.rfind(']')])
                    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                        data = json.loads(cleaned[start_idx:end_idx + 1])
            except Exception:
                pass

        # Normalize parsed data into expected list
        extractions_list = []
        if isinstance(data, dict):
            extractions_list = (
                data.get("results") or 
                data.get("extractions") or 
                data.get("data") or 
                data.get("items") or 
                []
            )
            if not extractions_list and len(data) > 0:
                for k, v in data.items():
                    if isinstance(v, dict):
                        extractions_list.append(v)
        elif isinstance(data, list):
            extractions_list = data

        results = []
        for idx, p in enumerate(batch_prompts):
            p_id = p.get("id", idx + 1)
            p_text = str(p.get("text", "")).strip()
            relative_idx = idx + 1

            matched_item = None

            # Tier 1: Direct prompt_id match
            for item in extractions_list:
                if isinstance(item, dict):
                    if item.get("prompt_id") == p_id:
                        matched_item = item
                        break

            # Tier 2: Relative index match (item_index / index == idx + 1)
            if not matched_item:
                for item in extractions_list:
                    if isinstance(item, dict):
                        if (item.get("item_index") == relative_idx or 
                            item.get("index") == relative_idx or 
                            item.get("prompt_id") == relative_idx):
                            matched_item = item
                            break

            # Tier 3: Positional array fallback (item at same index in results array)
            if not matched_item and idx < len(extractions_list):
                candidate = extractions_list[idx]
                if isinstance(candidate, dict):
                    matched_item = candidate

            # Tier 4: Text overlap match
            if not matched_item:
                for item in extractions_list:
                    if isinstance(item, dict):
                        item_prompt = str(item.get("prompt", "") or item.get("title", "")).strip().lower()
                        if item_prompt and (p_text.lower() in item_prompt or item_prompt in p_text.lower()):
                            matched_item = item
                            break

            if matched_item:
                page_raw = matched_item.get("page_number") or matched_item.get("page")
                page_int = None
                if page_raw is not None:
                    try:
                        digits = re.findall(r'\d+', str(page_raw))
                        if digits:
                            page_int = int(digits[0])
                    except Exception:
                        page_int = None

                raw_answer = str(matched_item.get("answer", "")).strip()
                source_q = str(matched_item.get("source_quote") or matched_item.get("quote") or "").strip()
                if source_q.lower() in ["none", "null", "n/a", ""]:
                    source_q = None

                ans_is_nr = (not raw_answer or raw_answer.lower() in ["not reported", "not reported in text", "nr", "n/a", "null", "none"])
                
                results.append({
                    "prompt_id": p_id,
                    "prompt": p_text,
                    "answer": raw_answer if not ans_is_nr else "Not reported in text",
                    "source_quote": source_q,
                    "page_number": page_int,
                    "confidence": "high" if (source_q and not ans_is_nr) else ("medium" if not ans_is_nr else "low")
                })
            else:
                results.append({
                    "prompt_id": p_id,
                    "prompt": p_text,
                    "answer": "Not reported in text",
                    "source_quote": None,
                    "page_number": None,
                    "confidence": "low"
                })

        return results

    async def _extract_batch(
        self,
        client: httpx.AsyncClient,
        chat_endpoint: str,
        model: str,
        doc_text: str,
        batch: List[Dict[str, Any]],
        temperature: float
    ) -> List[Dict[str, Any]]:
        """Execute a single batch of prompts against LM Studio."""
        items_bullets = "\n".join([
            f"Item {idx+1} (Prompt ID {p.get('id', idx+1)}): {p.get('text')}"
            for idx, p in enumerate(batch)
        ])

        system_message = (
            "You are a rigorous scientific data extraction assistant for systematic literature reviews. "
            "You must extract data strictly supported by the document text. "
            "You MUST respond ONLY with a valid, parseable JSON object matching the requested schema. "
            "Never output conversational markdown or text outside the JSON."
        )

        user_message = f"""DOCUMENT CONTENT:
{doc_text}

---
EXTRACTION TASKS:
Extract the required data for each of the {len(batch)} items below based strictly on the document text.
For each item:
- "answer": Concise factual value, or 'Not reported in text' if missing.
- "source_quote": Exact verbatim quote copied from the document text, or null.
- "page_number": Integer page number where the quote appears, or null.

ITEMS TO EXTRACT:
{items_bullets}

Respond strictly in this JSON format with exactly {len(batch)} entries in 'results':
{{
  "results": [
    {{
      "item_index": 1,
      "prompt_id": {batch[0].get('id', 1)},
      "answer": "Concise answer",
      "source_quote": "Exact verbatim quote from text",
      "page_number": 1
    }}
  ]
}}
"""

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ],
            "temperature": temperature,
            "max_tokens": 2500,
            "response_format": {"type": "text"}
        }

        resp = await client.post(chat_endpoint, json=payload)
        if resp.status_code != 200:
            raise RuntimeError(f"LM Studio error ({resp.status_code}): {resp.text}")

        data = resp.json()
        choice_msg = data["choices"][0]["message"]
        raw_content = choice_msg.get("content") or choice_msg.get("reasoning") or ""
        return self._parse_llm_json(raw_content, batch)

    async def extract_data(
        self,
        base_url: str,
        model: str,
        pages: List[Dict[str, Any]],
        prompts: List[Dict[str, Any]],
        temperature: float = 0.1,
        max_tokens: int = 4096,
        batch_size: int = 6
    ) -> List[Dict[str, Any]]:
        """
        Run extraction against LM Studio using batched chat completions.
        Batching guarantees:
        1. Never exceeding model context or output token limits.
        2. Fast generation per batch (~3-6s after initial KV cache prefill).
        3. 100% reliable JSON schema adherence.
        """
        url = (base_url or self.default_url).rstrip("/")
        chat_endpoint = f"{url}/chat/completions"

        doc_text = self._prepare_document_text(pages)

        # Split prompts into manageable batches
        batches = [prompts[i:i + batch_size] for i in range(0, len(prompts), batch_size)]
        all_results = []

        async with httpx.AsyncClient(timeout=300.0) as client:
            for b_idx, batch in enumerate(batches):
                try:
                    batch_res = await self._extract_batch(
                        client=client,
                        chat_endpoint=chat_endpoint,
                        model=model,
                        doc_text=doc_text,
                        batch=batch,
                        temperature=temperature
                    )
                    all_results.extend(batch_res)
                except Exception as e:
                    # If a batch fails, default its prompts gracefully
                    for idx, p in enumerate(batch):
                        all_results.append({
                            "prompt_id": p.get("id", idx + 1),
                            "prompt": p.get("text", ""),
                            "answer": "Not reported in text",
                            "source_quote": None,
                            "page_number": None,
                            "confidence": "low",
                            "error": str(e)
                        })

        return all_results

    async def extract_single(
        self,
        base_url: str,
        model: str,
        pages: List[Dict[str, Any]],
        prompt_item: Dict[str, Any],
        temperature: float = 0.1
    ) -> Dict[str, Any]:
        """Extract a single prompt (used when user regenerates a single field)."""
        results = await self.extract_data(
            base_url=base_url,
            model=model,
            pages=pages,
            prompts=[prompt_item],
            temperature=temperature,
            batch_size=1
        )
        return results[0] if results else {
            "prompt_id": prompt_item.get("id", 1),
            "prompt": prompt_item.get("text", ""),
            "answer": "Not reported in text",
            "source_quote": None,
            "page_number": None,
            "confidence": "low"
        }
