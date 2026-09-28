"""
Embeddings Routes - Generate embeddings for RAG
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional

from collaborative_ide_api_python.services.embeddings import EmbeddingsService
from collaborative_ide_api_python.config import get_settings
from collaborative_ide_api_python.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()
router = APIRouter()

_embeddings_service: Optional[EmbeddingsService] = None


def get_embeddings_service() -> EmbeddingsService:
    global _embeddings_service
    if _embeddings_service is None:
        _embeddings_service = EmbeddingsService()
    return _embeddings_service


class EmbeddingRequest(BaseModel):
    texts: List[str] = Field(min_length=1, max_length=100)
    model: Optional[str] = None


class EmbeddingResponse(BaseModel):
    embeddings: List[List[float]]
    model: str
    usage: dict


@router.post("/embeddings", response_model=EmbeddingResponse)
async def create_embeddings(
    request: EmbeddingRequest,
    service: EmbeddingsService = Depends(get_embeddings_service),
):
    """Generate embeddings for a list of texts."""
    try:
        logger.info(f"Embedding request: {len(request.texts)} texts")
        result = await service.create_embeddings(request.texts, request.model)
        return result
    except Exception as e:
        logger.error(f"Embeddings error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))