from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import delete, or_, select, update

from src.config import config
from src.database import SessionDep
from src.minio import MinioClient
from src.users.dependencies import get_current_user
from src.users.models import RefreshTokenModel, RoleEnum, UserModel
from src.users.schemas import (
    LoginRequestSchema,
    RefreshTokenRequestSchema,
    RelativeRegistrationSchema,
    TokenResponseSchema,
    UserSchema,
    UserUpdateSchema,
    VolunteerRegistrationSchema,
)
from src.users.utils import (
    convert_to_webp,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_avatar_presigned_url,
    get_password_hash,
    verify_password,
)


users_router = APIRouter()


async def _register_user(
    user_data: RelativeRegistrationSchema | VolunteerRegistrationSchema,
    role: RoleEnum,
    session: SessionDep
) -> dict[str, str]:
    is_user_exists = await session.execute(
        select(UserModel).where(
            or_(
                UserModel.login == user_data.login,
                UserModel.email == user_data.email,
                UserModel.phone_number == user_data.phone_number
            )
        )
    )
    existing_user = is_user_exists.scalar_one_or_none()

    if existing_user:
        if existing_user.login == user_data.login:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='User with this login already exists.'
            )
        elif existing_user.email == user_data.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='User with this email already exists.'
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='User with this phone number already exists.'
            )

    hashed_password = get_password_hash(user_data.password)

    user = UserModel(
        login=user_data.login,
        email=user_data.email,
        surname=user_data.surname,
        name=user_data.name,
        patronymic=user_data.patronymic,
        phone_number=user_data.phone_number,
        password=hashed_password,
        birthday=getattr(user_data, 'birthday', None),
        role=role,
        is_has_avatar=False
    )

    session.add(user)
    await session.commit()
    await session.refresh(user)

    access_token = create_access_token(user.id, user.role)
    refresh_token, expires_at = create_refresh_token(user.id)

    refresh_token_model = RefreshTokenModel(
        user_id=user.id,
        token=refresh_token,
        expires_at=expires_at,
    )
    session.add(refresh_token_model)
    await session.commit()

    return {
        'access_token': access_token,
        'refresh_token': refresh_token,
    }


@users_router.post(
    '/api/v1/users/register/relative',
    response_model=TokenResponseSchema,
    status_code=status.HTTP_201_CREATED,
    tags=['users']
)
async def register_relative(
    user_data: RelativeRegistrationSchema,
    session: SessionDep
):
    return await _register_user(user_data, RoleEnum.RELATIVE, session)


@users_router.post(
    '/api/v1/users/register/volunteer',
    response_model=TokenResponseSchema,
    status_code=status.HTTP_201_CREATED,
    tags=['users']
)
async def register_volunteer(
    user_data: VolunteerRegistrationSchema,
    session: SessionDep
):
    return await _register_user(user_data, RoleEnum.VOLUNTEER, session)


@users_router.post(
    '/api/v1/users/login',
    response_model=TokenResponseSchema,
    tags=['users']
)
async def login_user(
    creds: LoginRequestSchema,
    session: SessionDep
):
    result = await session.execute(
        select(UserModel).where(
            or_(
                UserModel.login == creds.login_or_email,
                UserModel.email == creds.login_or_email
            )
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Incorrect login/email or password'
        )

    if not verify_password(creds.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Incorrect login/email or password'
        )

    access_token = create_access_token(user.id, user.role)
    refresh_token, expires_at = create_refresh_token(user.id)

    refresh_token_model = RefreshTokenModel(
        user_id=user.id,
        token=refresh_token,
        expires_at=expires_at,
    )
    session.add(refresh_token_model)
    await session.commit()

    return {
        'access_token': access_token,
        'refresh_token': refresh_token
    }


@users_router.post(
    '/api/v1/users/refresh-token',
    response_model=TokenResponseSchema,
    tags=['users']
)
async def refresh_token(
    token_data: RefreshTokenRequestSchema,
    session: SessionDep
):
    await session.execute(
        delete(RefreshTokenModel).where(
            RefreshTokenModel.expires_at < datetime.now(UTC)
        )
    )

    try:
        payload = decode_token(token_data.refresh_token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        ) from e

    if payload.get('type') != 'refresh':
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid token type'
        )

    result = await session.execute(
        select(RefreshTokenModel).where(
            RefreshTokenModel.token == token_data.refresh_token
        )
    )
    stored_token = result.scalar_one_or_none()

    if not stored_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid refresh token'
        )

    if stored_token.is_revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Refresh token has been revoked'
        )

    if stored_token.expires_at < datetime.now(UTC):
        stored_token.is_revoked = True
        await session.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Refresh token has expired'
        )

    user_result = await session.execute(
        select(UserModel).where(UserModel.id == stored_token.user_id)
    )
    user = user_result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='User not found'
        )

    stored_token.is_revoked = True

    new_access_token = create_access_token(user.id, user.role)
    new_refresh_token, new_expires_at = create_refresh_token(user.id)

    new_refresh_token_model = RefreshTokenModel(
        user_id=user.id,
        token=new_refresh_token,
        expires_at=new_expires_at,
    )
    session.add(new_refresh_token_model)

    await session.execute(
        delete(RefreshTokenModel).where(
            RefreshTokenModel.token == token_data.refresh_token
        )
    )

    await session.commit()

    return {
        'access_token': new_access_token,
        'refresh_token': new_refresh_token
    }


@users_router.post(
    '/api/v1/users/logout',
    status_code=status.HTTP_204_NO_CONTENT,
    tags=['users']
)
async def logout(
    token_data: RefreshTokenRequestSchema,
    session: SessionDep
):
    result = await session.execute(
        select(RefreshTokenModel).where(
            RefreshTokenModel.token == token_data.refresh_token
        )
    )
    stored_token = result.scalar_one_or_none()

    if stored_token:
        await session.execute(
            delete(RefreshTokenModel).where(
                RefreshTokenModel.id == stored_token.id
            )
        )
        await session.commit()

    return None


@users_router.get(
    '/api/v1/users/me',
    response_model=UserSchema,
    tags=['users']
)
async def get_me(user: UserModel = Depends(get_current_user)):
    avatar_url = await get_avatar_presigned_url(user)

    user_schema = UserSchema.model_validate(user)
    data = user_schema.model_dump()
    data['avatar_presigned_url'] = avatar_url

    return data


@users_router.get(
    '/api/v1/users/{user_id}',
    response_model=UserSchema,
    tags=['users']
)
async def get_user_by_id(
    user_id: UUID,
    session: SessionDep
):
    result = await session.execute(select(UserModel).where(UserModel.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='User not found'
        )

    presigned_url = await get_avatar_presigned_url(user)

    return UserSchema.model_validate({
        **user.__dict__,
        'avatar_presigned_url': presigned_url
    })


@users_router.put(
    '/api/v1/users/me',
    response_model=UserSchema,
    tags=['users']
)
async def update_user(
    session: SessionDep,
    update_data: UserUpdateSchema = Depends(UserUpdateSchema.as_form),
    current_user: UserModel = Depends(get_current_user),
    avatar: UploadFile | None = File(None)
):
    if update_data:
        update_fields = update_data.model_dump(exclude_none=True)
        if update_fields:
            await session.execute(
                update(UserModel)
                .where(UserModel.id == current_user.id)
                .values(**update_fields)
            )

    if avatar:
        bucket_name = config.minio.define_buckets['avatars']
        if not bucket_name:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail='Avatars bucket not configured'
            )

        minio_client = MinioClient(bucket_name=bucket_name)
        avatar_key = f'user_{current_user.id}.webp'
        data = await convert_to_webp(avatar)

        await minio_client.upload_file(
            file_name=avatar_key,
            data=data,
            content_type='image/webp'
        )

        await session.execute(
            update(UserModel)
            .where(UserModel.id == current_user.id)
            .values(is_has_avatar=True)
        )

    await session.commit()

    result = await session.execute(
        select(UserModel)
        .where(UserModel.id == current_user.id)
    )
    updated_user = result.scalar_one()

    presigned_url = await get_avatar_presigned_url(updated_user)

    return UserSchema.model_validate({
        **updated_user.__dict__,
        'avatar_presigned_url': presigned_url
    })
