from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

import jwt
from passlib.context import CryptContext

from src.config import config
from src.users.models import RoleEnum


password_context = CryptContext(schemes=['bcrypt'])


def get_password_hash(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_context.verify(password, hashed_password)


def create_access_token(user_id: UUID, role: RoleEnum) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=config.secure.access_ttl)
    payload = {
        'sub': str(user_id),
        'role': role.value,
        'exp': expire,
        'type': 'access'
    }
    token = jwt.encode(payload, config.secure.secret_key.get_secret_value(), algorithm=config.secure.algorithm)
    return token


def create_refresh_token(user_id: UUID) -> tuple[str, datetime]:
    expire = datetime.now(UTC) + timedelta(days=config.secure.refresh_ttl)
    payload = {
        'sub': str(user_id),
        'exp': expire,
        'type': 'refresh'
    }
    token = jwt.encode(payload, config.secure.secret_key.get_secret_value(), algorithm=config.secure.algorithm)
    return token, expire


def decode_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            config.secure.secret_key.get_secret_value(),
            algorithms=[config.secure.algorithm]
        )
        return payload
    except jwt.ExpiredSignatureError as err:
        raise ValueError('Token has expired') from err
    except jwt.InvalidTokenError as err:
        raise ValueError('Invalid token') from err
