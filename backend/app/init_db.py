"""
Database initialization & migration script for StudyForge AI.
Creates all missing tables without altering or deleting existing tables/data.
"""
import sys
from pathlib import Path

# Ensure backend root is on sys.path
_backend = Path(__file__).resolve().parent.parent
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

from app.database import engine, Base
import app.models  # noqa: F401 registers all models on Base.metadata

def init_db():
    print("[init_db] Creating missing tables on SQLite database...")
    Base.metadata.create_all(bind=engine)
    print("[init_db] Database initialized successfully.")

if __name__ == "__main__":
    init_db()
