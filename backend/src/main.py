import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from src.reports.router import reports_router
from src.requests.router import request_router
from src.users.router import users_router


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(users_router)
app.include_router(request_router)
app.include_router(reports_router)

FRONT_DIR = 'front'


@app.get('/{page_name}')
async def serve_page(page_name: str):
    if page_name.startswith('api'):
        return {'error': 'Not found'}

    page_path = os.path.join(FRONT_DIR, f'{page_name}.html')

    if os.path.exists(page_path):
        return FileResponse(page_path)
    else:
        index_path = os.path.join(FRONT_DIR, 'index.html')
        if os.path.exists(index_path):
            return FileResponse(index_path)
    return {'error': f'Page {page_name} not found'}


app.mount(
    '/',
    StaticFiles(directory=FRONT_DIR, html=True),
    name='front',
)
