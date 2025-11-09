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


class UserRegistrationResponseSchema(BaseModel):
    access_token: str
    refresh_token: str
