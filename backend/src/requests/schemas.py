from datetime import datetime
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
    check_list: str
    category: str
    description: str
    address: str
    scheduled_time: str
    status: RequestStatusEnum
    created_at: datetime


class RequestUpdateSchema(BaseModel):
    check_list: list[str] | None
    description: str | None
    address: str | None
    scheduled_time: datetime | None
    status: RequestStatusEnum | None
