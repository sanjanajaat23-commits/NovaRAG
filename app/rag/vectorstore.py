from typing import Optional

from app.rag.embeddings import cosine_similarity, get_embedding


class VectorStore:
    """Lightweight in-memory session-isolated document store for serverless deployment."""

    def __init__(self, session_id: Optional[str] = None):
        self.session_id = session_id
        self.documents: list[dict] = []
        self.embeddings = []

    def add(self, embedding, document):
        self.embeddings.append(embedding)
        self.documents.append(document)

    def search(self, query_embedding, top_k: int = 5):
        if not self.documents:
            return []
        scored = [
            (cosine_similarity(query_embedding, embedding), document)
            for embedding, document in zip(self.embeddings, self.documents)
        ]
        scored.sort(key=lambda item: item[0], reverse=True)
        return [document for score, document in scored[:top_k] if score > 0]


_vector_stores: dict[str, VectorStore] = {}


def get_vector_store(session_id: str) -> VectorStore:
    return _vector_stores.setdefault(session_id, VectorStore(session_id=session_id))


def save_vector_store(session_id: str) -> bool:
    return session_id in _vector_stores


def load_vector_store(session_id: str) -> Optional[VectorStore]:
    return _vector_stores.get(session_id)


def create_vectorstore(chunks=None, session_id: str = "default"):
    vector_store = get_vector_store(session_id)
    for chunk in chunks or []:
        text = chunk.get("page_content", "") if isinstance(chunk, dict) else str(chunk)
        vector_store.add(get_embedding(text), chunk)
    return vector_store


def clear_vector_store(session_id: str) -> bool:
    return _vector_stores.pop(session_id, None) is not None


def has_vector_store(session_id: str) -> bool:
    return bool(get_vector_store(session_id).documents)


def get_vector_store_info(session_id: str) -> dict:
    vector_store = get_vector_store(session_id)
    filenames = sorted({
        document.get("metadata", {}).get("filename")
        for document in vector_store.documents
        if document.get("metadata", {}).get("filename")
    })
    return {
        "session_id": session_id,
        "total_chunks": len(vector_store.documents),
        "total_documents": len(filenames),
        "documents": filenames,
        "persistent": False,
    }
