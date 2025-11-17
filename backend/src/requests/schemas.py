from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class RequestCreationSchema(BaseModel):
    elder_id: UUID
    check_list: list[str]
    category: str
    description: str
    address: str
    scheduled_time: datetime


class RequestCreationResponseSchema(BaseModel):
    request_id: UUID
