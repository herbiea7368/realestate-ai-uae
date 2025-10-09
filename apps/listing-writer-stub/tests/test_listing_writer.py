import asyncio
import sys
from pathlib import Path
from typing import Iterable

import httpx
import pytest

sys.path.append(str(Path(__file__).resolve().parents[2]))

from apps.listing_writer_stub.main import app, get_http_client  # noqa: E402


def build_permit_client(status: str, errors: Iterable[str] | None = None) -> httpx.AsyncClient:
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path.endswith("/permits/status")
        return httpx.Response(
            200,
            json={
                "status": status,
                "issuer": "DLD",
                "expiry_date": "2025-12-31",
                "errors": list(errors or []),
                "checked_at": "2025-10-09T12:00:00Z",
            },
        )

    transport = httpx.MockTransport(handler)
    return httpx.AsyncClient(transport=transport)


@pytest.mark.asyncio
async def test_listing_writer_allows_valid_permit():
    permit_client = build_permit_client("valid")
    app.dependency_overrides[get_http_client] = lambda: permit_client

    async with httpx.AsyncClient(app=app, base_url="http://test") as test_client:
        response = await test_client.post(
            "/nlp/listing-writer",
            json={
                "property_id": "P-100",
                "inputs": {
                    "trakheesi_number": "654321",
                    "language": "en",
                    "property_snapshot": {"community": "Dubai Marina"},
                },
            },
        )

    await asyncio.sleep(0.05)
    app.dependency_overrides.clear()
    await permit_client.aclose()

    assert response.status_code == 200
    payload = response.json()
    assert payload["permit_status"]["status"] == "valid"
    assert payload["description"].startswith("Draft listing copy")


@pytest.mark.asyncio
async def test_listing_writer_blocks_invalid_permit():
    permit_client = build_permit_client("expired", errors=["permit_expired"])
    app.dependency_overrides[get_http_client] = lambda: permit_client

    async with httpx.AsyncClient(app=app, base_url="http://test") as test_client:
        response = await test_client.post(
            "/nlp/listing-writer",
            json={
                "property_id": "P-101",
                "inputs": {
                    "trakheesi_number": "123456",
                    "language": "en",
                },
            },
        )

    await asyncio.sleep(0.05)
    app.dependency_overrides.clear()
    await permit_client.aclose()

    assert response.status_code == 409
    payload = response.json()
    assert payload["detail"]["status"] == "expired"
    assert "permit_expired" in payload["detail"]["errors"]
