from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime as PGDateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base
from src.requests.models import RequestModel
from src.users.models import UserModel


class ReportModel(Base):
    __tablename__ = 'reports'

    id: Mapped[UUID] = mapped_column(
        PGUUID,
        primary_key=True,
        unique=True,
        nullable=False,
        default=uuid4,
        index=True
    )

    request_id: Mapped[UUID] = mapped_column(
        ForeignKey('requests.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )

    volunteer_id: Mapped[UUID] = mapped_column(
        ForeignKey('users.id', ondelete='SET NULL'),
        nullable=True,
        index=True
    )

    description: Mapped[str] = mapped_column(
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

    request: Mapped[RequestModel] = relationship('RequestModel')
    volunteer: Mapped[UserModel] = relationship('UserModel')
    images: Mapped[list['ReportImageModel']] = relationship(
        'ReportImageModel',
        back_populates='report',
        cascade='all, delete-orphan',
        order_by='ReportImageModel.display_order'
    )


class ReportImageModel(Base):
    __tablename__ = 'report_images'

    id: Mapped[UUID] = mapped_column(
        PGUUID,
        primary_key=True,
        unique=True,
        nullable=False,
        default=uuid4,
        index=True
    )

    report_id: Mapped[UUID] = mapped_column(
        ForeignKey('reports.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )

    file_key: Mapped[str] = mapped_column(
        String,
        nullable=False,
        index=True
    )

    display_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )

    created_at: Mapped[datetime] = mapped_column(
        PGDateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    report: Mapped[ReportModel] = relationship('ReportModel', back_populates='images')
