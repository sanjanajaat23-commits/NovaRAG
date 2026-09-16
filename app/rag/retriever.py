from app.rag.embeddings import cosine_similarity, get_embedding

DEFAULT_TOP_K = 5


def retrieve_context(query: str, vector_store, top_k: int = DEFAULT_TOP_K):
    cleaned_query = " ".join(query.split())
    if not cleaned_query:
        return []

    query_embedding = get_embedding(cleaned_query)
    results = vector_store.search(query_embedding, top_k=top_k)
    seen = set()
    unique_results = []

    for document in results:
        text = document.get("page_content", "") if isinstance(document, dict) else str(document)
        text = text.strip()
        if not text or text in seen:
            continue
        seen.add(text)
        unique_results.append(document)

    return unique_results
