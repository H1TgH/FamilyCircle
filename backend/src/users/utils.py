from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

import jwt
from passlib.context import CryptContext

from src.config import config
from src.minio import MinioClient
from src.users.models import RoleEnum, UserModel


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
    except jwt.ExpiredSignatureError as e:
        raise ValueError('Token has expired') from e
    except jwt.InvalidTokenError as e:
        raise ValueError('Invalid token') from e


async def get_avatar_presigned_url(user: UserModel) -> str | None:
    if not user.is_has_avatar:
        return None

    bucket_name = config.minio.define_buckets['avatars']
    if not bucket_name:
        return None

    minio_client = MinioClient(bucket_name=bucket_name)

    async with minio_client.get_client() as client:
        url = await client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': f'user_{user.id}'},
            ExpiresIn=600
        )

        return url
