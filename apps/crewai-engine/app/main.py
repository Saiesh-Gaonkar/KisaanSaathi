"""
main.py — FastAPI entry point for the KisaanSathi CrewAI Simulation Engine.

Endpoints:
  POST /simulate  — Trigger the CrewAI pipeline for a batch in PENDING_SIMULATION.
  GET  /health    — Liveness probe for Cloud Run.

Spec References:
  §5.1 — POST /simulate endpoint with Firebase Auth
  §5.2 — Strict HTTP error handling (401, 404, 409, 500)
  §6   — Firestore read/write lifecycle
"""

from __future__ import annotations

import logging
import traceback
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.config import settings
from app.firebase_client import get_firestore_client, verify_id_token

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="KisaanSathi CrewAI Engine",
    description="Phase 2 — Multi-Agent Simulation Engine for optimal farmer sales channels",
    version="0.1.0",
)

# ── CORS — Allow the React web portal to call this API ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",    # Vite dev server
        "http://localhost:3000",    # Alternative dev port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────
# Request / Response Models
# ──────────────────────────────────────────────

class SimulateRequest(BaseModel):
    batch_id: str


class SimulateResponse(BaseModel):
    batch_id: str
    status: str
    recommendations_count: int
    message: str


# ──────────────────────────────────────────────
# Health Check
# ──────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "crewai-engine"}


# ──────────────────────────────────────────────
# POST /simulate (Spec §5.1)
# ──────────────────────────────────────────────

@app.post("/simulate", response_model=SimulateResponse)
async def simulate(
    request: SimulateRequest,
    authorization: str = Header(..., description="Bearer <Firebase_ID_Token>"),
):
    """
    Trigger the CrewAI simulation pipeline for a given inventory batch.

    Spec §5.2 Error Codes:
      401 — Invalid/missing Firebase token
      404 — batch_id not found in Firestore
      409 — Batch status is not PENDING_SIMULATION (idempotency guard)
      500 — Pipeline execution failure (batch left untouched)
    """
    # ── Step 1: Authenticate (§5.1) ──
    token_str = _extract_bearer_token(authorization)
    try:
        decoded_token = verify_id_token(token_str)
        uid = decoded_token.get("uid", "unknown")
        logger.info(f"Authenticated user: {uid}")
    except Exception as e:
        logger.warning(f"Auth failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired Firebase token.")

    # ── Step 2: Fetch batch & idempotency check (§6.1) ──
    db = get_firestore_client()
    batch_ref = db.collection("inventory_batches").document(request.batch_id)
    batch_doc = batch_ref.get()

    if not batch_doc.exists:
        raise HTTPException(status_code=404, detail=f"Batch '{request.batch_id}' not found.")

    batch_data = batch_doc.to_dict()
    current_status = batch_data.get("status", "")

    if current_status != "PENDING_SIMULATION":
        raise HTTPException(
            status_code=409,
            detail=f"Batch status is '{current_status}', expected 'PENDING_SIMULATION'. "
                   "Cannot re-process a batch that is not pending.",
        )

    # ── Step 3: Run the CrewAI pipeline (§6.3) ──
    try:
        recommendations = await _run_crew_pipeline(request.batch_id, batch_data, db)
    except Exception as e:
        # Spec §5.2: On 500, batch must be left completely untouched
        logger.error(f"Pipeline failed for batch {request.batch_id}: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Simulation pipeline failed: {str(e)}. Batch left untouched for retry.",
        )

    # ── Step 4: Write results to Firestore (§6.4) ──
    try:
        batch_ref.update({
            "ai_recommendations": recommendations,
            "status": "LISTED_ACTIVE",
        })
        logger.info(
            f"Batch {request.batch_id}: wrote {len(recommendations)} recommendations, "
            "status → LISTED_ACTIVE"
        )
    except Exception as e:
        logger.error(f"Firestore write failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to write results to Firestore: {str(e)}",
        )

    return SimulateResponse(
        batch_id=request.batch_id,
        status="LISTED_ACTIVE",
        recommendations_count=len(recommendations),
        message="Simulation completed successfully.",
    )


# ──────────────────────────────────────────────
# Pipeline Orchestration — Full 3-Agent Sequential Crew
# ──────────────────────────────────────────────

async def _run_crew_pipeline(
    batch_id: str,
    batch_data: dict[str, Any],
    db,
) -> list[dict[str, Any]]:
    """
    Execute the full sequential 3-agent CrewAI pipeline.

    Agent 1 (Market Intelligence) → Agent 2 (Logistics & Risk) → Agent 3 (Strategist)
    """
    import json as json_mod

    from crewai import Crew, Process

    from app.agents.logistics_agent import (
        create_logistics_risk_agent,
        create_logistics_risk_task,
    )
    from app.agents.market_agent import (
        create_market_intelligence_agent,
        create_market_intelligence_task,
    )
    from app.agents.strategist_agent import (
        create_strategist_agent,
        create_strategist_task,
    )
    from app.tools.routing_tools import get_decay_rate

    crop = batch_data.get("crop", "Unknown")
    quantity_qtl = batch_data.get("quantity_qtl", 0)
    min_price = batch_data.get("min_price_per_qtl", 0)
    farmer_location = batch_data.get("farmer_location", {})

    # Look up shrinkage rate for this crop
    decay_result = json_mod.loads(get_decay_rate.run(crop=crop))
    shrinkage_rate = decay_result.get("shrinkage_rate_percent", 1.0)

    # Configure LLM for CrewAI (Vertex AI or consumer API based on .env)
    llm = settings.get_crewai_llm()
    logger.info(f"Using LLM: {llm.model}")

    # ── Agent 1: Market Intelligence ──
    market_agent = create_market_intelligence_agent(llm=llm)
    market_task = create_market_intelligence_task(
        agent=market_agent,
        batch_id=batch_id,
        crop=crop,
    )

    # ── Agent 2: Logistics & Risk ──
    logistics_agent = create_logistics_risk_agent(llm=llm)
    logistics_task = create_logistics_risk_task(
        agent=logistics_agent,
        batch_id=batch_id,
        crop=crop,
        farmer_location=farmer_location,
        quantity_qtl=quantity_qtl,
    )

    # ── Agent 3: Lead Economic Strategist ──
    strategist_agent = create_strategist_agent(llm=llm)
    strategist_task = create_strategist_task(
        agent=strategist_agent,
        batch_id=batch_id,
        crop=crop,
        quantity_qtl=quantity_qtl,
        min_price_per_qtl=min_price,
        shrinkage_rate_percent=shrinkage_rate,
    )
    # Strategist consumes outputs from both previous agents
    strategist_task.context = [market_task, logistics_task]

    # ── Run Full Crew (sequential — all 3 agents) ──
    crew = Crew(
        agents=[market_agent, logistics_agent, strategist_agent],
        tasks=[market_task, logistics_task, strategist_task],
        process=Process.sequential,
        verbose=True,
    )

    result = await crew.kickoff_async()
    logger.info(f"Crew result: {result}")

    # Parse the strategist's output into the ai_recommendations array
    recommendations = _parse_recommendations(str(result))

    return recommendations


def _parse_recommendations(raw_output: str) -> list[dict[str, Any]]:
    """
    Parse the Strategist agent's output into a list of recommendation dicts.
    Handles cases where the LLM wraps JSON in markdown code blocks.
    """
    import json as json_mod
    import re

    text = raw_output.strip()

    # Strip markdown code fences if present
    code_block_match = re.search(r"```(?:json)?\s*\n?(.*?)```", text, re.DOTALL)
    if code_block_match:
        text = code_block_match.group(1).strip()

    # Try to find a JSON array in the text
    bracket_start = text.find("[")
    bracket_end = text.rfind("]")
    if bracket_start != -1 and bracket_end != -1 and bracket_end > bracket_start:
        text = text[bracket_start : bracket_end + 1]

    try:
        parsed = json_mod.loads(text)
        if isinstance(parsed, list):
            # Validate each item has required fields
            required_fields = {
                "rank", "channel_type", "channel_name", "delivery_term",
                "gross_revenue", "c_logistics", "c_mandi", "c_shrinkage",
                "p_trust", "net_realization",
            }
            validated = []
            for item in parsed:
                if isinstance(item, dict) and required_fields.issubset(item.keys()):
                    validated.append(item)
                else:
                    logger.warning(f"Skipping invalid recommendation item: {item}")
            return validated
    except json_mod.JSONDecodeError as e:
        logger.error(f"Failed to parse recommendations JSON: {e}")
        logger.error(f"Raw output: {raw_output[:500]}")

    return []


def _extract_bearer_token(authorization: str) -> str:
    """Extract the token from 'Bearer <token>' header."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header.")
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Authorization must be 'Bearer <token>'.")
    return parts[1]
