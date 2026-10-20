"""
Central runtime configuration for StudyForge.

Values are read from environment variables so nothing secret is committed.
The one value you may need to set for real Google sign-in is GOOGLE_CLIENT_ID
(see SETUP_GOOGLE_LOGIN.md at the project root).

For convenience you can also drop it in a `.env` file (KEY=VALUE per line) next
to the backend or at the project root instead of exporting it every launch.
Real environment variables always win over the file.
"""
import os
from pathlib import Path


def _clean(value: str) -> str:
    return (value or "").strip().strip('"').strip("'")


def _load_env_file(path: Path) -> None:
    """Minimal stdlib-only .env loader: `KEY=VALUE` lines, `#` comments.
    Never overwrites a variable that is already set in the real environment."""
    try:
        text = path.read_text(encoding="utf-8")
    except (FileNotFoundError, OSError):
        return
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        if key and key not in os.environ:
            os.environ[key] = _clean(val)


# Load a .env from the backend folder and the project root (if present) so the
# GOOGLE_CLIENT_ID can be set once in a file rather than exported each time.
_here = Path(__file__).resolve()
_load_env_file(_here.parent.parent / ".env")          # backend/.env
_load_env_file(_here.parent.parent.parent / ".env")   # project-root/.env


# OAuth 2.0 Web client ID from Google Cloud Console.
# Empty string => Google sign-in is offered but honestly reports "not configured"
# instead of pretending to work. Email/password auth works with or without this.
GOOGLE_CLIENT_ID = _clean(os.environ.get("GOOGLE_CLIENT_ID", ""))

# Google's public tokeninfo endpoint — verifies an ID token without extra deps.
GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"

GOOGLE_ENABLED = bool(GOOGLE_CLIENT_ID)

# YouTube Data API v3 key
YOUTUBE_API_KEY = _clean(os.environ.get("YOUTUBE_API_KEY", ""))
