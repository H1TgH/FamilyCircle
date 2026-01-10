from datetime import date, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    Date as PGDate,
    DateTime as PGDateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base
from src.users.models import UserModel


class RequestStatusEnum(StrEnum):
    OPEN = 'open'
    IN_PROGRESS = 'in_progress'
    DONE = 'done'


class FrequencyEnum(StrEnum):
    ONCE = 'once'
    EVERY_FEW_HOURS = 'every_few_hours'
    DAILY = 'daily'
    WEEKLY = 'weekly'
    MONTHLY = 'monthly'


class DurationUnitEnum(StrEnum):
    HOURS = 'hours'
    DAYS = 'days'
    MONTHS = 'months'


class ElderModel(Base):
    __tablename__ = 'elders'

    id: Mapped[UUID] = mapped_column(
        PGUUID,
        primary_key=True,
        unique=True,
        nullable=False,
        default=uuid4,
        index=True
    )

    relative_id: Mapped[PGUUID] = mapped_column(
        PGUUID,
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )

    full_name: Mapped[str] = mapped_column(
        String,
        nullable=False
    )

    is_has_avatar: Mapped[bool] = mapped_column(
        default=False,
        nullable=False
    )

    birthday: Mapped[date] = mapped_column(
        PGDate,
        nullable=False
    )

    health_status: Mapped[str] = mapped_column(
        String,
        nullable=False
    )

    physical_limitations: Mapped[str] = mapped_column(
        String,
        nullable=False
    )

    disease: Mapped[str] = mapped_column(
        String,
        nullable=False
    )

    address: Mapped[str] = mapped_column(
        String,
        nullable=False
    )

    features: Mapped[str] = mapped_column(
        String,
        nullable=False
    )

    hobbies: Mapped[str] = mapped_column(
        String,
        nullable=False
    )

    comments: Mapped[str] = mapped_column(
        String,
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        PGDateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    updated_at: Mapped[datetime] = mapped_column(
        PGDateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )


class RequestModel(Base):
    __tablename__ = 'requests'

    id: Mapped[UUID] = mapped_column(
        PGUUID,
        primary_key=True,
        default=uuid4
    )

    relative_id: Mapped[UUID] = mapped_column(
        ForeignKey('users.id'),
        nullable=False
    )

    elder_id: Mapped[UUID] = mapped_column(
        ForeignKey('elders.id'),
        nullable=False
    )

    volunteer_id: Mapped[UUID] = mapped_column(
        ForeignKey('users.id'),
        nullable=True
    )

    checklist_name: Mapped[str] = mapped_column(
        String,
        nullable=False
    )

    tasks: Mapped[list[dict]] = mapped_column(
        JSON,
        nullable=False,
        default=list
    )

    duration_value: Mapped[int] = mapped_column(
        Integer,
        nullable=True
    )

    duration_unit: Mapped[DurationUnitEnum] = mapped_column(
        Enum(
            DurationUnitEnum,
            name='duration_unit_enum',
            values_callable=lambda enum: [e.value for e in enum],
        ),
        nullable=True
    )

    is_shopping_checklist: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False
    )

    status: Mapped[RequestStatusEnum] = mapped_column(
        Enum(RequestStatusEnum, name='request_status_enum'),
        default=RequestStatusEnum.OPEN
    )

    created_at: Mapped[datetime] = mapped_column(
        PGDateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    updated_at: Mapped[datetime] = mapped_column(
        PGDateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )

    relative: Mapped[UserModel] = relationship('UserModel', foreign_keys=[relative_id])
    volunteer: Mapped[UserModel] = relationship('UserModel', foreign_keys=[volunteer_id])
    elder: Mapped[ElderModel] = relationship('ElderModel', foreign_keys=[elder_id])


class ResponseModel(Base):
    __tablename__ = 'responses'

    id: Mapped[UUID] = mapped_column(
        PGUUID,
        primary_key=True,
        default=uuid4
    )

    request_id: Mapped[UUID] = mapped_column(
        ForeignKey('requests.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )

    volunteer_id: Mapped[UUID] = mapped_column(
        ForeignKey('users.id'),
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        PGDateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    updated_at: Mapped[datetime] = mapped_column(
        PGDateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )

    request: Mapped[RequestModel] = relationship('RequestModel', foreign_keys=[request_id])
    volunteer: Mapped[UserModel] = relationship('UserModel', foreign_keys=[volunteer_id])
