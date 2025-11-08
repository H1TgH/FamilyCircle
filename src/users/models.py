from datetime import datetime, date
from enum import Enum as PyEnum
from uuid import UUID, uuid4

from sqlalchemy import DateTime as TIMESTAMP, Date as PGDate, Enum, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class RoleEnum(str, PyEnum):
    ADMIN = 'admin'
    VOLUNTEER = 'volunteer'
    ELDER = 'elder'


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
        TIMESTAMP,
        nullable=False,
        server_default=func.now()
    )

    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )
