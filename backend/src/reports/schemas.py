from uuid import UUID

from pydantic import BaseModel


class ReportBaseSchema(BaseModel):
    description: str


class ReportCreateSchema(ReportBaseSchema):
    request_id: UUID


class ReportImageSchema(BaseModel):
    id: UUID
    file_key: str
    display_order: int
    presigned_url: str | None = None

    class Config:
        from_attributes = True


class ReportResponseSchema(ReportBaseSchema):
    id: UUID
    request_id: UUID
    volunteer_id: UUID | None
    images: list[ReportImageSchema] = []

    class Config:
        from_attributes = True
