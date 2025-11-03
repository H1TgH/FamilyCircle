from pydantic.types import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class BaseConfig(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')


class DataBaseConfig(BaseConfig):
    host: str
    user: str
    password: SecretStr
    port: int
    dbname: str

    model_config = SettingsConfigDict(
        env_prefix='POSTGRES_'
    )


class Config(BaseSettings):
    db: DataBaseConfig = Field(default_factory=DataBaseConfig)

    @classmethod
    def load(cls):
        return cls()


config = Config().load()
