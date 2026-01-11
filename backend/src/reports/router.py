from datetime import datetime
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import desc, select
from sqlalchemy.orm import selectinload

from src.config import config
from src.database import SessionDep
from src.reports.models import ReportImageModel, ReportModel
from src.reports.schemas import ReportFeedSchema, ReportResponseSchema
from src.requests.models import RequestModel, RequestStatusEnum
from src.s3_storage.client import MinioClient
from src.s3_storage.utils import convert_to_webp, get_avatar_presigned_url, get_report_image_url
from src.users.dependencies import get_current_user
from src.users.models import RoleEnum, UserModel


reports_router = APIRouter()


@reports_router.post(
    '/api/v1/reports',
    response_model=ReportResponseSchema,
    status_code=status.HTTP_201_CREATED,
    tags=['reports']
)
async def create_report(
    session: SessionDep,
    request_id: UUID | None = Form(None),
    description: str = Form(...),
    images: list[UploadFile] = File([]),
    user: UserModel = Depends(get_current_user)
):
    if len(images) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Maximum 10 images allowed'
        )

    request = None
    if request_id:
        result = await session.execute(
            select(RequestModel)
            .where(RequestModel.id == request_id)
        )
        request = result.scalar_one_or_none()

        if request is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Request not found.'
            )

        if request.volunteer_id != user.id and request.relative_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail='You are not assigned to this request.'
            )

    report = ReportModel(
        request_id=request_id,
        author_id=user.id,
        description=description,
    )
    session.add(report)
    await session.flush()

    uploaded_images = []
    if images:
        bucket_name = config.minio.define_buckets['reports']
        if not bucket_name:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail='Reports bucket not configured'
            )

        minio_client = MinioClient(bucket_name=bucket_name)

        for i, report_image in enumerate(images):
            try:
                if not report_image.content_type or not report_image.content_type.startswith('image/'):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail='File must be an image'
                    )

                webp_data = await convert_to_webp(report_image)

                image_key = f'{report.id}/{uuid4()}.webp'

                await minio_client.upload_file(
                    file_name=image_key,
                    data=webp_data,
                    content_type='image/webp'
                )

                report_image_model = ReportImageModel(
                    report_id=report.id,
                    file_key=image_key,
                    display_order=i
                )
                session.add(report_image_model)
                uploaded_images.append(report_image_model)

            except HTTPException:
                raise
            except Exception as e:
                for img in uploaded_images:
                    await minio_client.delete_file(img.file_key)
                await session.rollback()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f'Error uploading image: {e}'
                ) from e

    if request and request.volunteer_id == user.id:
        request.status = RequestStatusEnum.DONE

    await session.commit()

    result = await session.execute(
        select(ReportModel)
        .options(selectinload(ReportModel.images))
        .where(ReportModel.id == report.id)
    )
    report_with_images = result.scalar_one()

    report_data = ReportResponseSchema.model_validate(report_with_images)
    for report_image in report_data.images:
        report_image.presigned_url = await get_report_image_url(report_image)

    return report_data


@reports_router.get(
    '/api/v1/reports/feed',
    response_model=list[ReportFeedSchema],
    tags=['reports']
)
async def get_reports_feed(
    session: SessionDep,
    current_user: UserModel = Depends(get_current_user),
    limit: int = Query(15, ge=1, le=40),
    cursor: datetime | None = Query(None)
):
    query = (
        select(ReportModel)
        .join(ReportModel.author)
        .options(
            selectinload(ReportModel.images),
            selectinload(ReportModel.request),
            selectinload(ReportModel.author)
        )
        .order_by(desc(ReportModel.created_at))
    )

    if current_user.role == RoleEnum.RELATIVE:
        query = query.where(
            (ReportModel.author_id == current_user.id) |
            (ReportModel.request.has(RequestModel.relative_id == current_user.id))
        )

    if cursor:
        query = query.where(ReportModel.created_at < cursor)

    query = query.limit(limit)

    result = await session.execute(query)
    reports = result.scalars().all()

    feed_reports = []
    for report in reports:
        author_avatar_url = await get_avatar_presigned_url(report.author)

        report_data = ReportFeedSchema(
            id=report.id,
            description=report.description,
            created_at=report.created_at,
            images=report.images,
            author_id=report.author_id,
            author_name=report.author.name,
            author_surname=report.author.surname,
            author_avatar_url=author_avatar_url,
            request_task_name=report.request.checklist_name if report.request else None,
            request_status=report.request.status.value if report.request else None
        )

        for image in report_data.images:
            image.presigned_url = await get_report_image_url(image)

        feed_reports.append(report_data)

    return feed_reports


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
        .options(selectinload(ReportModel.images))
        .where(ReportModel.id == report_id)
    )
    report = result.scalar_one_or_none()

    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Report not found.'
        )

    report_data = ReportResponseSchema.model_validate(report)
    for image in report_data.images:
        image.presigned_url = await get_report_image_url(image)

    return report_data


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
        .options(selectinload(ReportModel.images))
        .where(ReportModel.id == report_id)
    )
    report = result.scalar_one_or_none()

    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Report not found.'
        )

    if report.author_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='You can delete only your own reports.'
        )

    bucket_name = config.minio.define_buckets['reports']
    if bucket_name and report.images:
        minio_client = MinioClient(bucket_name=bucket_name)
        for image in report.images:
            await minio_client.delete_file(image.file_key)

    await session.delete(report)
    await session.commit()

    return None


@reports_router.patch(
    '/api/v1/reports/{report_id}',
    response_model=ReportResponseSchema,
    tags=['reports']
)
async def update_report(
    report_id: UUID,
    session: SessionDep,
    description: str | None = Form(None),
    delete_images: list[str] | None = Form(None),
    images: list[UploadFile] = File([]),
    user: UserModel = Depends(get_current_user)
):
    result = await session.execute(
        select(ReportModel)
        .options(selectinload(ReportModel.images))
        .where(ReportModel.id == report_id)
    )
    report = result.scalar_one_or_none()

    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Report not found.'
        )

    if report.author_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='You can update only your own reports.'
        )

    if images and len(images) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Maximum 10 images allowed'
        )

    if description is not None:
        if not description.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Description cannot be empty'
            )
        report.description = description.strip()

    if delete_images:
        bucket_name = config.minio.define_buckets['reports']
        if bucket_name:
            minio_client = MinioClient(bucket_name=bucket_name)

        images_to_delete = []
        for image in report.images:
            if str(image.id) in delete_images:
                images_to_delete.append(image)
                if bucket_name:
                    await minio_client.delete_file(image.file_key)
                await session.delete(image)

        for image in images_to_delete:
            report.images.remove(image)

    uploaded_images = []
    if images:
        bucket_name = config.minio.define_buckets['reports']
        if not bucket_name:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail='Reports bucket not configured'
            )

        minio_client = MinioClient(bucket_name=bucket_name)

        next_order = max((img.display_order for img in report.images), default=-1) + 1

        for i, report_image in enumerate(images):
            try:
                if not report_image.content_type or not report_image.content_type.startswith('image/'):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail='File must be an image'
                    )

                webp_data = await convert_to_webp(report_image)

                image_key = f'{report.id}/{uuid4()}.webp'

                await minio_client.upload_file(
                    file_name=image_key,
                    data=webp_data,
                    content_type='image/webp'
                )

                report_image_model = ReportImageModel(
                    report_id=report.id,
                    file_key=image_key,
                    display_order=next_order + i
                )
                session.add(report_image_model)
                uploaded_images.append(report_image_model)

            except HTTPException:
                raise
            except Exception as e:
                for img in uploaded_images:
                    await minio_client.delete_file(img.file_key)
                await session.rollback()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f'Error uploading image: {e}'
                ) from e

    await session.commit()
    await session.refresh(report, ['images'])

    report_data = ReportResponseSchema.model_validate(report)
    for image in report_data.images:
        image.presigned_url = await get_report_image_url(image)

    return report_data
