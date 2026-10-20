import json
import secrets
import urllib.parse
import urllib.request

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from ..database import get_db
from ..config import GOOGLE_CLIENT_ID, GOOGLE_ENABLED, GOOGLE_TOKENINFO_URL
from ..models.user import User
from ..schemas.auth import SignupRequest, LoginRequest, TokenResponse, UserResponse, GoogleLoginRequest
from ..services.auth_service import hash_password, verify_password, create_token, decode_token

router = APIRouter(tags=["Authentication"])
_bearer = HTTPBearer(auto_error=True)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid. Please log in again.",
        )
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account no longer exists.",
        )
    return user


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Try logging in.",
        )
    user = User(email=body.email, hashed_password=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_token(user.id, user.email)
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )
    token = create_token(user.id, user.email)
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
def me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.get("/auth/config", status_code=status.HTTP_200_OK)
def auth_config():
    """Tells the frontend whether real Google sign-in is configured, and with which client ID."""
    return {"google_enabled": GOOGLE_ENABLED, "google_client_id": GOOGLE_CLIENT_ID}


def _verify_google_id_token(credential: str) -> dict:
    """
    Verify a Google ID token against Google's own tokeninfo endpoint.
    Returns the token claims on success; raises HTTPException otherwise.
    No external libraries required — this is a plain HTTPS call to Google.
    """
    url = f"{GOOGLE_TOKENINFO_URL}?{urllib.parse.urlencode({'id_token': credential})}"
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            claims = json.loads(resp.read().decode("utf-8"))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google rejected this sign-in token. Please try again.",
        )

    # Audience must match our client ID (guards against tokens issued for other apps).
    if GOOGLE_CLIENT_ID and claims.get("aud") != GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This Google sign-in was issued for a different app.",
        )
    if claims.get("email_verified") not in (True, "true"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your Google email isn't verified.",
        )
    if not claims.get("email"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google didn't return an email for this account.",
        )
    return claims


@router.post("/auth/google", response_model=TokenResponse, status_code=status.HTTP_200_OK)
def google_login(body: GoogleLoginRequest, db: Session = Depends(get_db)):
    """Sign in (or auto-register) with a real Google account via a GIS ID token."""
    if not GOOGLE_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google sign-in isn't configured on the server yet. "
                   "Set GOOGLE_CLIENT_ID (see SETUP_GOOGLE_LOGIN.md), or use email + password.",
        )

    claims = _verify_google_id_token(body.credential)
    email = claims["email"].strip().lower()

    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Google-only account: store an unusable password sentinel (never matches PBKDF2).
        user = User(email=email, hashed_password=f"google_oauth${secrets.token_hex(16)}")
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_token(user.id, user.email)
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))
