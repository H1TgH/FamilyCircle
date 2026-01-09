from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ReportBaseSchema(BaseModel):
    description: str


class ReportCreateSchema(ReportBaseSchema):
    request_id: UUID | None = None


class ReportImageSchema(BaseModel):
    id: UUID
    file_key: str
    display_order: int
    presigned_url: str | None = None

    class Config:
        from_attributes = True


class ReportResponseSchema(ReportBaseSchema):
    id: UUID
    request_id: UUID | None
    author_id: UUID
    images: list[ReportImageSchema] = []

    class Config:
        from_attributes = True


class ReportFeedSchema(BaseModel):
    id: UUID
    description: str
    created_at: datetime
    images: list[ReportImageSchema] = []
    author_id: UUID
    author_name: str
    author_surname: str
    author_avatar_url: str | None = None
    request_task_name: str | None = None
    request_status: str | None = None
