import asyncio

from src.notifications.celery_app import celery_app
from src.notifications.email import send_email


@celery_app.task(name='send_completion_email')
def send_completion_email(
    to_email: str,
    elder_name: str,
):
    subject = 'Заявка выполнена'
    body = (
        f'Здравствуйте!\n\n'
        f'Заявка для подопечного «{elder_name}» была выполнена.\n\n'
        f'Спасибо, что пользуетесь Family Circle.'
    )

    asyncio.run(
        send_email(
            to_email=to_email,
            subject=subject,
            body=body,
        )
    )
