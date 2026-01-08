from datetime import date, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import ARRAY, Date as PGDate, DateTime as PGDateTime, Enum, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base
from src.users.models import UserModel


class RequestStatusEnum(StrEnum):
    OPEN = 'open'
    IN_PROGRESS = 'in_progress'
    DONE = 'done'


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

    check_list: Mapped[list[str]] = mapped_column(
        ARRAY(String),
        nullable=False
    )

    category: Mapped[str] = mapped_column(
        String,
        nullable=False
    )

    description: Mapped[str] = mapped_column(
        String,
        nullable=True
    )

    address: Mapped[str] = mapped_column(
        String,
        nullable=True
    )

    scheduled_time: Mapped[datetime] = mapped_column(
        PGDateTime(timezone=True),
        nullable=True
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
