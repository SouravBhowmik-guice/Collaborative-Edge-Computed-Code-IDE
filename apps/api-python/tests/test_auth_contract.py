# test_auth_contract.py
"""Cross-service auth contract: same HS256 JWT must authenticate on both services."""
import pytest
from jose import jwt

SECRET = "test-secret-must-be-32-chars-long-for-jwt-signing"
payload = {"sub": "test-user-id", "email": "dev@example.com"}

def _signed_token():
    return jwt.encode(payload, SECRET, algorithm="HS256")

@pytest.mark.asyncio
async def test_node_token_accepted_by_python(client_sync):
    res = await client_sync.get("/api/v1/health", headers={"Authorization": f"Bearer {_signed_token()}"})
    assert res.status_code == 200, res.text