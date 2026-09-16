from pypdf import PdfReader


def load_pdf(file_path: str):
    """Load a PDF into lightweight document dictionaries."""
    reader = PdfReader(file_path)
    documents = []
    for page_number, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        if text:
            documents.append(
                {
                    "page_content": text,
                    "metadata": {"page": page_number},
                }
            )
    return documents
