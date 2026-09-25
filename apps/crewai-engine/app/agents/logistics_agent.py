"""
logistics_agent.py — Logistics & Risk Agent (Agent 2 of 3)

Spec §4.2:
  - allow_delegation = False
  - Uses Routing Tools for distances (Google Maps → OSRM → Local).
  - Identifies is_backhaul flags to apply discounts.
  - Looks up decay rates from horticultural_decay.json.

This agent runs second in the sequential pipeline. It enriches the
market data from Agent 1 with logistics costs, transit risks, and
available transporter information.
"""

from __future__ import annotations

from crewai import Agent, Task

from app.tools.routing_tools import get_available_routes, get_decay_rate, get_distance


def create_logistics_risk_agent(llm) -> Agent:
    """
    Factory function that creates the Logistics & Risk Agent.

    Args:
        llm: A CrewAI-compatible LLM instance (e.g., Gemini via LiteLLM).

    Returns:
        A configured CrewAI Agent.
    """
    return Agent(
        role="Logistics & Risk Analyst",
        goal=(
            "Determine transport logistics and transit risks for all viable "
            "delivery channels. Fetch distances between the farmer's location "
            "and each potential destination (mandis, buyer locations). Identify "
            "backhaul opportunities for cost savings. Look up crop-specific "
            "decay/shrinkage rates for transit risk assessment."
        ),
        backstory=(
            "You are a seasoned agricultural logistics specialist who understands "
            "the road networks of Karnataka intimately. You know which routes have "
            "backhaul opportunities (empty return trips that transporters discount), "
            "how quickly different crops deteriorate in transit, and which "
            "transporters are reliable. Your data feeds directly into the "
            "economic strategist's net-realization calculations."
        ),
        tools=[get_distance, get_decay_rate, get_available_routes],
        llm=llm,
        allow_delegation=False,
        verbose=True,
    )


def create_logistics_risk_task(
    agent: Agent,
    batch_id: str,
    crop: str,
    farmer_location: dict,
    quantity_qtl: float,
) -> Task:
    """
    Create the task for the Logistics & Risk Agent.

    Args:
        agent: The Logistics & Risk Agent instance.
        batch_id: The inventory batch ID.
        crop: The crop name (e.g., "Tomato").
        farmer_location: Dict with 'address', 'latitude', 'longitude'.
        quantity_qtl: Quantity in quintals (to check transporter capacity).

    Returns:
        A CrewAI Task that gathers logistics and risk data.
    """
    farmer_address = farmer_location.get("address", "Unknown")
    farmer_lat = farmer_location.get("latitude", "")
    farmer_lng = farmer_location.get("longitude", "")
    farmer_coords = f"{farmer_lat},{farmer_lng}" if farmer_lat and farmer_lng else ""

    return Task(
        description=(
            f"Analyze logistics and transit risks for batch '{batch_id}' "
            f"containing {quantity_qtl} quintals of '{crop}'.\n"
            f"Farmer location: {farmer_address}"
            + (f" (coords: {farmer_coords})" if farmer_coords else "")
            + "\n\n"
            "Steps:\n"
            f"1. Use 'Get Crop Decay Rate' with crop='{crop}' to get the "
            "shrinkage rate for transit risk calculations.\n"
            f"2. Use 'Get Available Transporter Routes' with origin_area='{farmer_address}' "
            "to fetch all available transporter routes from Firestore. Note which routes "
            "have is_backhaul=true (these qualify for the 27.5% backhaul discount).\n"
            "3. For each relevant route/destination, if coordinates are available, "
            "use 'Get Distance Between Locations' to verify or supplement distances.\n"
            f"4. Filter out transporters whose capacity_qtl < {quantity_qtl} "
            "(they can't carry the full batch).\n"
            "5. Compile all logistics data into a structured summary.\n\n"
            "IMPORTANT: Do NOT compute any monetary figures yourself. "
            "Just gather distances, decay rates, backhaul flags, and tariffs. "
            "The Economic Strategist will handle all financial calculations."
        ),
        expected_output=(
            "A JSON object with two keys:\n"
            "- 'decay_info': {crop, shrinkage_rate_percent}\n"
            "- 'available_transport': list of transport option objects, each containing:\n"
            "  route_id, transporter_id, transporter_name, origin, destination, "
            "  distance_km, tariff_per_km, is_backhaul, capacity_qtl, "
            "  transporter_trust_snapshot, and distance_source"
        ),
        agent=agent,
    )
