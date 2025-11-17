from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from src.database import SessionDep
from src.requests.models import RequestModel, RequestStatusEnum
from src.requests.schemas import RequestCreationResponseSchema, RequestCreationSchema
from src.users.dependencies import get_current_user
from src.users.models import ElderModel, UserModel


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
