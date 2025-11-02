FROM python:3.13-slim

WORKDIR /app

COPY ./requirements.txt /app/requirements.txt
RUN pip install -r requirements.txt --no-cache-dir

COPY . .

RUN useradd -m -s /bin/bash FamilyCircle
USER FamilyCircle

EXPOSE 8000
