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


class Config(BaseSettings):
    db: DataBaseConfig = Field(default_factory=DataBaseConfig)
    secure: SecureConfig = Field(default_factory=SecureConfig)

    @classmethod
    def load(cls):
        return cls()


config = Config().load()
