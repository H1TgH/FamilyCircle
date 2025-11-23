from aioboto3.session import Session
from contextlib import asynccontextmanager
from src.config import config


class MinioClient:
    def __init__(
        self,
        bucket_name: str
    ) -> None:
        self.bucket_name = bucket_name
        self.session = Session()

    @asynccontextmanager
    async def get_client(self):
        async with self.session.client(
            's3',
            aws_access_key_id=config.minio.root_user.get_secret_value(),
            aws_secret_access_key=config.minio.root_password.get_secret_value(),
            endpoint_url=config.minio.minio_url
        ) as client:
            yield client

    async def upload_file(self,
        file_name: str,
        data: bytes,
        content_type='application/octet-stream'
    ):
        async with self.get_client() as client:
            await client.put_object(
                Bucket=self.bucket_name,
                Key=file_name,
                Body=data,
                ContentType=content_type
            )
