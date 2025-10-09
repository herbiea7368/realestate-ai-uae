from __future__ import annotations

import asyncio
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal, Optional

import httpx
from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel, Field, constr

APP_VERSION = "0.1.0"
PERMIT_SERVICE_URL = os.getenv(
    "PERMIT_SERVICE_URL", "http://localhost:4000/api/v1"
)
CONTEXT_LOG_PATH = Path(
    os.getenv(
        "CONTEXT_LOG_PATH",
        Path(__file__).resolve().parents[2] / "logs" / "context-log.ndjson",
    )
)


class PropertySnapshot(BaseModel):
    title: Optional[str] = None
    community: Optional[str] = None
    developer: Optional[str] = None
    beds: Optional[int] = Field(default=None, ge=0)
    baths: Optional[int] = Field(default=None, ge=0)
    area_sqft: Optional[float] = Field(default=None, ge=0)
    price_aed: Optional[float] = Field(default=None, ge=0)


class ListingWriterInputs(BaseModel):
    trakheesi_number: constr(pattern=r"^\d{6}$")
    language: Literal["en", "ar"]
    property_snapshot: Optional[PropertySnapshot] = None


class ListingWriterRequest(BaseModel):
    property_id: str = Field(min_length=1)
    inputs: ListingWriterInputs


class PermitStatus(BaseModel):
    status: Literal["valid", "expired", "not_found", "suspended"]
    issuer: Literal["DLD"]
    expiry_date: Optional[str] = None
    errors: list[str] = Field(default_factory=list)
    checked_at: str


class ListingWriterResponse(BaseModel):
    description: str
    language: Literal["en", "ar"]
    permit_status: PermitStatus
    compliance: dict[str, Any]
    generated_at: str


app = FastAPI(title="Listing Writer Stub", version=APP_VERSION)


async def get_http_client() -> httpx.AsyncClient:
    if not hasattr(app.state, "http_client"):
        app.state.http_client = httpx.AsyncClient(timeout=5.0)
    return app.state.http_client


async def append_context_log(event: dict[str, Any]) -> None:
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "actor": "listing-writer-stub",
        "scope": "listing-writer",
        **event,
    }
    await asyncio.to_thread(_write_log, entry)


def _write_log(entry: dict[str, Any]) -> None:
    CONTEXT_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with CONTEXT_LOG_PATH.open("a", encoding="utf-8") as log_file:
        log_file.write(json.dumps(entry) + "\n")


async def fetch_permit_status(
    trakheesi_number: str, client: httpx.AsyncClient
) -> PermitStatus:
    response = await client.get(
        f"{PERMIT_SERVICE_URL}/permits/status",
        params={"trakheesi": trakheesi_number},
        headers={"accept": "application/json"},
    )
    if response.status_code >= 500:
        await append_context_log(
            {
                "event": "permit.service_unavailable",
                "summary": "Permit service returned server error",
                "details": {"status_code": response.status_code},
            }
        )
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Permit validation temporarily unavailable.",
        )
    data = response.json()
    return PermitStatus(**data)


def build_description(
    language: Literal["en", "ar"], snapshot: Optional[PropertySnapshot]
) -> str:
    if language == "ar":
        return "مسودة وصف للعقار سيتم تحديثها بعد دمج نموذج الذكاء الاصطناعي."
    community = snapshot.community if snapshot else "Dubai"
    return (
        f"Draft listing copy for {community}. "
        "Final AI enrichment pending compliance review."
    )


@app.post("/nlp/listing-writer", response_model=ListingWriterResponse)
async def listing_writer_endpoint(
    payload: ListingWriterRequest, client: httpx.AsyncClient = Depends(get_http_client)
) -> ListingWriterResponse:
    permit_status = await fetch_permit_status(
        payload.inputs.trakheesi_number, client
    )

    if permit_status.status != "valid":
        await append_context_log(
            {
                "event": "listing_writer.permit_block",
                "summary": "Listing writer blocked due to permit status",
                "details": {
                    "property_id": payload.property_id,
                    "trakheesi_number": payload.inputs.trakheesi_number,
                    "status": permit_status.status,
                    "errors": permit_status.errors,
                },
            }
        )
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={
                "message": "Permit validation failed.",
                "errors": permit_status.errors,
                "status": permit_status.status,
            },
        )

    description = build_description(
        payload.inputs.language, payload.inputs.property_snapshot
    )
    response = ListingWriterResponse(
        description=description,
        language=payload.inputs.language,
        permit_status=permit_status,
        compliance={
            "tdra_window_ok": True,
            "pdpl_consent_required": True,
            "content_moderation": "pending",
        },
        generated_at=datetime.now(timezone.utc).isoformat(),
    )
    await append_context_log(
        {
            "event": "listing_writer.generated",
            "summary": "Listing draft issued",
            "details": {
                "property_id": payload.property_id,
                "language": payload.inputs.language,
                "trakheesi_number": payload.inputs.trakheesi_number,
            },
        }
    )
    return response


@app.get("/health")
async def healthcheck() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "listing-writer-stub",
        "version": APP_VERSION,
        "region": "me-central-1",
    }


@app.on_event("shutdown")
async def shutdown_event() -> None:
    client = getattr(app.state, "http_client", None)
    if client:
        await client.aclose()
