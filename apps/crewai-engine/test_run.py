import asyncio
import json
import os
import sys
from dotenv import load_dotenv

# Set UTF-8 stdout
sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

from app.main import _run_crew_pipeline
from app.firebase_client import get_firestore_client

async def main():
    print("=" * 60)
    print("KISAANSATHI CREWAI MULTI-AGENT ENGINE VERIFICATION")
    print("=" * 60)
    
    db = get_firestore_client()
    batch_id = "batch_tomato_test_live"
    doc = db.collection("inventory_batches").document(batch_id).get()
    
    if not doc.exists:
        print(f"Error: Batch {batch_id} not found in Firestore.")
        return
        
    batch_data = doc.to_dict()
    print(f"Found live batch: {batch_id}")
    print(f"Crop: {batch_data.get('crop')}, Quantity: {batch_data.get('quantity_qtl')} qtl")
    print(f"Farmer Location: {batch_data.get('farmer_location')}")
    print("\nStarting 3-Agent Sequential Pipeline (Market Intelligence -> Logistics & Risk -> Strategist)...")
    
    recommendations = await _run_crew_pipeline(batch_id, batch_data, db)
    
    print("\n" + "=" * 60)
    print("CREWAI PIPELINE RESULT: SUCCESS")
    print("=" * 60)
    print(f"Generated {len(recommendations)} recommendations:")
    print(json.dumps(recommendations, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(main())
