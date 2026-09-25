"""
config.py — Application configuration loaded from environment variables.
"""

from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Centralized settings pulled from .env / environment."""

    # LLM Provider: "vertex_ai" (Google Cloud credits) or "google" (consumer API key)
    LLM_PROVIDER: str = os.environ.get("LLM_PROVIDER", "vertex_ai")

    # Vertex AI settings (when LLM_PROVIDER=vertex_ai)
    VERTEX_AI_PROJECT: str = os.environ.get("VERTEX_AI_PROJECT", "kisaansaathi-28cec")
    VERTEX_AI_LOCATION: str = os.environ.get("VERTEX_AI_LOCATION", "us-central1")

    # Gemini model name
    GEMINI_MODEL: str = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

    # Consumer Gemini API key (when LLM_PROVIDER=google)
    GOOGLE_API_KEY: str = os.environ.get("GOOGLE_API_KEY", "")

    # Firebase
    GOOGLE_APPLICATION_CREDENTIALS: str = os.environ.get(
        "GOOGLE_APPLICATION_CREDENTIALS", ""
    )
    FIREBASE_PROJECT_ID: str = os.environ.get(
        "FIREBASE_PROJECT_ID", "kisaansaathi-28cec"
    )

    # External APIs (optional)
    GOOGLE_MAPS_API_KEY: str = os.environ.get("GOOGLE_MAPS_API_KEY", "")
    AGMARKNET_API_URL: str = os.environ.get("AGMARKNET_API_URL", "")

    def get_crewai_llm(self):
        """
        Return a CrewAI LLM instance configured for the chosen provider.

        - Vertex AI: uses service account (GOOGLE_APPLICATION_CREDENTIALS)
        - Consumer API: uses GOOGLE_API_KEY
        """
        from crewai import LLM

        if self.LLM_PROVIDER == "vertex_ai":
            return LLM(
                model=f"vertex_ai/{self.GEMINI_MODEL}",
                project=self.VERTEX_AI_PROJECT,
                location=self.VERTEX_AI_LOCATION,
                temperature=0.2,
            )
        else:
            return LLM(
                model=f"gemini/{self.GEMINI_MODEL}",
                api_key=self.GOOGLE_API_KEY,
                temperature=0.2,
            )


settings = Settings()
