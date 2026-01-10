from src.requests.models import ElderModel
from src.s3_storage.utils import get_avatar_presigned_url
from src.users.models import UserModel


async def get_user_short_schema(user: UserModel) -> dict:
    avatar_url = await get_avatar_presigned_url(user)
    return {
        'id': user.id,
        'full_name': f"{user.surname} {user.name} {user.patronymic or ''}".strip(),
        'avatar_presigned_url': avatar_url
    }


async def get_elder_short_schema(elder: ElderModel) -> dict:
    avatar_url = await get_avatar_presigned_url(elder)
    return {
        'id': elder.id,
        'full_name': elder.full_name,
        'avatar_presigned_url': avatar_url
    }
