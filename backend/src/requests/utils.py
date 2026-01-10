from src.requests.models import ElderModel
from src.s3_storage.utils import get_avatar_presigned_url, get_elder_avatar_presigned_url
from src.users.models import UserModel


async def get_user_short_schema(user: UserModel) -> dict:
    avatar_url = await get_avatar_presigned_url(user)

    full_name_parts = []
    if user.surname:
        full_name_parts.append(user.surname)
    if user.name:
        full_name_parts.append(user.name)
    if user.patronymic:
        full_name_parts.append(user.patronymic)

    full_name = ' '.join(full_name_parts) if full_name_parts else 'Неизвестно'

    return {
        'id': user.id,
        'full_name': full_name,
        'avatar_presigned_url': avatar_url
    }


async def get_elder_short_schema(elder: ElderModel) -> dict:
    avatar_url = await get_elder_avatar_presigned_url(elder)
    return {
        'id': elder.id,
        'full_name': elder.full_name,
        'avatar_presigned_url': avatar_url
    }
