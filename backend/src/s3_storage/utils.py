from io import BytesIO

from fastapi import UploadFile
from PIL import Image

from src.config import config
from src.reports.models import ReportImageModel
from src.requests.models import ElderModel
from src.s3_storage.client import MinioClient
from src.users.models import UserModel


async def get_avatar_presigned_url(user: UserModel) -> str | None:
    if not user.is_has_avatar:
        return None

    bucket_name = config.minio.define_buckets['avatars']
    if not bucket_name:
        return None

    minio_client = MinioClient(bucket_name=bucket_name)

    async with minio_client.get_client() as client:
        url = await client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': f'user_{user.id}.webp'},
            ExpiresIn=600
        )

        return url.replace('http://minio:9000', 'http://localhost:9000')


async def get_elder_avatar_presigned_url(elder: ElderModel) -> str | None:
    if not elder.is_has_avatar:
        return None

    bucket_name = config.minio.define_buckets['avatars']
    if not bucket_name:
        return None

    minio_client = MinioClient(bucket_name=bucket_name)

    async with minio_client.get_client() as client:
        url = await client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': f'elder_{elder.id}.webp'},
            ExpiresIn=600
        )

        return url.replace('http://minio:9000', 'http://localhost:9000')


async def get_report_image_url(report_image: ReportImageModel) -> str | None:
    bucket_name = config.minio.define_buckets['reports']
    minio_client = MinioClient(bucket_name=bucket_name)

    async with minio_client.get_client() as client:
        url = await client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': report_image.file_key},
            ExpiresIn=600
        )

        return url.replace('http://minio:9000', 'http://localhost:9000')


async def convert_to_webp(uploaded: UploadFile) -> bytes:
    raw_data = await uploaded.read()

    buffer_in = BytesIO(raw_data)
    image = Image.open(buffer_in)
    image = image.convert('RGB')

    buffer_out = BytesIO()
    image.save(buffer_out, format='WEBP', quality=85)
    buffer_out.seek(0)

    return buffer_out.read()
