import os
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from jose import jwt
from pwdlib import PasswordHash

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY or SECRET_KEY == "replace_this_with_a_random_secret_key":
    raise RuntimeError(
        "Set a strong, random SECRET_KEY in your root .env file."
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
)

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    """Return a secure hash of the password."""
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    """Check a password against its stored hash."""
    return password_hash.verify(password, hashed_password)


def create_access_token(
    subject: str,
    expires_minutes: int | None = None,
) -> str:
    """Create a signed JWT access token."""
    duration = (
        expires_minutes
        if expires_minutes is not None
        else ACCESS_TOKEN_EXPIRE_MINUTES
    )

    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=duration
    )

    payload = {
        "sub": subject,
        "exp": expires_at,
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
