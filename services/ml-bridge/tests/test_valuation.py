from fastapi.testclient import TestClient

from app.main import app


def test_valuation_estimate_returns_deterministic_price() -> None:
    client = TestClient(app)
    response = client.post(
        "/valuation/estimate",
        json={"bedrooms": 2, "bathrooms": 3, "sqft": 1500, "community": "Downtown Dubai"},
    )
    assert response.status_code == 200
    payload = response.json()
    expected = round(1500 * (950 + 2 * 125 + 3 * 75) * 1.15, 2)
    assert payload["price_aed"] == expected
