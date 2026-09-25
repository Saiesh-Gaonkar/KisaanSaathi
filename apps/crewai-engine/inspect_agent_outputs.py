import asyncio
import json
import sys
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()

from crewai import Crew, Process
from app.config import settings
from app.firebase_client import get_firestore_client
from app.agents.market_agent import create_market_intelligence_agent, create_market_intelligence_task
from app.agents.logistics_agent import create_logistics_risk_agent, create_logistics_risk_task
from app.agents.strategist_agent import create_strategist_agent, create_strategist_task
from app.tools.routing_tools import get_decay_rate

async def main():
    print("=" * 80)
    print("      KISAANSATHI — 3-AGENT SIMULATION BREAKDOWN")
    print("=" * 80)

    db = get_firestore_client()
    batch_id = "batch_tomato_test_live"
    doc = db.collection("inventory_batches").document(batch_id).get()
    
    if not doc.exists:
        print(f"Batch {batch_id} not found.")
        return

    batch_data = doc.to_dict()
    crop = batch_data.get("crop", "Tomato")
    quantity_qtl = batch_data.get("quantity_qtl", 40)
    min_price = batch_data.get("min_price_per_qtl", 1800)
    farmer_location = batch_data.get("farmer_location", {})

    print(f"\nFarmer Batch Details:")
    print(f"  • Batch ID     : {batch_id}")
    print(f"  • Crop         : {crop}")
    print(f"  • Quantity     : {quantity_qtl} Quintals")
    print(f"  • Reserve Price: ₹{min_price}/Quintal (Floor: ₹{min_price * quantity_qtl:,.0f})")
    print(f"  • Location     : {farmer_location}")

    # Look up decay rate
    decay_result = json.loads(get_decay_rate.run(crop=crop))
    shrinkage_rate = decay_result.get("shrinkage_rate_percent", 1.5)

    llm = settings.get_crewai_llm()

    # Agent 1
    market_agent = create_market_intelligence_agent(llm=llm)
    market_task = create_market_intelligence_task(agent=market_agent, batch_id=batch_id, crop=crop)

    # Agent 2
    logistics_agent = create_logistics_risk_agent(llm=llm)
    logistics_task = create_logistics_risk_task(
        agent=logistics_agent,
        batch_id=batch_id,
        crop=crop,
        farmer_location=farmer_location,
        quantity_qtl=quantity_qtl,
    )

    # Agent 3
    strategist_agent = create_strategist_agent(llm=llm)
    strategist_task = create_strategist_task(
        agent=strategist_agent,
        batch_id=batch_id,
        crop=crop,
        quantity_qtl=quantity_qtl,
        min_price_per_qtl=min_price,
        shrinkage_rate_percent=shrinkage_rate,
    )
    strategist_task.context = [market_task, logistics_task]

    crew = Crew(
        agents=[market_agent, logistics_agent, strategist_agent],
        tasks=[market_task, logistics_task, strategist_task],
        process=Process.sequential,
        verbose=False,
    )

    print("\nExecuting agents sequentially (Market Analyst -> Logistics Analyst -> Lead Strategist)...")
    result = await crew.kickoff_async()

    print("\n" + "=" * 80)
    print("AGENT 1: MARKET INTELLIGENCE ANALYST OUTPUT")
    print("=" * 80)
    print(market_task.output.raw if hasattr(market_task, 'output') and market_task.output else "Executed")

    print("\n" + "=" * 80)
    print("AGENT 2: LOGISTICS & RISK ANALYST OUTPUT")
    print("=" * 80)
    print(logistics_task.output.raw if hasattr(logistics_task, 'output') and logistics_task.output else "Executed")

    print("\n" + "=" * 80)
    print("AGENT 3: LEAD ECONOMIC STRATEGIST (FINAL DECISION & RANKING)")
    print("=" * 80)
    print(strategist_task.output.raw if hasattr(strategist_task, 'output') and strategist_task.output else str(result))

if __name__ == "__main__":
    asyncio.run(main())
