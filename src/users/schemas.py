from pydantic import BaseModel, EmailStr, PastDate


class UserRegistrationSchema(BaseModel):
    surname: str
    name: str
    patronymic: str
    phone_number: str
    email: EmailStr
    login: str
    password: str


class ElderRegistrationSchema(UserRegistrationSchema):
    pass


class VolunteerRegistrationSchema(UserRegistrationSchema):
    birthday: PastDate


class TokenResponseSchema(BaseModel):
    access_token: str
    refresh_token: str


class LoginRequestSchema(BaseModel):
    login_or_email: str
    password: str


class RefreshTokenRequestSchema(BaseModel):
    refresh_token: str
