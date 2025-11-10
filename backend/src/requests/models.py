from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import DateTime as PGDateTime, Enum, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base
from src.users.models import UserModel


class RequestStatusEnum(StrEnum):
    OPEN = 'open'
    IN_PROGRESS = 'in_progress'
    DONE = 'done'


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

    volunteer_id: Mapped[UUID] = mapped_column(
        ForeignKey('users.id'),
        nullable=True
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
