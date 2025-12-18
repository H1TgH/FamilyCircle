from email.message import EmailMessage

import aiosmtplib

from src.config import config


async def send_email(
    to_email: str,
    subject: str,
    body: str,
):
    message = EmailMessage()
    message['From'] = f'{config.smtp.sender_name} <{config.smtp.user}>'
    message['To'] = to_email
    message['Subject'] = subject
    message.set_content(body)

    await aiosmtplib.send(
        message,
        hostname=config.smtp.host,
        port=config.smtp.port,
        username=config.smtp.user,
        password=config.smtp.password.get_secret_value(),
        start_tls=True,
    )
