import logging
import time
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from sistema_provas import storage
from sistema_provas.cache import cache_metrics
from sistema_provas.routers import (
    atividades,
    auth,
    cardapio,
    dashboard,
    home,
    noticias,
    password,
    users,
)
from sistema_provas.schemas import CacheMetricsOut, Message

# --- Logging estruturado / monitoramento (Sprint 4) ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(name)s | %(message)s',
)
access_logger = logging.getLogger('sistema_provas.access')

app = FastAPI(title='Portal Cidade do Idoso API')

# --- CORS ---
# Regex cobre qualquer porta em localhost/127.0.0.1 (frontend estático, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=(
        r'https?://('
        r'localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0'
        r'|192\.168\.\d{1,3}\.\d{1,3}'
        r'|10\.\d{1,3}\.\d{1,3}\.\d{1,3}'
        r')(:\d+)?'
    ),
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.middleware('http')
async def log_requests(request: Request, call_next):
    """Monitoramento: registra cada requisição com método, rota,
    status e tempo de resposta (ms)."""
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    access_logger.info(
        'method=%s path=%s status=%s duration_ms=%.2f client=%s',
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
        request.client.host if request.client else '-',
    )
    response.headers['X-Process-Time-ms'] = f'{elapsed_ms:.2f}'
    return response


# --- Arquivos enviados (imagens de notícias) ---
storage.ensure_dirs()
app.mount(
    '/uploads',
    StaticFiles(directory=str(storage.UPLOAD_ROOT)),
    name='uploads',
)

# --- Routers ---
app.include_router(users.router)
app.include_router(auth.router)
app.include_router(noticias.router)
app.include_router(password.router)
app.include_router(atividades.router)
app.include_router(cardapio.router)
app.include_router(dashboard.router)
app.include_router(home.router)


@app.get('/', status_code=HTTPStatus.OK, response_model=Message)
def read_root():
    return {'Message': 'Hello World'}


@app.get(
    '/metrics/cache',
    status_code=HTTPStatus.OK,
    response_model=CacheMetricsOut,
    tags=['metrics'],
)
def metrics_cache():
    """Métricas do cache Redis (hit rate, tempo médio) — Sprint 5."""
    return cache_metrics()
