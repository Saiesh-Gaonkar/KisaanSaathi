"""
strategist_agent.py — Lead Economic Strategist Agent (Agent 3 of 3)

Spec §4.3:
  - allow_delegation = True  (can delegate unsafe routes back to Logistics)
  - Iterates through every viable channel combination.
  - Passes each into deterministic formulas.py functions.
  - Compiles the ai_recommendations array ranked by highest Net Realization.

This is the final agent in the sequential pipeline. It consumes outputs
from Agent 1 (market data) and Agent 2 (logistics data), runs the math,
and produces the spec §2.1 output schema.
"""

from __future__ import annotations

from crewai import Agent, Task

from app.tools.strategy_tools import compute_channel_economics, rank_channels


def create_strategist_agent(llm) -> Agent:
    """
    Factory function that creates the Lead Economic Strategist Agent.

    Args:
        llm: A CrewAI-compatible LLM instance.

    Returns:
        A configured CrewAI Agent with delegation enabled.
    """
    return Agent(
        role="Lead Economic Strategist",
        goal=(
            "Determine the optimal sales channel for the farmer's crop batch "
            "by evaluating every viable bid-route combination. Use the "
            "'Compute Channel Economics' tool for ALL financial calculations — "
            "never compute rupee figures yourself. Rank all options by "
            "Net Realization (highest first) and produce the final "
            "ai_recommendations array."
        ),
        backstory=(
            "You are the chief agricultural economist at KisaanSathi, responsible "
            "for the final recommendation that directly impacts farmer livelihoods. "
            "You combine market intelligence and logistics data to evaluate every "
            "possible sales channel. You are meticulous about using deterministic "
            "calculations and never approximate financial figures. Your output is "
            "the definitive ranking that the farmer sees on their dashboard."
        ),
        tools=[compute_channel_economics, rank_channels],
        llm=llm,
        allow_delegation=True,
        verbose=True,
    )


def create_strategist_task(
    agent: Agent,
    batch_id: str,
    crop: str,
    quantity_qtl: float,
    min_price_per_qtl: float,
    shrinkage_rate_percent: float,
) -> Task:
    """
    Create the task for the Lead Economic Strategist Agent.

    This task consumes the outputs of Agent 1 (market_task) and
    Agent 2 (logistics_task) via CrewAI's context mechanism.

    Args:
        agent: The Strategist Agent instance.
        batch_id: The inventory batch ID.
        crop: The crop name.
        quantity_qtl: Quantity in quintals.
        min_price_per_qtl: Farmer's minimum acceptable price.
        shrinkage_rate_percent: Crop shrinkage midpoint from decay data.

    Returns:
        A CrewAI Task that produces the final ai_recommendations.
    """
    return Task(
        description=(
            f"Produce the final ranked ai_recommendations for batch '{batch_id}' "
            f"({quantity_qtl} qtl of {crop}, min price ₹{min_price_per_qtl}/qtl).\n\n"
            "You have access to market data (modal prices + eligible buyer bids) "
            "and logistics data (transporter routes + distances + decay rates) "
            "from the previous agents' outputs.\n\n"
            "Steps:\n"
            "1. Extract all viable channel combinations from the context:\n"
            "   - APMC_MANDI channels: each mandi with its modal price, paired with "
            "each available transporter route to that mandi.\n"
            "   - DIRECT_BUYER channels: each buyer bid paired with a transporter.\n"
            "   - For EX_FARM bids, the buyer picks up — use distance_km=0, "
            "tariff_per_km=0, transporter_trust_score=5.0.\n\n"
            "2. For EACH combination, call the 'Compute Channel Economics' tool with:\n"
            f"   - quantity_qtl={quantity_qtl}\n"
            "   - price_per_qtl: the bid's offered_price_per_qtl or mandi's modal_price\n"
            "   - distance_km, tariff_per_km, is_backhaul: from the transporter route\n"
            "   - delivery_term: 'FOR_MANDI' for mandi channels, or the bid's delivery_term\n"
            f"   - shrinkage_rate_percent={shrinkage_rate_percent}\n"
            "   - buyer_trust_score: from the bid, or 5.0 for mandi channels\n"
            "   - transporter_trust_score: from the route\n"
            "   - channel_type: 'APMC_MANDI' or 'DIRECT_BUYER'\n"
            "   - channel_name: mandi name or buyer name\n"
            "   - buyer_id, transporter_id: corresponding IDs\n\n"
            "3. Collect ALL results into a JSON array.\n\n"
            "4. Call the 'Rank Channels By Net Realization' tool with the JSON array "
            "to get the final ranked recommendations.\n\n"
            f"5. Filter out any channel where net_realization < {min_price_per_qtl} × {quantity_qtl} "
            f"(= ₹{min_price_per_qtl * quantity_qtl:.0f}), as the farmer won't accept less.\n\n"
            "CRITICAL RULES:\n"
            "- NEVER compute rupee figures yourself. Always use the tools.\n"
            "- If no viable channels exist, return an empty array [].\n"
            "- The final output MUST be a valid JSON array matching the schema."
        ),
        expected_output=(
            "A valid JSON array of recommendation objects, each with exactly these fields:\n"
            "rank, channel_type, channel_name, buyer_id, transporter_id, delivery_term, "
            "gross_revenue, c_logistics, c_mandi, c_shrinkage, p_trust, net_realization, "
            "economic_rationale.\n\n"
            "The array must be sorted by net_realization descending (rank 1 = best).\n"
            "Return ONLY the JSON array, no other text."
        ),
        agent=agent,
    )
