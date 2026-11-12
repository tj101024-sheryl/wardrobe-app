import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import ACCESS_TOKEN_EXPIRE_MINUTES, ALGORITHM, GUEST_MODE, SECRET_KEY
from .database import get_db
from .models import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_guest_user(db: Session) -> User:
    user = db.query(User).filter(User.username == "guest").first()
    if user is None:
        user = User(
            email="guest@local",
            username="guest",
            password_hash=hash_password(os.urandom(16).hex()),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
    return f"pbkdf2${salt.hex()}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, salt_hex, hash_hex = stored.split("$")
        dk = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), bytes.fromhex(salt_hex), 200_000
        )
        return hmac.compare_digest(dk.hex(), hash_hex)
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if GUEST_MODE:
        if creds is None:
            return get_guest_user(db)
        try:
            payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
            user = db.get(User, int(payload["sub"]))
            if user is not None:
                return user
        except (jwt.PyJWTError, KeyError, ValueError):
            pass
        return get_guest_user(db)
    if creds is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="需要登入",
        )
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="憑證無效或已過期",
        )
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="使用者不存在")
    return user
