"""
firebase_client.py — Singleton Firebase Admin SDK initialization.

Used by all tools and the FastAPI endpoint for Firestore reads/writes
and Firebase Auth token verification.
"""

from __future__ import annotations

import os

import firebase_admin
from firebase_admin import auth, credentials, firestore
from google.cloud.firestore_v1.client import Client as FirestoreClient


_app: firebase_admin.App | None = None


def _initialize() -> firebase_admin.App:
    """Initialize Firebase Admin SDK once using service account credentials."""
    global _app
    if _app is not None:
        return _app

    cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    project_id = os.environ.get("FIREBASE_PROJECT_ID", "kisaansaathi-28cec")

    if cred_path and os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        _app = firebase_admin.initialize_app(cred, {"projectId": project_id})
    else:
        # Fall back to Application Default Credentials (e.g., on Cloud Run)
        _app = firebase_admin.initialize_app(options={"projectId": project_id})

    return _app


def get_firestore_client() -> FirestoreClient:
    """Return a Firestore client, initializing Firebase if needed."""
    _initialize()
    return firestore.client()


def verify_id_token(token: str) -> dict:
    """
    Verify a Firebase Auth ID token. Returns the decoded token dict.
    Raises firebase_admin.auth.InvalidIdTokenError on failure.
    """
    _initialize()
    return auth.verify_id_token(token)
