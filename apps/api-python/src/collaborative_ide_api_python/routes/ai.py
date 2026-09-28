"""
AI Routes - Streaming Completion and Chat via SSE
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel, Field
from typing import Optional, List, AsyncGenerator
import json
import uuid
import time

from collaborative_ide_api_python.services.bedrock import BedrockService
from collaborative_ide_api_python.services.rag import RAGService
from collaborative_ide_api_python.config import get_settings
from collaborative_ide_api_python.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()
router = APIRouter()

# Services (initialized lazily)
_bedrock_service: Optional[BedrockService] = None
_rag_service: Optional[RAGService] = None


def get_bedrock_service() -> BedrockService:
    global _bedrock_service
    if _bedrock_service is None:
        _bedrock_service = BedrockService()
    return _bedrock_service


def get_rag_service() -> RAGService:
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service


# ============================================================================
# Request/Response Models
# ============================================================================

class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant|system)$")
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    project_id: Optional[str] = None
    file_context: Optional[str] = None
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=4096, ge=1, le=8192)
    stream: bool = True


class CompletionRequest(BaseModel):
    prompt: str
    language: str = "cpp"
    context: Optional[str] = None
    temperature: float = Field(default=0.3, ge=0.0, le=1.0)
    max_tokens: int = Field(default=1024, ge=1, le=4096)
    stream: bool = True


class EmbeddingRequest(BaseModel):
    texts: List[str]
    model: Optional[str] = None


# ============================================================================
# SSE Event Generators
# ============================================================================

async def generate_chat_stream(
    request: ChatRequest,
    bedrock: BedrockService,
    rag: RAGService,
    request_id: str,
) -> AsyncGenerator[str, None]:
    """Generate SSE events for chat completion."""
    try:
        # Build context from RAG if project_id provided
        context = request.file_context or ""
        if request.project_id and settings.pgvector_connection_string:
            rag_context = await rag.query(request.project_id, request.messages[-1].content)
            if rag_context:
                context = f"{context}\n\nRelevant documentation:\n{rag_context}" if context else f"Relevant documentation:\n{rag_context}"

        # Build system prompt
        system_prompt = """You are an expert software engineer and AI pair programmer.
Provide clear, concise, and accurate responses. When showing code, use proper formatting.
Be helpful but concise - prefer code examples over lengthy explanations."""

        messages = [{"role": "system", "content": system_prompt}]

        if context:
            messages.append({"role": "system", "content": f"Context:\n{context}"})

        messages.extend([{"role": m.role, "content": m.content} for m in request.messages])

        # Stream from Bedrock
        async for chunk in bedrock.stream_chat(
            messages=messages,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        ):
            if chunk.get("token"):
                event_data = {
                    "requestId": request_id,
                    "token": chunk["token"],
                    "done": chunk.get("done", False),
                }
                if chunk.get("done"):
                    event_data["metadata"] = chunk.get("metadata", {})
                yield f"event: token\ndata: {json.dumps(event_data)}\n\n"

            if chunk.get("error"):
                error_data = {
                    "requestId": request_id,
                    "error": chunk["error"],
                }
                yield f"event: error\ndata: {json.dumps(error_data)}\n\n"
                break

    except Exception as e:
        logger.error(f"Chat stream error: {e}", exc_info=True)
        error_data = {
            "requestId": request_id,
            "error": {"code": "STREAM_ERROR", "message": str(e), "retryable": True},
        }
        yield f"event: error\ndata: {json.dumps(error_data)}\n\n"


async def generate_completion_stream(
    request: CompletionRequest,
    bedrock: BedrockService,
    request_id: str,
) -> AsyncGenerator[str, None]:
    """Generate SSE events for code completion."""
    try:
        prompt = f"""Complete the following {request.language} code. Only return the completion, no explanations.

Context:
{request.context or 'No additional context.'}

Code to complete:
{request.prompt}"""

        async for chunk in bedrock.stream_completion(
            prompt=prompt,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        ):
            if chunk.get("token"):
                event_data = {
                    "requestId": request_id,
                    "token": chunk["token"],
                    "done": chunk.get("done", False),
                }
                yield f"event: token\ndata: {json.dumps(event_data)}\n\n"

            if chunk.get("error"):
                error_data = {
                    "requestId": request_id,
                    "error": chunk["error"],
                }
                yield f"event: error\ndata: {json.dumps(error_data)}\n\n"
                break

    except Exception as e:
        logger.error(f"Completion stream error: {e}", exc_info=True)
        error_data = {
            "requestId": request_id,
            "error": {"code": "STREAM_ERROR", "message": str(e), "retryable": True},
        }
        yield f"event: error\ndata: {json.dumps(error_data)}\n\n"


# ============================================================================
# Endpoints
# ============================================================================

@router.post("/chat")
async def chat(
    request: ChatRequest,
    bedrock: BedrockService = Depends(get_bedrock_service),
    rag: RAGService = Depends(get_rag_service),
    http_request: Request = None,
):
    """Streaming chat completion via SSE."""
    request_id = str(uuid.uuid4())
    logger.info(f"Chat request {request_id}: {len(request.messages)} messages")

    if request.stream:
        return EventSourceResponse(
            generate_chat_stream(request, bedrock, rag, request_id),
            media_type="text/event-stream",
        )

    # Non-streaming fallback
    try:
        context = request.file_context or ""
        if request.project_id:
            rag_context = await rag.query(request.project_id, request.messages[-1].content)
            if rag_context:
                context = f"{context}\n\n{rag_context}" if context else rag_context

        system_prompt = "You are an expert software engineer and AI pair programmer."
        messages = [{"role": "system", "content": system_prompt}]
        if context:
            messages.append({"role": "system", "content": f"Context:\n{context}"})
        messages.extend([{"role": m.role, "content": m.content} for m in request.messages])

        response = await bedrock.chat(
            messages=messages,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )

        return {
            "requestId": request_id,
            "response": response["content"],
            "metadata": response.get("metadata", {}),
        }
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/complete")
async def complete(
    request: CompletionRequest,
    bedrock: BedrockService = Depends(get_bedrock_service),
):
    """Streaming code completion via SSE."""
    request_id = str(uuid.uuid4())
    logger.info(f"Completion request {request_id}: {request.language}")

    if request.stream:
        return EventSourceResponse(
            generate_completion_stream(request, bedrock, request_id),
            media_type="text/event-stream",
        )

    # Non-streaming fallback
    try:
        prompt = f"""Complete the following {request.language} code. Only return the completion.

Context:
{request.context or 'No additional context.'}

Code:
{request.prompt}"""

        response = await bedrock.completion(
            prompt=prompt,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )

        return {
            "requestId": request_id,
            "completion": response["content"],
            "metadata": response.get("metadata", {}),
        }
    except Exception as e:
        logger.error(f"Completion error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))