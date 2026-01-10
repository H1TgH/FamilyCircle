from uuid import UUID

from fastapi import Form
from pydantic import BaseModel, EmailStr, PastDate

from src.users.models import RoleEnum


class UserRegistrationSchema(BaseModel):
    surname: str
    name: str
    patronymic: str
    phone_number: str
    email: EmailStr
    login: str
    password: str


class RelativeRegistrationSchema(UserRegistrationSchema):
    address: str | None = None
    city: str | None = None
    about: str | None = None


class VolunteerRegistrationSchema(UserRegistrationSchema):
    birthday: PastDate
    address: str | None = None
    city: str | None = None
    about: str | None = None


class TokenResponseSchema(BaseModel):
    access_token: str
    refresh_token: str


class LoginRequestSchema(BaseModel):
    login_or_email: str
    password: str


class RefreshTokenRequestSchema(BaseModel):
    refresh_token: str


class UserSchema(BaseModel):
    id: UUID
    login: str
    email: str
    surname: str
    name: str
    patronymic: str | None
    phone_number: str
    birthday: PastDate | None
    role: RoleEnum
    is_has_avatar: bool
    address: str | None = None
    city: str | None = None
    about: str | None = None
    avatar_presigned_url: str | None = None

    class Config:
        from_attributes = True


class UserUpdateSchema(BaseModel):
    login: str | None = None
    email: EmailStr | None = None
    surname: str | None = None
    name: str | None = None
    patronymic: str | None = None
    phone_number: str | None = None
    birthday: PastDate | None = None
    address: str | None = None
    city: str | None = None
    about: str | None = None

    @classmethod
    def as_form(
        cls,
        login: str | None = Form(None),
        email: str | None = Form(None),
        surname: str | None = Form(None),
        name: str | None = Form(None),
        patronymic: str | None = Form(None),
        phone_number: str | None = Form(None),
        birthday: PastDate | None = Form(None),
        address: str | None = Form(None),
        city: str | None = Form(None),
        about: str | None = Form(None)
    ):
        return cls(
            login=login,
            email=email,
            surname=surname,
            name=name,
            patronymic=patronymic,
            phone_number=phone_number,
            birthday=birthday,
            address=address,
            city=city,
            about=about
        )
