from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="ML Bridge", version="0.1.0")


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "ml-bridge",
        "region": "me-central-1"
    }


@app.post("/nlp/listing-writer")
async def listing_writer_stub() -> dict[str, str]:
    return {
        "message": "Stub response - integrate with SageMaker endpoint",
        "toxicity_flag": "false"
    }


class ValuationPayload(BaseModel):
    bedrooms: int
    bathrooms: int
    sqft: float
    community: str


@app.post("/valuation/estimate")
async def valuation_estimate(payload: ValuationPayload) -> dict[str, float]:
    community_factor = 1.15 if payload.community.lower().startswith("downtown") else 1.0
    scale = 950.0 + (payload.bedrooms * 125.0) + (payload.bathrooms * 75.0)
    price = payload.sqft * scale * community_factor
    return {"price_aed": round(price, 2)}
