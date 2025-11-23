from typing import Dict

from pydantic import Field
from pydantic.types import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class BaseConfig(BaseSettings):
    model_config = SettingsConfigDict(
        env_file='.env',
        env_file_encoding='utf-8',
        extra='allow'
    )


class DataBaseConfig(BaseConfig):
    host: str
    user: str
    password: SecretStr
    port: int
    dbname: str

    model_config = SettingsConfigDict(
        env_prefix='POSTGRES_'
    )


class SecureConfig(BaseConfig):
    secret_key: SecretStr
    algorithm: str
    access_ttl: int = Field(alias='ACCESS_TOKEN_EXPIRE_MINUTES')
    refresh_ttl: int = Field(alias='REFRESH_TOKEN_EXPIRE_DAYS')


class MinioConfig(BaseConfig):
    buckets: str
    url: str
    root_user: SecretStr
    root_password: SecretStr

    model_config = SettingsConfigDict(
        env_prefix='MINIO_'
    )

    @property
    def define_buckets(self) -> Dict[str, str]:
        buckets = {}
        for item in self.buckets.split(','):
            if not item or ':' not in item:
                continue
            key, value = item.split(':', 1)
            buckets[key.strip()] = value.strip()
        return buckets


class Config(BaseSettings):
    db: DataBaseConfig = Field(default_factory=DataBaseConfig)
    secure: SecureConfig = Field(default_factory=SecureConfig)
    minio: MinioConfig = Field(default_factory=MinioConfig)

    @classmethod
    def load(cls):
        return cls()


config = Config().load()
