from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routes import router
from app.api.v1.upload import router as upload_router
from app.api.v1.chat import router as chat_router
from app.config.settings import settings

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")
app.include_router(upload_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")


@app.get("/")
def home():
    return {
        "message": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
    }
