from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, select

from src.database import SessionDep
from src.requests.models import ElderModel, RequestModel, RequestStatusEnum
from src.requests.schemas import (
    RequestCreationResponseSchema,
    RequestCreationSchema,
    RequestResponseSchema,
    RequestUpdateSchema,
)
from src.users.dependencies import get_current_user
from src.users.models import UserModel


request_router = APIRouter()


@request_router.post(
    '/api/v1/requests',
    response_model=RequestCreationResponseSchema,
    status_code=status.HTTP_201_CREATED,
    tags=['requests']
)
async def create_requests(
    request_data: RequestCreationSchema,
    session: SessionDep,
    user: UserModel = Depends(get_current_user)
):
    elder = await session.execute(
        select(ElderModel)
        .where(ElderModel.id == request_data.elder_id)
    )
    elder = elder.scalar_one_or_none()

    if elder is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Elder not found'
        )

    if elder.relative_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='You can create a request only for your elderly'
        )

    new_request = RequestModel(
        relative_id=user.id,
        elder_id=request_data.elder_id,
        check_list=request_data.check_list,
        category=request_data.category,
        description=request_data.description,
        address=request_data.address,
        scheduled_time=request_data.scheduled_time,
        status=RequestStatusEnum.OPEN
    )

    await session.add(new_request)
    await session.commit()
    await session.refresh(new_request)

    return {
        'request_id': new_request.id
    }


@request_router.get(
    '/api/v1/requests/me',
    response_model=list[RequestResponseSchema],
    tags=['requests']
)
async def get_requests_list(
    session: SessionDep,
    user: UserModel = Depends(get_current_user),
    limit: int = Query(15, ge=1, le=40),
    cursor: datetime | None = Query(None)
):
    query = select(RequestModel).where(
        RequestModel.relative_id == user.id
    )

    if cursor:
        query = query.where(RequestModel.created_at < cursor)

    query = query.order_by(RequestModel.created_at.desc()).limit(limit)

    result = await session.execute(query)
    requests = result.scalars().all()

    return requests


@request_router.get(
    '/api/v1/requests/available',
    response_model=list[RequestResponseSchema],
    tags=['requests']
)
async def get_available_requests(
    session: SessionDep,
    user: UserModel = Depends(get_current_user),
    category: str | None = Query(None),
    limit: int = Query(30, ge=1, le=60),
    cursor: datetime | None = Query(None)
):
    query = select(RequestModel).where(RequestModel.status == RequestStatusEnum.OPEN)

    if category:
        query = query.where(RequestModel.category == category)

    if cursor:
        query = query.where(RequestModel.created_at < cursor)

    query = query.order_by(RequestModel.created_at.desc()).limit(limit)

    result = await session.execute(query)
    requests = result.scalars().all()

    return requests


@request_router.get(
    '/api/v1/requests/{request_id}',
    response_model=RequestResponseSchema,
    tags=['requests']
)
async def get_request_by_id(
    request_id: UUID,
    session: SessionDep,
    user: UserModel = Depends(get_current_user)
):
    result = await session.execute(
        select(RequestModel)
        .where(RequestModel.id == request_id)
    )
    request = result.scalar_one_or_none()

    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Request not found'
        )

    return request


@request_router.patch(
    '/api/v1/requests/{request_id}',
    response_model=RequestResponseSchema,
    tags=['requests']
)
async def update_request(
    request_id: UUID,
    request_data: RequestUpdateSchema,
    session: SessionDep,
    user: UserModel = Depends(get_current_user)
):
    result = await session.execute(
        select(RequestModel)
        .where(RequestModel.id == request_id)
    )
    request = result.scalar_one_or_none()

    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Request not found'
        )

    if user.id != request.relative_id and user.id != request.volunteer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='You do not have permission to update this request'
        )

    update_data = request_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(request, key, value)

    await session.commit()
    await session.refresh(request)

    return request


@request_router.delete(
    '/api/v1/requests/{request_id}',
    status_code=status.HTTP_204_NO_CONTENT,
    tags=['requests']
)
async def delete_request(
    request_id: UUID,
    session: SessionDep,
    user: UserModel = Depends(get_current_user)
):
    result = await session.execute(
        select(RequestModel).where(RequestModel.id == request_id)
    )
    request = result.scalar_one_or_none()

    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Request not found'
        )

    if user.id != request.relative_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='You cannot delete this request'
        )

    await session.execute(delete(RequestModel).where(RequestModel.id == request_id))
    await session.commit()

    return None
