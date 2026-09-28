# conftest.py
import os
import pytest
from httpx import ASGITransport, AsyncClient

os.environ["ENVIRONMENT"] = "test"
os.environ["JWT_SECRET"] = "test-secret-must-be-32-chars-long-for-jwt-signing"
os.environ["JWT_ALGORITHM"] = "HS256"
os.environ["JWT_EXPIRES_IN_MINUTES"] = "60"
os.environ["AWS_REGION"] = "us-east-1"
os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "test-key"

import importlib
import src.config as config_module
importlib.reload(config_module)


@pytest.fixture
def client_sync():
    from src.main import app
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")