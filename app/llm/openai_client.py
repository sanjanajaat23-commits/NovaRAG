import os

from openai import OpenAI

MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


def generate_answer(prompt: str) -> str:
    """Generate with OpenAI, or return a safe demo response when no key is configured."""
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        return (
            "NovaRAG demo mode is active.\n\n"
            "I received your request and prepared the document-aware workflow. "
            "Add OPENAI_API_KEY in Vercel Environment Variables for live AI responses.\n\n"
            f"Request context:\n{prompt[-1000:]}"
        )

    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=MODEL,
        temperature=0.2,
        messages=[
            {"role": "system", "content": "You are NovaRAG, an enterprise document intelligence assistant. Answer clearly and only use supplied context for document questions."},
            {"role": "user", "content": prompt},
        ],
    )
    return (response.choices[0].message.content or "No response returned.").strip()
