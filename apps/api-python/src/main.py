"""
Python AI Microservice - Main Entry Point
FastAPI server with AWS Bedrock integration, SSE streaming, and pgvector RAG
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
import uvicorn

from src.config import get_settings
from src.routes import ai, embeddings, health
from src.services.auth import verify_jwt_token
from src.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Python AI Service...")
    yield
    # Shutdown
    logger.info("Shutting down Python AI Service...")


app = FastAPI(
    title="Collaborative IDE - AI Service",
    description="AWS Bedrock integration with SSE streaming and RAG",
    version="0.0.1",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(health.router, prefix="/api/v1", tags=["Health"])
app.include_router(ai.router, prefix="/api/v1/ai", tags=["AI"], dependencies=[Depends(verify_jwt_token)])
app.include_router(embeddings.router, prefix="/api/v1/ai", tags=["Embeddings"], dependencies=[Depends(verify_jwt_token)])


@app.get("/")
async def root():
    return {"service": "api-python", "version": "0.0.1", "status": "running"}


if __name__ == "__main__":
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.environment == "development",
    )