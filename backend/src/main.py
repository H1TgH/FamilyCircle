from fastapi import FastAPI

from src.requests.router import request_router
from src.users.router import users_router


app = FastAPI()


app.include_router(users_router)
app.include_router(request_router)
