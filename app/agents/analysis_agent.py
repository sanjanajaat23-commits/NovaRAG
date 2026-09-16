from app.rag.vectorstore import get_vector_store
from app.rag.retriever import retrieve_context
from app.llm.openai_client import generate_answer


def run_analysis_agent(query: str, session_id: str) -> dict:
    vector_store = get_vector_store(session_id)
    docs = retrieve_context(query, vector_store)

    context_texts = []
    for doc in docs:
        text = doc.get("page_content", "") if isinstance(doc, dict) else str(doc)
        if text.strip():
            context_texts.append(text.strip())

    if not context_texts:
        return {
            "answer": "I could not find documents for this chat session. Please upload a PDF before requesting document analysis.",
            "context": [],
        }

    context = "\n\n".join(context_texts)
    prompt = f"""
You are the NovaRAG Analysis Agent.
Analyze the supplied document context only. Identify facts, patterns, comparisons, risks, or trends supported by the text. Do not invent information.

Document Context:
{context}

User Question:
{query}

Detailed Analysis:
"""
    answer = generate_answer(prompt)
    return {"answer": answer, "context": context_texts}
