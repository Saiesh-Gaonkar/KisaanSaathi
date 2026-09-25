"""
routing_tools.py — CrewAI Tools for the Logistics & Risk Agent

Tools:
  1. get_distance        — Fetch distance between two points
                           (Google Routes → OSRM → Local matrix fallback)
  2. get_decay_rate      — Look up horticultural decay/shrinkage rate for a crop
  3. get_available_routes — Query Firestore transporter_routes with AVAILABLE status

Spec §4.2:
  - Uses Routing Tools for distances (Google Maps → OSRM → Local).
  - Identifies is_backhaul flags to apply discounts.
  - Looks up decay rates from horticultural_decay.json.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import httpx
from crewai.tools import tool

from app.firebase_client import get_firestore_client


DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"


@tool("Get Distance Between Locations")
def get_distance(origin: str, destination: str) -> str:
    """
    Get the distance in km and estimated duration between two locations.
    Uses a 3-tier fallback chain:
      1. Google Routes API (if GOOGLE_MAPS_API_KEY is set)
      2. OSRM public API (free, no key needed)
      3. Local distance matrix JSON (last resort)

    Args:
        origin: Origin location name or "lat,lng" coordinates.
        destination: Destination location name or "lat,lng" coordinates.
    """
    # ── Attempt 1: Google Routes API ──
    google_key = os.environ.get("GOOGLE_MAPS_API_KEY", "")
    if google_key:
        try:
            result = _google_routes_distance(origin, destination, google_key)
            if result:
                return json.dumps(result)
        except Exception:
            pass  # Fall through

    # ── Attempt 2: OSRM (free public instance) ──
    try:
        result = _osrm_distance(origin, destination)
        if result:
            return json.dumps(result)
    except Exception:
        pass  # Fall through

    # ── Attempt 3: Local distance matrix ──
    result = _local_matrix_distance(origin, destination)
    return json.dumps(result)


def _google_routes_distance(
    origin: str, destination: str, api_key: str
) -> dict[str, Any] | None:
    """
    Call Google Maps Distance Matrix API.
    Returns {"distance_km": float, "duration_hr": float, "source": "google_routes"} or None.
    """
    url = "https://maps.googleapis.com/maps/api/distancematrix/json"
    resp = httpx.get(
        url,
        params={
            "origins": origin,
            "destinations": destination,
            "key": api_key,
            "units": "metric",
        },
        timeout=10.0,
    )
    if resp.status_code != 200:
        return None

    data = resp.json()
    rows = data.get("rows", [])
    if not rows:
        return None

    elements = rows[0].get("elements", [])
    if not elements or elements[0].get("status") != "OK":
        return None

    element = elements[0]
    distance_m = element["distance"]["value"]
    duration_s = element["duration"]["value"]

    return {
        "distance_km": round(distance_m / 1000.0, 1),
        "duration_hr": round(duration_s / 3600.0, 2),
        "source": "google_routes",
    }


def _osrm_distance(origin: str, destination: str) -> dict[str, Any] | None:
    """
    Call the public OSRM routing service.
    Expects origin/destination as "lat,lng" strings.
    Returns {"distance_km": float, "duration_hr": float, "source": "osrm"} or None.
    """
    # OSRM expects lng,lat format
    try:
        orig_parts = origin.split(",")
        dest_parts = destination.split(",")
        if len(orig_parts) == 2 and len(dest_parts) == 2:
            orig_coord = f"{orig_parts[1].strip()},{orig_parts[0].strip()}"
            dest_coord = f"{dest_parts[1].strip()},{dest_parts[0].strip()}"
        else:
            return None  # Can't use OSRM without coordinates
    except (ValueError, IndexError):
        return None

    url = f"http://router.project-osrm.org/route/v1/driving/{orig_coord};{dest_coord}"
    resp = httpx.get(url, params={"overview": "false"}, timeout=10.0)

    if resp.status_code != 200:
        return None

    data = resp.json()
    routes = data.get("routes", [])
    if not routes:
        return None

    route = routes[0]
    distance_m = route.get("distance", 0)
    duration_s = route.get("duration", 0)

    return {
        "distance_km": round(distance_m / 1000.0, 1),
        "duration_hr": round(duration_s / 3600.0, 2),
        "source": "osrm",
    }


def _local_matrix_distance(origin: str, destination: str) -> dict[str, Any]:
    """
    Look up distance from the local JSON matrix.
    Tries both "Origin-Destination" and "Destination-Origin" key formats.
    Returns {"distance_km": float, "duration_hr": float, "source": "local_matrix"}
    or an error dict if not found.
    """
    matrix_path = DATA_DIR / "local_distance_matrix.json"
    if not matrix_path.exists():
        return {
            "error": f"No distance data for {origin} → {destination}",
            "distance_km": 0.0,
            "duration_hr": 0.0,
            "source": "none",
        }

    with open(matrix_path) as f:
        matrix = json.load(f)

    # Extract city names from full addresses/coordinates
    origin_city = _extract_city_name(origin)
    dest_city = _extract_city_name(destination)

    # Try both key orderings
    for key in [f"{origin_city}-{dest_city}", f"{dest_city}-{origin_city}"]:
        if key in matrix:
            entry = matrix[key]
            return {
                "distance_km": entry["distance_km"],
                "duration_hr": entry["duration_hr"],
                "source": "local_matrix",
            }

    return {
        "error": f"No distance data for {origin_city} → {dest_city}",
        "distance_km": 0.0,
        "duration_hr": 0.0,
        "source": "none",
    }


def _extract_city_name(location: str) -> str:
    """
    Extract a city name from a location string.
    Handles: plain names ("Hubballi"), addresses ("Hubballi, Karnataka"),
    and coordinates ("15.36,75.12") — for coords, returns as-is.
    """
    # If it looks like coordinates, return as-is
    parts = location.split(",")
    if len(parts) == 2:
        try:
            float(parts[0].strip())
            float(parts[1].strip())
            return location  # It's coords, can't extract city
        except ValueError:
            pass

    # Take first part of comma-separated address
    return parts[0].strip()


@tool("Get Crop Decay Rate")
def get_decay_rate(crop: str) -> str:
    """
    Look up the horticultural decay/shrinkage rate for a crop.
    Returns the midpoint of the shrinkage range (spec §2.2 note).

    Args:
        crop: The crop name (e.g., "Tomato", "Onion").
    """
    decay_path = DATA_DIR / "horticultural_decay.json"
    if not decay_path.exists():
        return json.dumps({
            "crop": crop,
            "shrinkage_rate_percent": 1.0,
            "source": "default_fallback",
        })

    with open(decay_path) as f:
        decay_data = json.load(f)

    if crop not in decay_data:
        return json.dumps({
            "crop": crop,
            "shrinkage_rate_percent": 1.0,
            "source": "default_fallback",
            "note": f"No decay data for '{crop}', using default 1.0%",
        })

    rate_range = decay_data[crop]["shrinkage_rate_percent_per_100km"]
    midpoint = (rate_range[0] + rate_range[1]) / 2.0

    return json.dumps({
        "crop": crop,
        "shrinkage_rate_percent": midpoint,
        "range": rate_range,
        "source": "horticultural_decay.json",
    })


@tool("Get Available Transporter Routes")
def get_available_routes(origin_area: str) -> str:
    """
    Query Firestore for all AVAILABLE transporter routes.
    Returns routes with their tariffs, backhaul flags, and trust scores.

    Spec §6.2: Query transporter_routes where status == "AVAILABLE".

    Args:
        origin_area: The general area/city of the farmer (used for logging context).
    """
    db = get_firestore_client()

    routes_ref = (
        db.collection("transporter_routes")
        .where("status", "==", "AVAILABLE")
    )
    route_docs = routes_ref.stream()

    routes: list[dict[str, Any]] = []

    for doc in route_docs:
        route = doc.to_dict()
        routes.append({
            "route_id": doc.id,
            "transporter_id": route.get("transporter_id", ""),
            "transporter_name": route.get("transporter_name", ""),
            "vehicle_type": route.get("vehicle_type", ""),
            "capacity_qtl": route.get("capacity_qtl", 0),
            "origin": route.get("origin", ""),
            "destination": route.get("destination", ""),
            "distance_km": route.get("distance_km", 0),
            "is_backhaul": route.get("is_backhaul", False),
            "tariff_per_km": route.get("tariff_per_km", 0),
            "cleaning_charge": route.get("cleaning_charge", 0),
            "labour_charge": route.get("labour_charge", 0),
            "maintenance_charge": route.get("maintenance_charge", 0),
            "total_vehicle_price": route.get("total_vehicle_price", 0),
            "transporter_trust_snapshot": route.get("transporter_trust_snapshot", 3.5),
        })

    return json.dumps(routes, indent=2, default=str)
