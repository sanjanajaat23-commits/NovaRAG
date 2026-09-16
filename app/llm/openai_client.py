import requests
from openai import OpenAI

from app.config.settings import settings


def generate_answer(prompt: str) -> str:
    """Generate an answer using OpenAI in production, with local Ollama fallback."""
    if settings.OPENAI_API_KEY:
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )
        return (response.choices[0].message.content or "").strip()

    response = requests.post(
        settings.OLLAMA_URL,
        json={
            "model": settings.OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
        },
        timeout=120,
    )
    response.raise_for_status()
    result = response.json()
    return result.get("response", "").strip()
