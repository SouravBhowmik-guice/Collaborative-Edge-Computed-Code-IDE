"""
AWS Bedrock Service - Chat and Completion Streaming
"""

import boto3
import json
import asyncio
from typing import AsyncGenerator, List, Dict, Any, Optional
from collaborative_ide_api_python.config import get_settings
from collaborative_ide_api_python.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

class BedrockService:
    def __init__(self):
        self.client = boto3.client(
            "bedrock-runtime",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )
        self.model_id = settings.bedrock_model_id

    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream chat completion from Bedrock (Claude)."""
        try:
            # Format messages for Claude
            system_messages = [m for m in messages if m["role"] == "system"]
            user_messages = [m for m in messages if m["role"] != "system"]

            system_prompt = "\n\n".join([m["content"] for m in system_messages]) if system_messages else ""

            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": user_messages,
            }

            if system_prompt:
                body["system"] = system_prompt

            response = self.client.invoke_model_with_response_stream(
                modelId=self.model_id,
                body=json.dumps(body),
            )

            for event in response["body"]:
                chunk = json.loads(event["chunk"]["bytes"])

                if chunk["type"] == "content_block_delta":
                    if chunk["delta"]["type"] == "text_delta":
                        yield {"token": chunk["delta"]["text"], "done": False}

                elif chunk["type"] == "message_delta":
                    if "usage" in chunk["delta"]:
                        yield {
                            "token": "",
                            "done": True,
                            "metadata": {
                                "usage": {
                                    "promptTokens": chunk["usage"].get("input_tokens", 0),
                                    "completionTokens": chunk["usage"].get("output_tokens", 0),
                                }
                            }
                        }

                elif chunk["type"] == "message_stop":
                    yield {"token": "", "done": True}

        except Exception as e:
            logger.error(f"Bedrock stream error: {e}", exc_info=True)
            yield {"error": {"code": "BEDROCK_ERROR", "message": str(e), "retryable": True}}

    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> Dict[str, Any]:
        """Non-streaming chat completion."""
        try:
            system_messages = [m for m in messages if m["role"] == "system"]
            user_messages = [m for m in messages if m["role"] != "system"]

            system_prompt = "\n\n".join([m["content"] for m in system_messages]) if system_messages else ""

            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": user_messages,
            }

            if system_prompt:
                body["system"] = system_prompt

            response = self.client.invoke_model(
                modelId=self.model_id,
                body=json.dumps(body),
            )

            result = json.loads(response["body"].read())

            content = ""
            for block in result.get("content", []):
                if block["type"] == "text":
                    content += block["text"]

            return {
                "content": content,
                "metadata": {
                    "usage": {
                        "promptTokens": result.get("usage", {}).get("input_tokens", 0),
                        "completionTokens": result.get("usage", {}).get("output_tokens", 0),
                    }
                }
            }

        except Exception as e:
            logger.error(f"Bedrock chat error: {e}", exc_info=True)
            raise

    async def stream_completion(
        self,
        prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 1024,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream code completion."""
        messages = [{"role": "user", "content": prompt}]
        async for chunk in self.stream_chat(messages, temperature, max_tokens):
            yield chunk

    async def completion(
        self,
        prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 1024,
    ) -> Dict[str, Any]:
        """Non-streaming code completion."""
        messages = [{"role": "user", "content": prompt}]
        return await self.chat(messages, temperature, max_tokens)