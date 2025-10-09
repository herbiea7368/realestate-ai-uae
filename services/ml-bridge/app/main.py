from fastapi import FastAPI

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
