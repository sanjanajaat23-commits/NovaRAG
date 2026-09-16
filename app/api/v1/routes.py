from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "NovaRAG — Enterprise Multi-Agent AI",
        "backend": "FastAPI",
        "llm": "OpenAI GPT",
        "vector_store": "Lightweight in-memory retrieval",
        "vector_persistence": False,
        "session_isolation": True,
        "memory": "In-memory session memory",
        "message": "NovaRAG backend is running",
    }


@router.get("/status")
def system_status():
    return {
        "status": "operational",
        "components": {
            "api": "online",
            "rag": "enabled",
            "multi_agent": "enabled",
            "persistent_memory": "serverless session",
            "persistent_vector_store": "serverless session",
            "session_isolation": "enabled",
            "multi_document": "enabled",
        },
    }
