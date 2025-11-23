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
    avatars_bucket: str
    reports_bucket: str
    minio_url: str
    root_user: SecretStr
    root_password: SecretStr

    @classmethod
    def from_env_buckets(cls):
        import os
        raw = os.getenv('MINIO_BUCKETS', '')
        mapping = {}
        for item in raw.split(','):
            if not item:
                continue
            key, value = item.split(':')
            mapping[f'{key}_bucket'] = value

        mapping['minio_url'] = os.getenv('MINIO_URL')
        mapping['root_user'] = os.getenv('MINIO_ROOT_USER')
        mapping['root_password'] = os.getenv('MINIO_ROOT_PASSWORD')

        return cls(**mapping)


class Config(BaseSettings):
    db: DataBaseConfig = Field(default_factory=DataBaseConfig)
    secure: SecureConfig = Field(default_factory=SecureConfig)
    minio: MinioConfig = Field(default_factory=MinioConfig.from_env_buckets)

    @classmethod
    def load(cls):
        return cls()


config = Config().load()
