import json
import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from openai import AsyncOpenAI

from auth import get_current_user
from database import User

router = APIRouter(prefix="/scan", tags=["scan"])

_client = None

def get_openai_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _client


class ScanRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/png"


class ScanResult(BaseModel):
    company: str
    role: str
    notes: str


SYSTEM_PROMPT = """You are a job listing parser. The user will send you a screenshot of a job posting.
Extract the following fields and return ONLY a valid JSON object — no markdown, no explanation:
{
  "company": "company name or empty string if not found",
  "role": "job title/role or empty string if not found",
  "notes": "concise summary of key requirements, skills, responsibilities (2-4 sentences)"
}"""


@router.post("/", response_model=ScanResult)
async def scan_image(
    payload: ScanRequest,
    current_user: User = Depends(get_current_user),
):
    client = get_openai_client()
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": SYSTEM_PROMPT},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{payload.mime_type};base64,{payload.image_base64}",
                                "detail": "low",
                            },
                        },
                    ],
                }
            ],
            max_tokens=400,
            temperature=0,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OpenAI error: {e}")

    raw = response.choices[0].message.content.strip()

    # Strip markdown code fences if model wrapped the JSON
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="AI returned unparseable response")

    return ScanResult(
        company=str(data.get("company", "")).strip(),
        role=str(data.get("role", "")).strip(),
        notes=str(data.get("notes", "")).strip(),
    )
