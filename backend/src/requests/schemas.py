from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel

from src.requests.models import RequestStatusEnum


class RequestCreationSchema(BaseModel):
    elder_id: UUID
    check_list: list[str]
    category: str
    description: str
    address: str
    scheduled_time: datetime


class RequestCreationResponseSchema(BaseModel):
    request_id: UUID


class RequestResponseSchema(BaseModel):
    id: UUID
    relative_id: UUID
    elder_id: UUID
    volunteer_id: UUID | None
    check_list: list[str]
    category: str
    description: str
    address: str
    scheduled_time: datetime
    status: RequestStatusEnum
    created_at: datetime


class RequestUpdateSchema(BaseModel):
    check_list: list[str] | None = None
    description: str | None = None
    address: str | None = None
    scheduled_time: datetime | None = None
    status: RequestStatusEnum | None = None


class ElderCreationSchema(BaseModel):
    full_name: str
    birthday: date
    health_status: str
    physical_limitations: str
    disease: str
    address: str
    features: str
    hobbies: str
    comments: str
    avatar_url: str | None = None


class ElderUpdateSchema(BaseModel):
    full_name: str | None = None
    birthday: date | None = None
    health_status: str | None = None
    physical_limitations: str | None = None
    disease: str | None = None
    address: str | None = None
    features: str | None = None
    hobbies: str | None = None
    comments: str | None = None
    avatar_url: str | None = None


class ElderResponseSchema(BaseModel):
    id: UUID
    relative_id: UUID
    full_name: str
    birthday: date
    health_status: str
    physical_limitations: str
    disease: str
    address: str
    features: str
    hobbies: str
    comments: str
    avatar_url: str | None
    created_at: datetime
    updated_at: datetime
