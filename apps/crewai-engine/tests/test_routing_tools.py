"""
test_routing_tools.py — Unit tests for routing fallback logic.

Tests the local distance matrix lookup and decay rate retrieval
without requiring external APIs or Firestore.
"""

import json
from unittest.mock import patch

import pytest

from app.tools.routing_tools import (
    _extract_city_name,
    _local_matrix_distance,
    get_decay_rate,
)


class TestLocalDistanceMatrix:
    """Test the last-resort local distance matrix fallback."""

    def test_direct_key_match(self):
        result = _local_matrix_distance("Hubballi", "Belagavi")
        assert result["distance_km"] == 98.0
        assert result["duration_hr"] == 2.1
        assert result["source"] == "local_matrix"

    def test_reverse_key_match(self):
        """Matrix should work in both directions."""
        result = _local_matrix_distance("Belagavi", "Hubballi")
        assert result["distance_km"] == 98.0
        assert result["source"] == "local_matrix"

    def test_unknown_route_returns_error(self):
        result = _local_matrix_distance("Mumbai", "Delhi")
        assert "error" in result
        assert result["distance_km"] == 0.0


class TestCityNameExtraction:
    """Test city name extraction from various location formats."""

    def test_plain_city_name(self):
        assert _extract_city_name("Hubballi") == "Hubballi"

    def test_city_with_state(self):
        assert _extract_city_name("Hubballi, Karnataka") == "Hubballi"

    def test_coordinates_returned_as_is(self):
        result = _extract_city_name("15.36,75.12")
        assert result == "15.36,75.12"


class TestDecayRate:
    """Test crop decay rate lookup."""

    def test_tomato_midpoint(self):
        result = json.loads(get_decay_rate.run(crop="Tomato"))
        # Midpoint of [1.2, 1.8] = 1.5
        assert result["shrinkage_rate_percent"] == 1.5
        assert result["crop"] == "Tomato"

    def test_onion_midpoint(self):
        result = json.loads(get_decay_rate.run(crop="Onion"))
        # Midpoint of [0.2, 0.4] = 0.3
        assert result["shrinkage_rate_percent"] == pytest.approx(0.3)

    def test_unknown_crop_uses_default(self):
        result = json.loads(get_decay_rate.run(crop="Mango"))
        assert result["shrinkage_rate_percent"] == 1.0
        assert result["source"] == "default_fallback"
