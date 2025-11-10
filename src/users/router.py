from fastapi import APIRouter, HTTPException, status
from sqlalchemy import or_, select

from src.database import SessionDep
from src.users.models import RefreshTokenModel, RoleEnum, UserModel
from src.users.schemas import ElderRegistrationSchema, UserRegistrationResponseSchema, VolunteerRegistrationSchema
from src.users.utils import create_access_token, create_refresh_token, get_password_hash


users_router = APIRouter()


async def _register_user(
    user_data: ElderRegistrationSchema | VolunteerRegistrationSchema,
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
    '/api/v1/users/register/elder',
    response_model=UserRegistrationResponseSchema,
    status_code=status.HTTP_201_CREATED,
    tags=['users']
)
async def register_elder(
    user_data: ElderRegistrationSchema,
    session: SessionDep
):
    return await _register_user(user_data, RoleEnum.ELDER, session)


@users_router.post(
    '/api/v1/users/register/volunteer',
    response_model=UserRegistrationResponseSchema,
    status_code=status.HTTP_201_CREATED,
    tags=['users']
)
async def register_volunteer(
    user_data: VolunteerRegistrationSchema,
    session: SessionDep
):
    return await _register_user(user_data, RoleEnum.VOLUNTEER, session)
