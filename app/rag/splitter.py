def split_documents(documents, chunk_size: int = 1200, chunk_overlap: int = 200):
    """Split page dictionaries into overlapping text chunks without heavy libraries."""
    if chunk_size <= 0 or chunk_overlap < 0 or chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be >= 0 and smaller than chunk_size")

    chunks = []
    step = chunk_size - chunk_overlap

    for document in documents:
        text = str(document.get("page_content", "")).strip()
        metadata = dict(document.get("metadata", {}))
        for start in range(0, len(text), step):
            chunk = text[start:start + chunk_size].strip()
            if chunk:
                chunks.append({
                    "page_content": chunk,
                    "metadata": metadata,
                })
            if start + chunk_size >= len(text):
                break

    return chunks
