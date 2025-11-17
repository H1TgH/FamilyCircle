from uuid import UUID

from pydantic import BaseModel


class ReportBaseSchema(BaseModel):
    description: str


class ReportCreateSchema(ReportBaseSchema):
    request_id: UUID


class ReportResponseSchema(ReportBaseSchema):
    id: UUID
    request_id: UUID
    volunteer_id: UUID | None
