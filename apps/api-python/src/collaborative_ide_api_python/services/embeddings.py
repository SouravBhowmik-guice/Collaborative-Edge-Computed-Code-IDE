"""
Embeddings Service - Generate embeddings for RAG
"""

import boto3
import json
from typing import List, Dict, Any, Optional
from collaborative_ide_api_python.config import get_settings
from collaborative_ide_api_python.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

class EmbeddingsService:
    def __init__(self):
        self.client = boto3.client(
            "bedrock-runtime",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )
        self.model_id = "amazon.titan-embed-text-v2:0"  # Default embedding model

    async def create_embeddings(
        self,
        texts: List[str],
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate embeddings for a list of texts."""
        model_id = model or self.model_id

        embeddings = []
        total_tokens = 0

        for text in texts:
            body = {"inputText": text}

            response = self.client.invoke_model(
                modelId=model_id,
                body=json.dumps(body),
            )

            result = json.loads(response["body"].read())
            embeddings.append(result["embedding"])
            total_tokens += result.get("inputTextTokenCount", 0)

        return {
            "embeddings": embeddings,
            "model": model_id,
            "usage": {"totalTokens": total_tokens},
        }