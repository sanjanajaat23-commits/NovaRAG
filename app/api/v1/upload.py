from pathlib import Path
import shutil

from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app.rag.loader import load_pdf
from app.rag.splitter import split_documents
from app.rag.vectorstore import (
    create_vectorstore,
    get_vector_store_info,
    clear_vector_store,
)

router = APIRouter()
UPLOAD_ROOT = Path("/tmp/novarag_uploads")


@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...), session_id: str = Form(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    session_upload_dir = UPLOAD_ROOT / session_id
    session_upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = session_upload_dir / Path(file.filename).name

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        documents = load_pdf(str(file_path))
        if not documents:
            raise HTTPException(status_code=400, detail="No readable content found in PDF.")

        chunks = split_documents(documents)
        if not chunks:
            raise HTTPException(status_code=400, detail="Unable to create document chunks.")

        for chunk in chunks:
            chunk.setdefault("metadata", {})
            chunk["metadata"]["session_id"] = session_id
            chunk["metadata"]["filename"] = file.filename

        create_vectorstore(chunks, session_id=session_id)
        info = get_vector_store_info(session_id)

        return {
            "status": "success",
            "session_id": session_id,
            "filename": file.filename,
            "pages": len(documents),
            "chunks_added": len(chunks),
            "total_chunks": info["total_chunks"],
            "total_documents": info["total_documents"],
            "documents": info["documents"],
            "persistent": False,
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Document processing failed: {error}") from error


@router.get("/documents/{session_id}")
async def list_documents(session_id: str):
    return {"status": "success", **get_vector_store_info(session_id)}


@router.delete("/documents/{session_id}")
async def clear_documents(session_id: str):
    vector_store_removed = clear_vector_store(session_id)
    session_upload_dir = UPLOAD_ROOT / session_id
    files_removed = session_upload_dir.exists()
    if files_removed:
        shutil.rmtree(session_upload_dir)
    return {
        "status": "success",
        "session_id": session_id,
        "vector_store_removed": vector_store_removed,
        "uploaded_files_removed": files_removed,
        "message": "All documents for this session were cleared.",
    }
