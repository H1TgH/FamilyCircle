from datetime import date, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Date as PGDate, DateTime as PGDateTime, Enum, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class RoleEnum(StrEnum):
    ADMIN = 'admin'
    VOLUNTEER = 'volunteer'
    RELATIVE = 'relative'


class UserModel(Base):
    __tablename__ = 'users'

    id: Mapped[UUID] = mapped_column(
        PGUUID,
        primary_key=True,
        unique=True,
        nullable=False,
        default=uuid4,
        index=True
    )

    login: Mapped[str] = mapped_column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    email: Mapped[str] = mapped_column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    surname: Mapped[str] = mapped_column(
        String,
        nullable=False
    )

    name: Mapped[str] = mapped_column(
        String,
        nullable=False
    )

    patronymic: Mapped[str] = mapped_column(
        String,
        nullable=True
    )

    phone_number: Mapped[str] = mapped_column(
        String,
        nullable=False
    )

    password: Mapped[str] = mapped_column(
        String,
        nullable=False
    )

    birthday: Mapped[date] = mapped_column(
        PGDate,
        nullable=True
    )

    role: Mapped[RoleEnum] = mapped_column(
        Enum(RoleEnum, name='role_enum'),
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


class RefreshTokenModel(Base):
    __tablename__ = 'refresh_tokens'

    id: Mapped[UUID] = mapped_column(
        PGUUID,
        primary_key=True,
        unique=True,
        nullable=False,
        default=uuid4
    )

    user_id: Mapped[UUID] = mapped_column(
        PGUUID,
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False
    )

    token: Mapped[str] = mapped_column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    expires_at: Mapped[datetime] = mapped_column(
        PGDateTime(timezone=True),
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        PGDateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    is_revoked: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default='false'
    )
