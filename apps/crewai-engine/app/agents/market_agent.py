"""
market_agent.py — Market Intelligence Agent (Agent 1 of 3)

Spec §4.1:
  - allow_delegation = False
  - Uses Market Tools to get modal prices and open bids.
  - Strict Rule: Filter out buyer_bids where buyer_trust_score < 3.5
    UNLESS user_status == "PROVISIONAL".

This agent is the first in the sequential CrewAI pipeline. It gathers
all market data (mandi prices + buyer bids) that downstream agents
(Logistics, Strategist) will consume.
"""

from __future__ import annotations

from crewai import Agent, Task

from app.tools.market_tools import get_modal_prices, get_open_bids


def create_market_intelligence_agent(llm) -> Agent:
    """
    Factory function that creates the Market Intelligence Agent.

    Args:
        llm: A CrewAI-compatible LLM instance (e.g., Gemini via LiteLLM).

    Returns:
        A configured CrewAI Agent.
    """
    return Agent(
        role="Market Intelligence Analyst",
        goal=(
            "Gather comprehensive market data for the farmer's crop batch. "
            "Fetch current APMC mandi modal prices and retrieve all eligible "
            "buyer bids from the platform, applying trust-based filtering."
        ),
        backstory=(
            "You are an expert agricultural market analyst with deep knowledge "
            "of APMC mandi pricing across Karnataka. You track modal prices from "
            "Agmarknet and evaluate buyer credibility. Your analysis forms the "
            "foundation for the economic strategist's channel ranking decisions."
        ),
        tools=[get_modal_prices, get_open_bids],
        llm=llm,
        allow_delegation=False,
        verbose=True,
    )


def create_market_intelligence_task(
    agent: Agent,
    batch_id: str,
    crop: str,
) -> Task:
    """
    Create the task for the Market Intelligence Agent.

    Args:
        agent: The Market Intelligence Agent instance.
        batch_id: The inventory batch ID to analyze.
        crop: The crop name (e.g., "Tomato").

    Returns:
        A CrewAI Task that gathers market data.
    """
    return Task(
        description=(
            f"Analyze market conditions for batch '{batch_id}' containing '{crop}'.\n\n"
            "Steps:\n"
            f"1. Use the 'Get Modal Prices' tool with crop='{crop}' to fetch "
            "current APMC mandi modal prices from all available mandis.\n"
            f"2. Use the 'Get Open Buyer Bids' tool with batch_id='{batch_id}' "
            "to retrieve all eligible open bids. The tool automatically applies "
            "the trust filter (trust >= 3.5 OR buyer is PROVISIONAL).\n"
            "3. Compile all gathered data into a structured summary.\n\n"
            "IMPORTANT: Do NOT compute any monetary figures yourself. "
            "Just gather and organize the raw market data."
        ),
        expected_output=(
            "A JSON object with two keys:\n"
            "- 'modal_prices': dict of mandi names to their modal prices for this crop\n"
            "- 'eligible_bids': list of bid objects that passed the trust filter, "
            "each containing bid_id, buyer_id, buyer_name, offered_price_per_qtl, "
            "delivery_term, and buyer_trust_snapshot"
        ),
        agent=agent,
    )
