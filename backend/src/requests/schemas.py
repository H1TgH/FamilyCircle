from datetime import date, datetime, time
from uuid import UUID
from typing import Optional

from fastapi import Form
from pydantic import BaseModel, field_serializer

from src.requests.models import DurationUnitEnum, FrequencyEnum, RequestStatusEnum


class RequestTaskSchema(BaseModel):
    task_name: str
    description: str | None = None
    frequency: FrequencyEnum | None = None
    scheduled_date: date | None = None
    scheduled_time: time | None = None
    order_index: int | None = 0

    @field_serializer('scheduled_date', 'scheduled_time')
    def serialize_dates(self, value: date | time | None, _info):
        if value is None:
            return None
        if isinstance(value, date):
            return value.isoformat()
        if isinstance(value, time):
            return value.isoformat()
        return value


class RequestCreationSchema(BaseModel):
    elder_id: UUID
    checklist_name: str
    tasks: list[RequestTaskSchema]
    duration_value: int | None = None
    duration_unit: DurationUnitEnum | None = None
    is_shopping_checklist: bool


class RequestCreationResponseSchema(BaseModel):
    request_id: UUID


class RequestResponseSchema(BaseModel):
    id: UUID
    relative_id: UUID
    elder_id: UUID
    volunteer_id: UUID | None = None
    checklist_name: str
    tasks: list[RequestTaskSchema]
    duration_value: int | None = None
    duration_unit: DurationUnitEnum | None = None
    is_shopping_checklist: bool
    status: RequestStatusEnum
    created_at: datetime


class RequestUpdateSchema(BaseModel):
    checklist_name: str | None = None
    tasks: list[RequestTaskSchema] | None = None
    duration_value: int | None = None
    duration_unit: DurationUnitEnum | None = None
    is_shopping_checklist: bool | None = None
    status: RequestStatusEnum | None = None
    volunteer_id: UUID | None = None


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

    @classmethod
    def as_form(
        cls,
        full_name: str = Form(...),
        birthday: date = Form(...),
        health_status: str = Form(...),
        physical_limitations: str = Form(...),
        disease: str = Form(...),
        address: str = Form(...),
        features: str = Form(...),
        hobbies: str = Form(...),
        comments: str = Form(...)
    ):
        return cls(
            full_name=full_name,
            birthday=birthday,
            health_status=health_status,
            physical_limitations=physical_limitations,
            disease=disease,
            address=address,
            features=features,
            hobbies=hobbies,
            comments=comments
        )


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

    @classmethod
    def as_form(
        cls,
        full_name: str | None = Form(None),
        birthday: date | None = Form(None),
        health_status: str | None = Form(None),
        physical_limitations: str | None = Form(None),
        disease: str | None = Form(None),
        address: str | None = Form(None),
        features: str | None = Form(None),
        hobbies: str | None = Form(None),
        comments: str | None = Form(None)
    ):
        return cls(
            full_name=full_name,
            birthday=birthday,
            health_status=health_status,
            physical_limitations=physical_limitations,
            disease=disease,
            address=address,
            features=features,
            hobbies=hobbies,
            comments=comments
        )


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
    avatar_presigned_url: str | None
    created_at: datetime
    updated_at: datetime
