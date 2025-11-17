from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from src.database import SessionDep
from src.reports.models import ReportModel
from src.reports.schemas import ReportCreateSchema, ReportResponseSchema
from src.requests.models import RequestModel, RequestStatusEnum
from src.users.models import UserModel
from users.dependencies import get_current_user


reports_router = APIRouter()


@reports_router.post(
    '/api/v1/reports',
    response_model=ReportResponseSchema,
    status_code=status.HTTP_201_CREATED,
    tags=['reports']
)
async def create_report(
    report_data: ReportCreateSchema,
    session: SessionDep,
    user: UserModel = Depends(get_current_user)
):
    result = await session.execute(
        select(RequestModel)
        .where(RequestModel.id == report_data.request_id)
    )
    request = result.scalar_one_or_none()

    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Request not found.'
        )

    if request.volunteer_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='You are not assigned to this request.'
        )

    report = ReportModel(
        request_id=report_data.request_id,
        volunteer_id=user.id,
        description=report_data.description,
    )

    session.add(report)

    request.status = RequestStatusEnum.DONE

    await session.commit()
    await session.refresh(report)

    return report


@reports_router.get(
    '/api/v1/reports/{report_id}',
    response_model=ReportResponseSchema,
    tags=['reports']
)
async def get_report(
    report_id: UUID,
    session: SessionDep
):
    result = await session.execute(
        select(ReportModel)
        .where(ReportModel.id == report_id)
    )
    report = result.scalar_one_or_none()

    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Report not found.'
        )

    return report


@reports_router.delete(
    '/api/v1/reports/{report_id}',
    status_code=status.HTTP_204_NO_CONTENT,
    tags=['reports']
)
async def delete_report(
    report_id: UUID,
    session: SessionDep,
    user: UserModel = Depends(get_current_user),
):
    result = await session.execute(
        select(ReportModel)
        .where(ReportModel.id == report_id)
    )
    report = result.scalar_one_or_none()

    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Report not found.'
        )

    if report.volunteer_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='You can delete only your own reports.'
        )

    await session.delete(report)
    await session.commit()

    return None
