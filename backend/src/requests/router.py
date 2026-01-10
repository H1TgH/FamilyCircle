from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import selectinload

from src.config import config
from src.database import SessionDep
from src.notifications.tasks import send_completion_email
from src.requests.models import ElderModel, RequestModel, RequestStatusEnum, ResponseModel, ThanksModel
from src.requests.schemas import (
    ElderCreationSchema,
    ElderResponseSchema,
    ElderUpdateSchema,
    RequestCreationResponseSchema,
    RequestCreationSchema,
    RequestResponseSchema,
    RequestUpdateSchema,
    ResponseCreationSchema,
    ResponseSchema,
    ResponseWithDetailsSchema,
    ThanksCountResponse,
    ThanksCreateSchema,
    ThanksSchema,
)
from src.requests.utils import get_elder_short_schema, get_user_short_schema
from src.s3_storage.client import MinioClient
from src.s3_storage.utils import convert_to_webp, get_elder_avatar_presigned_url
from src.users.dependencies import get_current_user
from src.users.models import RoleEnum, UserModel


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

    tasks_data = [task.model_dump(exclude_none=True) for task in request_data.tasks]

    new_request = RequestModel(
        relative_id=user.id,
        elder_id=request_data.elder_id,
        checklist_name=request_data.checklist_name,
        tasks=tasks_data,
        duration_value=request_data.duration_value,
        duration_unit=request_data.duration_unit,
        is_shopping_checklist=request_data.is_shopping_checklist,
        status=RequestStatusEnum.OPEN
    )

    session.add(new_request)
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
    ).options(
        selectinload(RequestModel.relative),
        selectinload(RequestModel.volunteer),
        selectinload(RequestModel.elder)
    )

    if cursor:
        query = query.where(RequestModel.created_at < cursor)

    query = query.order_by(RequestModel.created_at.desc()).limit(limit)

    result = await session.execute(query)
    requests = result.scalars().all()

    response_requests = []
    for request in requests:
        request_dict = {
            'id': request.id,
            'relative_id': request.relative_id,
            'elder_id': request.elder_id,
            'volunteer_id': request.volunteer_id,
            'checklist_name': request.checklist_name,
            'tasks': request.tasks,
            'duration_value': request.duration_value,
            'duration_unit': request.duration_unit,
            'is_shopping_checklist': request.is_shopping_checklist,
            'status': request.status,
            'created_at': request.created_at
        }

        if request.relative:
            relative_data = await get_user_short_schema(request.relative)
            request_dict['relative'] = relative_data

        if request.volunteer:
            volunteer_data = await get_user_short_schema(request.volunteer)
            request_dict['volunteer'] = volunteer_data

        if request.elder:
            elder_data = await get_elder_short_schema(request.elder)
            request_dict['elder'] = elder_data

        response_requests.append(RequestResponseSchema.model_validate(request_dict))

    return response_requests


@request_router.get(
    '/api/v1/requests/available',
    response_model=list[RequestResponseSchema],
    tags=['requests']
)
async def get_available_requests(
    session: SessionDep,
    user: UserModel = Depends(get_current_user),
    limit: int = Query(30, ge=1, le=60),
    cursor: datetime | None = Query(None)
):
    if user.role != RoleEnum.VOLUNTEER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Only volunteers can view available requests'
        )

    query = select(RequestModel).where(
        RequestModel.status == RequestStatusEnum.OPEN
    ).options(
        selectinload(RequestModel.relative),
        selectinload(RequestModel.elder)
    )

    if cursor:
        query = query.where(RequestModel.created_at < cursor)

    query = query.order_by(RequestModel.created_at.desc()).limit(limit)

    result = await session.execute(query)
    requests = result.scalars().all()

    response_requests = []
    for request in requests:
        request_dict = {
            'id': request.id,
            'relative_id': request.relative_id,
            'elder_id': request.elder_id,
            'volunteer_id': request.volunteer_id,
            'checklist_name': request.checklist_name,
            'tasks': request.tasks,
            'duration_value': request.duration_value,
            'duration_unit': request.duration_unit,
            'is_shopping_checklist': request.is_shopping_checklist,
            'status': request.status,
            'created_at': request.created_at
        }

        if request.relative:
            relative_data = await get_user_short_schema(request.relative)
            request_dict['relative'] = relative_data

        if request.elder:
            elder_data = await get_elder_short_schema(request.elder)
            request_dict['elder'] = elder_data

        response_requests.append(RequestResponseSchema.model_validate(request_dict))

    return response_requests


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
        .options(selectinload(RequestModel.elder))
        .where(RequestModel.id == request_id)
    )
    request = result.scalar_one_or_none()

    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Request not found'
        )

    old_status = request.status

    if request_data.volunteer_id is not None and user.role == RoleEnum.VOLUNTEER:
        if request.volunteer_id is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Request already has a volunteer assigned'
            )
        if request.status != RequestStatusEnum.OPEN:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Can only respond to open requests'
            )
        request.volunteer_id = user.id
        if request_data.status is None:
            request.status = RequestStatusEnum.IN_PROGRESS
    elif user.id != request.relative_id and user.id != request.volunteer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='You do not have permission to update this request'
        )

    update_data = request_data.model_dump(exclude_unset=True, exclude={'volunteer_id'})
    for key, value in update_data.items():
        setattr(request, key, value)

    await session.commit()
    await session.refresh(request)

    new_status = request.status

    if (
        old_status != RequestStatusEnum.DONE
        and new_status == RequestStatusEnum.DONE
    ):
        send_completion_email.delay(
            to_email=user.email,
            elder_name=request.elder.full_name,
        )

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

    if request is None:
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


@request_router.post(
    '/api/v1/elders',
    response_model=ElderResponseSchema,
    status_code=status.HTTP_201_CREATED,
    tags=['elders']
)
async def create_elder(
    session: SessionDep,
    elder_data: ElderCreationSchema = Depends(ElderCreationSchema.as_form),
    user: UserModel = Depends(get_current_user),
    avatar: UploadFile | None = File(None)
):
    if user.role != RoleEnum.RELATIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Only relatives can create elders'
        )

    new_elder = ElderModel(
        relative_id=user.id,
        full_name=elder_data.full_name,
        birthday=elder_data.birthday,
        health_status=elder_data.health_status,
        physical_limitations=elder_data.physical_limitations,
        disease=elder_data.disease,
        address=elder_data.address,
        features=elder_data.features,
        hobbies=elder_data.hobbies,
        comments=elder_data.comments
    )

    session.add(new_elder)
    await session.commit()
    await session.refresh(new_elder)

    if avatar:
        bucket_name = config.minio.define_buckets['avatars']
        if not bucket_name:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail='Avatars bucket not configured'
            )

        minio_client = MinioClient(bucket_name=bucket_name)
        avatar_key = f'elder_{new_elder.id}.webp'
        data = await convert_to_webp(avatar)

        await minio_client.upload_file(
            file_name=avatar_key,
            data=data,
            content_type='image/webp'
        )

        await session.execute(
            update(ElderModel)
            .where(ElderModel.id == new_elder.id)
            .values(is_has_avatar=True)
        )
        await session.commit()

    avatar_url = await get_elder_avatar_presigned_url(new_elder)

    elder_dict = {
        'id': new_elder.id,
        'relative_id': new_elder.relative_id,
        'full_name': new_elder.full_name,
        'birthday': new_elder.birthday,
        'health_status': new_elder.health_status,
        'physical_limitations': new_elder.physical_limitations,
        'disease': new_elder.disease,
        'address': new_elder.address,
        'features': new_elder.features,
        'hobbies': new_elder.hobbies,
        'comments': new_elder.comments,
        'avatar_presigned_url': avatar_url,
        'created_at': new_elder.created_at,
        'updated_at': new_elder.updated_at
    }

    return ElderResponseSchema.model_validate(elder_dict)


@request_router.get(
    '/api/v1/elders/me',
    response_model=list[ElderResponseSchema],
    tags=['elders']
)
async def get_my_elders(
    session: SessionDep,
    user: UserModel = Depends(get_current_user)
):
    result = await session.execute(
        select(ElderModel)
        .where(ElderModel.relative_id == user.id)
    )
    elders = result.scalars().all()

    elders_response = []
    for elder in elders:
        avatar_url = await get_elder_avatar_presigned_url(elder)

        elder_dict = {
            'id': elder.id,
            'relative_id': elder.relative_id,
            'full_name': elder.full_name,
            'birthday': elder.birthday,
            'health_status': elder.health_status,
            'physical_limitations': elder.physical_limitations,
            'disease': elder.disease,
            'address': elder.address,
            'features': elder.features,
            'hobbies': elder.hobbies,
            'comments': elder.comments,
            'avatar_presigned_url': avatar_url,
            'created_at': elder.created_at,
            'updated_at': elder.updated_at
        }

        elders_response.append(ElderResponseSchema.model_validate(elder_dict))

    return elders_response


@request_router.get(
    '/api/v1/elders/{elder_id}',
    response_model=ElderResponseSchema,
    tags=['elders']
)
async def get_elder(
    elder_id: UUID,
    session: SessionDep,
    user: UserModel = Depends(get_current_user)
):
    result = await session.execute(
        select(ElderModel)
        .where(ElderModel.id == elder_id)
    )
    elder = result.scalar_one_or_none()

    if elder is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Elder not found'
        )

    if user.role == RoleEnum.RELATIVE and elder.relative_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='You do not have access to this elder'
        )

    avatar_url = await get_elder_avatar_presigned_url(elder)

    elder_dict = {
        'id': elder.id,
        'relative_id': elder.relative_id,
        'full_name': elder.full_name,
        'birthday': elder.birthday,
        'health_status': elder.health_status,
        'physical_limitations': elder.physical_limitations,
        'disease': elder.disease,
        'address': elder.address,
        'features': elder.features,
        'hobbies': elder.hobbies,
        'comments': elder.comments,
        'avatar_presigned_url': avatar_url,
        'created_at': elder.created_at,
        'updated_at': elder.updated_at
    }

    return ElderResponseSchema.model_validate(elder_dict)


@request_router.patch(
    '/api/v1/elders/{elder_id}',
    response_model=ElderResponseSchema,
    tags=['elders']
)
async def update_elder(
    elder_id: UUID,
    session: SessionDep,
    elder_data: ElderUpdateSchema = Depends(ElderUpdateSchema.as_form),
    user: UserModel = Depends(get_current_user),
    avatar: UploadFile | None = File(None)
):
    result = await session.execute(
        select(ElderModel)
        .where(ElderModel.id == elder_id)
    )
    elder = result.scalar_one_or_none()

    if elder is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Elder not found'
        )

    if elder.relative_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='You cannot update this elder'
        )

    if elder_data:
        update_data = elder_data.model_dump(exclude_none=True)
        if update_data:
            await session.execute(
                update(ElderModel)
                .where(ElderModel.id == elder.id)
                .values(**update_data)
            )

    if avatar:
        bucket_name = config.minio.define_buckets['avatars']
        if not bucket_name:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail='Avatars bucket not configured'
            )

        minio_client = MinioClient(bucket_name=bucket_name)
        avatar_key = f'elder_{elder.id}.webp'
        data = await convert_to_webp(avatar)

        await minio_client.upload_file(
            file_name=avatar_key,
            data=data,
            content_type='image/webp'
        )

        await session.execute(
            update(ElderModel)
            .where(ElderModel.id == elder.id)
            .values(is_has_avatar=True)
        )

    await session.commit()

    result = await session.execute(
        select(ElderModel).where(ElderModel.id == elder_id)
    )
    updated_elder = result.scalar_one()

    avatar_url = await get_elder_avatar_presigned_url(updated_elder)

    elder_dict = {
        'id': updated_elder.id,
        'relative_id': updated_elder.relative_id,
        'full_name': updated_elder.full_name,
        'birthday': updated_elder.birthday,
        'health_status': updated_elder.health_status,
        'physical_limitations': updated_elder.physical_limitations,
        'disease': updated_elder.disease,
        'address': updated_elder.address,
        'features': updated_elder.features,
        'hobbies': updated_elder.hobbies,
        'comments': updated_elder.comments,
        'avatar_presigned_url': avatar_url,
        'created_at': updated_elder.created_at,
        'updated_at': updated_elder.updated_at
    }

    return ElderResponseSchema.model_validate(elder_dict)


@request_router.delete(
    '/api/v1/elders/{elder_id}',
    status_code=status.HTTP_204_NO_CONTENT,
    tags=['elders']
)
async def delete_elder(
    elder_id: UUID,
    session: SessionDep,
    user: UserModel = Depends(get_current_user)
):
    result = await session.execute(select(ElderModel).where(ElderModel.id == elder_id))
    elder = result.scalar_one_or_none()

    if elder is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Elder not found'
        )

    if elder.relative_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='You cannot delete this elder'
        )

    if elder.is_has_avatar:
        bucket_name = config.minio.define_buckets['avatars']
        if bucket_name:
            minio_client = MinioClient(bucket_name=bucket_name)
            avatar_key = f'elder_{elder.id}.webp'
            await minio_client.delete_file(avatar_key)

    await session.execute(delete(ElderModel).where(ElderModel.id == elder_id))
    await session.commit()

    return None


@request_router.post(
    '/api/v1/responses',
    response_model=ResponseSchema,
    status_code=status.HTTP_201_CREATED,
    tags=['responses']
)
async def create_response(
    response_data: ResponseCreationSchema,
    session: SessionDep,
    user: UserModel = Depends(get_current_user)
):
    if user.role != RoleEnum.VOLUNTEER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Only volunteers can respond to requests'
        )

    request_result = await session.execute(
        select(RequestModel).where(RequestModel.id == response_data.request_id)
    )
    request = request_result.scalar_one_or_none()

    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Request not found'
        )

    if request.status != RequestStatusEnum.OPEN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Can only respond to open requests'
        )

    existing_response_result = await session.execute(
        select(ResponseModel).where(
            ResponseModel.request_id == response_data.request_id,
            ResponseModel.volunteer_id == user.id
        )
    )
    existing_response = existing_response_result.scalar_one_or_none()

    if existing_response:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='You have already responded to this request'
        )

    if request.relative_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='You cannot respond to your own request'
        )

    new_response = ResponseModel(
        request_id=response_data.request_id,
        volunteer_id=user.id
    )

    session.add(new_response)
    await session.commit()
    await session.refresh(new_response)

    return new_response


@request_router.get(
    '/api/v1/responses/request/{request_id}',
    response_model=list[ResponseWithDetailsSchema],
    tags=['responses']
)
async def get_responses_for_request(
    request_id: UUID,
    session: SessionDep,
    user: UserModel = Depends(get_current_user)
):
    request_result = await session.execute(
        select(RequestModel).where(RequestModel.id == request_id)
    )
    request = request_result.scalar_one_or_none()

    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Request not found'
        )

    if user.id != request.relative_id and user.role != RoleEnum.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='You do not have permission to view responses for this request'
        )

    responses_result = await session.execute(
        select(ResponseModel)
        .options(selectinload(ResponseModel.volunteer))
        .where(ResponseModel.request_id == request_id)
        .order_by(ResponseModel.created_at.desc())
    )
    responses = responses_result.scalars().all()

    response_list = []
    for response in responses:
        response_dict = {
            'id': response.id,
            'request_id': response.request_id,
            'volunteer_id': response.volunteer_id,
            'created_at': response.created_at,
            'updated_at': response.updated_at
        }

        if response.volunteer:
            volunteer_data = await get_user_short_schema(response.volunteer)
            response_dict['volunteer'] = volunteer_data

        response_list.append(ResponseWithDetailsSchema.model_validate(response_dict))

    return response_list


@request_router.get(
    '/api/v1/responses/me',
    response_model=list[ResponseSchema],
    tags=['responses']
)
async def get_my_responses(
    session: SessionDep,
    user: UserModel = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=50),
    cursor: datetime | None = Query(None)
):
    if user.role != RoleEnum.VOLUNTEER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Only volunteers can view their responses'
        )

    query = select(ResponseModel).where(
        ResponseModel.volunteer_id == user.id
    )

    if cursor:
        query = query.where(ResponseModel.created_at < cursor)

    query = query.order_by(ResponseModel.created_at.desc()).limit(limit)

    result = await session.execute(query)
    responses = result.scalars().all()

    return responses


@request_router.delete(
    '/api/v1/responses/{response_id}',
    status_code=status.HTTP_204_NO_CONTENT,
    tags=['responses']
)
async def delete_response(
    response_id: UUID,
    session: SessionDep,
    user: UserModel = Depends(get_current_user)
):
    response_result = await session.execute(
        select(ResponseModel).where(ResponseModel.id == response_id)
    )
    response = response_result.scalar_one_or_none()

    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Response not found'
        )

    if response.volunteer_id != user.id and user.role != RoleEnum.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='You cannot delete this response'
        )

    await session.delete(response)
    await session.commit()

    return None


@request_router.post(
    '/api/v1/thanks',
    response_model=ThanksSchema,
    status_code=status.HTTP_201_CREATED,
    tags=['thanks']
)
async def create_thanks(
    thanks_data: ThanksCreateSchema,
    session: SessionDep,
    user: UserModel = Depends(get_current_user)
):
    if user.role != RoleEnum.RELATIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Only relatives can thank volunteers'
        )

    request_result = await session.execute(
        select(RequestModel).where(RequestModel.id == thanks_data.request_id)
    )
    request = request_result.scalar_one_or_none()

    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Request not found'
        )

    if request.relative_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='You can only thank volunteers for your own requests'
        )

    if request.status != RequestStatusEnum.DONE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Can only thank for completed requests'
        )

    if not request.volunteer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='No volunteer assigned to this request'
        )

    if request.volunteer_id != thanks_data.to_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Can only thank the volunteer who completed this request'
        )

    existing_thanks_result = await session.execute(
        select(ThanksModel).where(
            ThanksModel.request_id == thanks_data.request_id,
            ThanksModel.from_user_id == user.id
        )
    )
    existing_thanks = existing_thanks_result.scalar_one_or_none()

    if existing_thanks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='You have already thanked for this request'
        )

    new_thanks = ThanksModel(
        from_user_id=user.id,
        to_user_id=thanks_data.to_user_id,
        request_id=thanks_data.request_id
    )

    session.add(new_thanks)
    await session.commit()
    await session.refresh(new_thanks)

    return new_thanks


@request_router.get(
    '/api/v1/thanks/user/{user_id}/count',
    response_model=ThanksCountResponse,
    tags=['thanks']
)
async def get_thanks_count(
    user_id: UUID,
    session: SessionDep,
    user: UserModel = Depends(get_current_user)
):
    if user.role != RoleEnum.VOLUNTEER and user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Only volunteers can view their thanks count'
        )

    thanks_count_result = await session.execute(
        select(func.count(ThanksModel.id))
        .where(ThanksModel.to_user_id == user_id)
    )
    thanks_count = thanks_count_result.scalar() or 0

    return ThanksCountResponse(
        user_id=user_id,
        thanks_count=thanks_count
    )


@request_router.get(
    '/api/v1/thanks/user/{user_id}',
    response_model=list[ThanksSchema],
    tags=['thanks']
)
async def get_user_thanks(
    user_id: UUID,
    session: SessionDep,
    user: UserModel = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=50),
    cursor: datetime | None = Query(None)
):
    if user.role != RoleEnum.VOLUNTEER and user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='You can only view your own thanks'
        )

    query = select(ThanksModel).where(
        ThanksModel.to_user_id == user_id
    )

    if cursor:
        query = query.where(ThanksModel.created_at < cursor)

    query = query.order_by(ThanksModel.created_at.desc()).limit(limit)

    result = await session.execute(query)
    thanks = result.scalars().all()

    return thanks


@request_router.get(
    '/api/v1/thanks/me',
    response_model=list[ThanksSchema],
    tags=['thanks']
)
async def get_my_thanks(
    session: SessionDep,
    user: UserModel = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=50),
    cursor: datetime | None = Query(None)
):
    if user.role != RoleEnum.VOLUNTEER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Only volunteers have thanks'
        )

    query = select(ThanksModel).where(
        ThanksModel.to_user_id == user.id
    )

    if cursor:
        query = query.where(ThanksModel.created_at < cursor)

    query = query.order_by(ThanksModel.created_at.desc()).limit(limit)

    result = await session.execute(query)
    thanks = result.scalars().all()

    return thanks


@request_router.get(
    '/api/v1/thanks/request/{request_id}',
    response_model=ThanksSchema | None,
    tags=['thanks']
)
async def get_thanks_for_request(
    request_id: UUID,
    session: SessionDep,
    user: UserModel = Depends(get_current_user)
):
    request_result = await session.execute(
        select(RequestModel).where(RequestModel.id == request_id)
    )
    request = request_result.scalar_one_or_none()

    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Request not found'
        )

    if user.id != request.relative_id and user.id != request.volunteer_id and user.role != RoleEnum.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='You do not have permission to view thanks for this request'
        )

    thanks_result = await session.execute(
        select(ThanksModel)
        .where(ThanksModel.request_id == request_id)
    )
    thanks = thanks_result.scalar_one_or_none()

    return thanks
