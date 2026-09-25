"""
market_tools.py — CrewAI Tools for the Market Intelligence Agent

Tools:
  1. get_modal_prices  — Fetch APMC modal prices (Agmarknet API → cached JSON fallback)
  2. get_open_bids     — Query Firestore buyer_bids with trust filtering per spec §4.1

Spec Rules:
  - Filter OUT buyer_bids where buyer_trust_snapshot < 3.5
    UNLESS the buyer's user_status == "PROVISIONAL" (new users get a chance).
  - Bids must have status == "OPEN" and match the batch_id.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import httpx
from crewai.tools import tool

from app.firebase_client import get_firestore_client


# Path to fallback data files
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"


@tool("Get Modal Prices")
def get_modal_prices(crop: str) -> str:
    """
    Fetch APMC modal prices for a given crop from all available mandis.
    Tries the Agmarknet API first, falls back to cached local data.
    Returns a JSON string with mandi names mapped to their modal prices.

    Args:
        crop: The crop name (e.g., "Tomato", "Onion").
    """
    # Attempt 1: Live Agmarknet API
    api_url = os.environ.get("AGMARKNET_API_URL")
    if api_url:
        try:
            resp = httpx.get(
                api_url,
                params={"crop": crop},
                timeout=10.0,
            )
            if resp.status_code == 200:
                return resp.text
        except (httpx.RequestError, httpx.TimeoutException):
            pass  # Fall through to cache

    # Attempt 2: Local cached data
    cache_path = DATA_DIR / "cached_mandi_prices.json"
    if cache_path.exists():
        with open(cache_path) as f:
            all_prices = json.load(f)
        crop_prices = all_prices.get(crop, {})
        if crop_prices:
            return json.dumps(crop_prices, indent=2)

    return json.dumps({"error": f"No price data available for {crop}"})


@tool("Get Open Buyer Bids")
def get_open_bids(batch_id: str) -> str:
    """
    Query Firestore for all OPEN buyer bids on a given inventory batch.
    Applies the trust filter from spec §4.1:
      - Include bids where buyer_trust_snapshot >= 3.5
      - Also include bids where the buyer's user_status is "PROVISIONAL"
        (new users are given a chance even with low/default trust)
      - Exclude all others

    Args:
        batch_id: The inventory batch document ID to query bids for.
    """
    db = get_firestore_client()

    # Query open bids for this batch
    bids_ref = (
        db.collection("buyer_bids")
        .where("batch_id", "==", batch_id)
        .where("status", "==", "OPEN")
    )
    bid_docs = bids_ref.stream()

    filtered_bids: list[dict[str, Any]] = []

    for doc in bid_docs:
        bid = doc.to_dict()
        bid["bid_id"] = doc.id

        trust_score = bid.get("buyer_trust_snapshot", 0.0)
        buyer_id = bid.get("buyer_id", "")

        # Check if buyer is PROVISIONAL (new user exception)
        is_provisional = False
        if buyer_id:
            buyer_doc = db.collection("users").document(buyer_id).get()
            if buyer_doc.exists:
                buyer_data = buyer_doc.to_dict()
                is_provisional = buyer_data.get("user_status") == "PROVISIONAL"

        # Spec §4.1: Filter out if trust < 3.5 UNLESS PROVISIONAL
        if trust_score >= 3.5 or is_provisional:
            filtered_bids.append({
                "bid_id": bid.get("bid_id"),
                "batch_id": bid.get("batch_id"),
                "buyer_id": buyer_id,
                "buyer_name": bid.get("buyer_name", ""),
                "offered_price_per_qtl": bid.get("offered_price_per_qtl", 0),
                "delivery_term": bid.get("delivery_term", "EX_FARM"),
                "buyer_trust_snapshot": trust_score,
                "is_provisional": is_provisional,
            })

    return json.dumps(filtered_bids, indent=2, default=str)
