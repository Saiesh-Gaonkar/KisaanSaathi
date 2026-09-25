"""
strategy_tools.py — CrewAI Tools for the Lead Economic Strategist Agent

Tools:
  1. compute_channel_economics — Calls formulas.py for a single bid/route combo
  2. rank_channels             — Sorts all computed channels by Net Realization

These tools ensure the LLM NEVER computes money itself — it only invokes
deterministic Python math through these wrappers.
"""

from __future__ import annotations

import json
from typing import Any

from crewai.tools import tool

from app.formulas import compute_net_realization


@tool("Compute Channel Economics")
def compute_channel_economics(
    quantity_qtl: float,
    price_per_qtl: float,
    distance_km: float,
    tariff_per_km: float,
    is_backhaul: bool,
    delivery_term: str,
    shrinkage_rate_percent: float,
    buyer_trust_score: float,
    transporter_trust_score: float,
    channel_type: str,
    channel_name: str,
    buyer_id: str,
    transporter_id: str,
) -> str:
    """
    Compute the full economic breakdown for a single sales channel option.
    This calls the deterministic formulas.py — NO LLM math allowed.

    Returns a JSON object with gross_revenue, all cost components,
    net_realization, and metadata for the ai_recommendations schema.

    Args:
        quantity_qtl: Quantity in quintals.
        price_per_qtl: Price per quintal (bid price or mandi modal price).
        distance_km: Distance from farmer to destination in km.
        tariff_per_km: Transporter's tariff rate per km.
        is_backhaul: Whether the route is a backhaul (empty return trip).
        delivery_term: "FOR_MANDI" or "EX_FARM".
        shrinkage_rate_percent: Crop decay rate (midpoint from decay data).
        buyer_trust_score: Buyer's trust score (0-5).
        transporter_trust_score: Transporter's trust score (0-5).
        channel_type: "APMC_MANDI" or "DIRECT_BUYER".
        channel_name: Name of the mandi or buyer.
        buyer_id: Buyer's user ID (or "null" if mandi channel).
        transporter_id: Transporter's user ID (or "null" if EX_FARM).
    """
    breakdown = compute_net_realization(
        quantity_qtl=quantity_qtl,
        price_per_qtl=price_per_qtl,
        distance_km=distance_km,
        tariff_per_km=tariff_per_km,
        is_backhaul=is_backhaul,
        delivery_term=delivery_term,
        shrinkage_rate_percent=shrinkage_rate_percent,
        buyer_trust_score=buyer_trust_score,
        transporter_trust_score=transporter_trust_score,
    )

    result = {
        "channel_type": channel_type,
        "channel_name": channel_name,
        "buyer_id": buyer_id if buyer_id != "null" else None,
        "transporter_id": transporter_id if transporter_id != "null" else None,
        "delivery_term": delivery_term,
        "gross_revenue": breakdown.gross_revenue,
        "c_logistics": breakdown.c_logistics,
        "c_mandi": breakdown.c_mandi,
        "c_shrinkage": breakdown.c_shrinkage,
        "p_trust": breakdown.p_trust,
        "net_realization": breakdown.net_realization,
    }

    return json.dumps(result, indent=2)


@tool("Rank Channels By Net Realization")
def rank_channels(channel_results_json: str) -> str:
    """
    Take a JSON array of channel economic results and rank them by
    Net Realization (highest first). Assigns rank numbers and generates
    economic rationale summaries.

    The output matches the exact ai_recommendations schema from Spec §2.1.

    Args:
        channel_results_json: A JSON string containing an array of channel
            result objects (output from Compute Channel Economics tool).
    """
    try:
        channels: list[dict[str, Any]] = json.loads(channel_results_json)
    except json.JSONDecodeError:
        return json.dumps({"error": "Invalid JSON input for ranking"})

    if not channels:
        return json.dumps([])

    # Sort by net_realization descending
    sorted_channels = sorted(
        channels,
        key=lambda c: c.get("net_realization", 0),
        reverse=True,
    )

    # Assign ranks and generate rationale
    ranked: list[dict[str, Any]] = []
    for i, ch in enumerate(sorted_channels, start=1):
        rationale_parts = []

        # Highlight key cost drivers
        if ch.get("c_mandi", 0) > 0:
            rationale_parts.append(
                f"Mandi deductions of ₹{ch['c_mandi']:.0f}"
            )
        if ch.get("c_logistics", 0) > 0:
            rationale_parts.append(
                f"logistics cost ₹{ch['c_logistics']:.0f}"
            )
        if ch.get("c_shrinkage", 0) > 0:
            rationale_parts.append(
                f"transit shrinkage ₹{ch['c_shrinkage']:.0f}"
            )
        if ch.get("p_trust", 0) > 0:
            rationale_parts.append(
                f"trust penalty ₹{ch['p_trust']:.0f}"
            )

        # Note backhaul discount if applicable
        if "backhaul" in str(ch.get("channel_name", "")).lower():
            rationale_parts.append("backhaul discount applied")

        rationale = "; ".join(rationale_parts) if rationale_parts else "Optimal channel."
        rationale = (
            f"Net realization ₹{ch.get('net_realization', 0):.0f} "
            f"from gross ₹{ch.get('gross_revenue', 0):.0f}. {rationale}."
        )

        ranked.append({
            "rank": i,
            "channel_type": ch.get("channel_type", "UNKNOWN"),
            "channel_name": ch.get("channel_name", "Unknown"),
            "buyer_id": ch.get("buyer_id"),
            "transporter_id": ch.get("transporter_id"),
            "delivery_term": ch.get("delivery_term", "EX_FARM"),
            "gross_revenue": ch.get("gross_revenue", 0),
            "c_logistics": ch.get("c_logistics", 0),
            "c_mandi": ch.get("c_mandi", 0),
            "c_shrinkage": ch.get("c_shrinkage", 0),
            "p_trust": ch.get("p_trust", 0),
            "net_realization": ch.get("net_realization", 0),
            "economic_rationale": rationale,
        })

    return json.dumps(ranked, indent=2)
