# conftest.py
import os
import pytest
from httpx import ASGITransport, AsyncClient

# Set all required env vars BEFORE any imports
os.environ["ENVIRONMENT"] = "test"
os.environ["JWT_SECRET"] = "test-secret-must-be-32-chars-long-for-jwt-signing"
os.environ["JWT_ALGORITHM"] = "HS256"
os.environ["JWT_EXPIRES_IN_MINUTES"] = "60"
os.environ["AWS_REGION"] = "us-east-1"
os.environ["AWS_ACCESS_KEY_ID"] = "test-access-key"
os.environ["AWS_SECRET_ACCESS_KEY"] = "test-secret-key"
os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "test-key"
os.environ["BEDROCK_MODEL_ID"] = "anthropic.claude-3-5-sonnet-20241022-v2:0"
os.environ["PGVECTOR_CONNECTION_STRING"] = ""

# Import after setting env vars
from collaborative_ide_api_python.main import app
from collaborative_ide_api_python.config import get_settings

# Reload settings to pick up test env vars
import importlib
import collaborative_ide_api_python.config as config_module
importlib.reload(config_module)
get_settings.cache_clear()


@pytest.fixture
def client_sync():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")