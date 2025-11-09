from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from src.database import SessionDep
from src.users.models import RefreshTokenModel, RoleEnum, UserModel
from src.users.schemas import ElderRegistrationSchema, UserRegistrationResponseSchema, VolunteerRegistrationSchema
from src.users.utils import create_access_token, create_refresh_token, get_password_hash


users_router = APIRouter()


@users_router.post('/api/v1/users/register/elder', response_model=UserRegistrationResponseSchema, tags=['users'])
async def register_elder(
    user_data: ElderRegistrationSchema,
    session: SessionDep
):
    is_user_exists = await session.execute(
        select(UserModel)
        .where(UserModel.login == user_data.login)
        .where(UserModel.email == user_data.email)
        .where(UserModel.phone_number == user_data.phone_number)
    )
    is_user_exists = is_user_exists.scalar_one_or_none()

    if is_user_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Login, email and phone number must be unique.'
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
        role=RoleEnum.ELDER,
    )

    session.add(user)
    await session.commit()
    await session.refresh(user)

    access_token = create_access_token(user.id, user.role)
    refresh_token, expires_at = create_refresh_token(user.id)

    session.add(RefreshTokenModel(
        user_id=user.id,
        token=refresh_token,
        expires_at=expires_at,
        created_at=datetime.now(UTC)
    ))
    await session.commit()

    return {
        'access_token': access_token,
        'refresh_token': refresh_token,
    }


@users_router.post('/api/v1/users/register/volunteer', response_model=UserRegistrationResponseSchema, tags=['users'])
async def register_volunteer(
    user_data: VolunteerRegistrationSchema,
    session: SessionDep
):
    is_user_exists = await session.execute(
        select(UserModel)
        .where(UserModel.login == user_data.login)
        .where(UserModel.email == user_data.email)
        .where(UserModel.phone_number == user_data.phone_number)
    )
    is_user_exists = is_user_exists.scalar_one_or_none()

    if is_user_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Login, email and phone number must be unique.'
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
        role=RoleEnum.VOLUNTEER,
    )

    session.add(user)
    await session.commit()
    await session.refresh(user)

    access_token = create_access_token(user.id, user.role)
    refresh_token, expires_at = create_refresh_token(user.id)

    session.add(RefreshTokenModel(
        user_id=user.id,
        token=refresh_token,
        expires_at=expires_at,
        created_at=datetime.now(UTC)
    ))
    await session.commit()

    return {
        'access_token': access_token,
        'refresh_token': refresh_token,
    }
