from celery import Celery

from src.config import config


celery_app = Celery(
    'familycircle',
    broker=config.redis.url,
    backend=config.redis.url,
)

import src.notifications.tasks  # noqa