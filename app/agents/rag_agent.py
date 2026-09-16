from app.rag.vectorstore import get_vector_store
from app.rag.retriever import retrieve_context
from app.llm.openai_client import generate_answer


def run_rag_agent(query: str, session_id: str) -> dict:
    vector_store = get_vector_store(session_id)
    docs = retrieve_context(query, vector_store)

    context_texts = []
    for doc in docs:
        text = doc.get("page_content", "") if isinstance(doc, dict) else str(doc)
        if text.strip():
            context_texts.append(text.strip())

    if not context_texts:
        return {
            "answer": "I could not find relevant information in documents uploaded for this chat session. Please upload a PDF first.",
            "context": [],
        }

    context = "\n\n".join(context_texts)
    prompt = f"""
You are the NovaRAG document intelligence agent.
Answer the user's question using ONLY the provided document context.
Do not invent facts. If the context is insufficient, say so clearly.

Document Context:
{context}

User Question:
{query}

Answer:
"""
    answer = generate_answer(prompt)
    return {"answer": answer, "context": context_texts}
