"""
RAG Service - pgvector integration for document retrieval
"""

import json
import asyncio
from typing import List, Optional
import asyncpg
from collaborative_ide_api_python.services.embeddings import EmbeddingsService
from collaborative_ide_api_python.config import get_settings
from collaborative_ide_api_python.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

class RAGService:
    def __init__(self):
        self.embeddings_service = EmbeddingsService()
        self.pool: Optional[asyncpg.Pool] = None
        self.enabled = bool(settings.pgvector_connection_string)

    async def initialize(self):
        """Initialize connection pool."""
        if not self.enabled:
            logger.info("RAG disabled - no pgvector connection string")
            return

        try:
            self.pool = await asyncpg.create_pool(
                settings.pgvector_connection_string,
                min_size=2,
                max_size=10,
            )
            logger.info("✅ RAG service initialized with pgvector")
        except Exception as e:
            logger.error(f"Failed to initialize RAG: {e}")
            self.enabled = False

    async def close(self):
        """Close connection pool."""
        if self.pool:
            await self.pool.close()

    async def ingest_documents(
        self,
        project_id: str,
        documents: List[dict],  # {content: str, metadata: dict}
    ) -> int:
        """Ingest documents into pgvector."""
        if not self.enabled or not self.pool:
            return 0

        try:
            texts = [doc["content"] for doc in documents]
            embeddings_result = await self.embeddings_service.create_embeddings(texts)
            embeddings = embeddings_result["embeddings"]

            async with self.pool.acquire() as conn:
                for i, (doc, embedding) in enumerate(zip(documents, embeddings)):
                    await conn.execute(
                        """
                        INSERT INTO document_chunks (project_id, content, metadata, embedding)
                        VALUES ($1, $2, $3, $4)
                        """,
                        project_id,
                        doc["content"],
                        json.dumps(doc.get("metadata", {})),
                        embedding,
                    )

            logger.info(f"Ingested {len(documents)} documents for project {project_id}")
            return len(documents)
        except Exception as e:
            logger.error(f"Document ingestion error: {e}")
            return 0

    async def query(self, project_id: str, query_text: str, top_k: int = 5) -> str:
        """Query similar documents for RAG context."""
        if not self.enabled or not self.pool:
            return ""

        try:
            # Generate embedding for query
            embeddings_result = await self.embeddings_service.create_embeddings([query_text])
            query_embedding = embeddings_result["embeddings"][0]

            # Search pgvector
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT content, metadata, 1 - (embedding <=> $1) as similarity
                    FROM document_chunks
                    WHERE project_id = $2
                    ORDER BY embedding <=> $1
                    LIMIT $3
                    """,
                    query_embedding,
                    project_id,
                    top_k,
                )

            if not rows:
                return ""

            # Format context
            context_parts = []
            for row in rows:
                context_parts.append(f"[Similarity: {row['similarity']:.3f}]\n{row['content']}")

            return "\n\n---\n\n".join(context_parts)

        except Exception as e:
            logger.error(f"RAG query error: {e}")
            return ""

    async def delete_project_documents(self, project_id: str) -> int:
        """Delete all documents for a project."""
        if not self.enabled or not self.pool:
            return 0

        try:
            async with self.pool.acquire() as conn:
                result = await conn.execute(
                    "DELETE FROM document_chunks WHERE project_id = $1",
                    project_id,
                )
                # result is like "DELETE 5"
                deleted = int(result.split()[-1]) if result else 0
                return deleted
        except Exception as e:
            logger.error(f"Delete documents error: {e}")
            return 0