"""Camada de cache Redis (assíncrona) para o Portal Cidade do Idoso.

Política: cache-aside na leitura + write-through (invalidação por evento)
nas escritas dos endpoints de cardápio e notícias. O cache é totalmente
resiliente — se REDIS_URL estiver vazio, a lib `redis` não estiver
instalada, ou o servidor Redis estiver fora do ar, todas as operações
viram no-op e a API continua funcionando direto contra o banco.

Expõe métricas (hits/misses/hit-rate/tempo médio) para o endpoint
`/metrics/cache` consumido pelo Dashboard administrativo (Sprint 5).
"""

import json
import logging
import time
from typing import Any, Optional

from sistema_provas.settings import Settings

logger = logging.getLogger('sistema_provas.cache')
settings = Settings()

try:  # import opcional — ausência não quebra a aplicação/testes
    from redis import asyncio as aioredis
except Exception:  # pragma: no cover - ambiente sem redis
    aioredis = None

_client = None
_client_failed = False

_metrics = {
    'hits': 0,
    'misses': 0,
    'sets': 0,
    'invalidations': 0,
    'get_calls': 0,
    'get_time_ms': 0.0,
}


def cache_enabled() -> bool:
    return (
        bool(settings.REDIS_URL)
        and aioredis is not None
        and not _client_failed
    )


async def _get_client():
    global _client, _client_failed  # noqa: PLW0603
    if not cache_enabled():
        return None
    if _client is None:
        try:
            _client = aioredis.from_url(
                settings.REDIS_URL, decode_responses=True
            )
        except Exception as exc:  # pragma: no cover
            logger.warning('Falha ao conectar no Redis: %s', exc)
            _client_failed = True
            return None
    return _client


async def cache_get_json(key: str) -> Optional[Any]:
    client = await _get_client()
    if client is None:
        return None
    start = time.perf_counter()
    try:
        raw = await client.get(key)
    except Exception as exc:  # pragma: no cover - Redis fora do ar
        logger.warning('cache get falhou (%s): %s', key, exc)
        return None
    finally:
        _metrics['get_calls'] += 1
        _metrics['get_time_ms'] += (time.perf_counter() - start) * 1000

    if raw is None:
        _metrics['misses'] += 1
        return None
    _metrics['hits'] += 1
    try:
        return json.loads(raw)
    except (ValueError, TypeError):
        return None


async def cache_set_json(
    key: str, value: Any, ttl: Optional[int] = None
) -> None:
    client = await _get_client()
    if client is None:
        return
    ttl = ttl if ttl is not None else settings.CACHE_DEFAULT_TTL_SECONDS
    try:
        await client.set(key, json.dumps(value, default=str), ex=ttl)
        _metrics['sets'] += 1
    except Exception as exc:  # pragma: no cover - Redis fora do ar
        logger.warning('cache set falhou (%s): %s', key, exc)


async def cache_invalidate(*keys: str) -> None:
    """Invalidação por evento (write-through): remove chaves após escrita."""
    client = await _get_client()
    if client is None:
        return
    try:
        if keys:
            await client.delete(*keys)
            _metrics['invalidations'] += len(keys)
    except Exception as exc:  # pragma: no cover - Redis fora do ar
        logger.warning('cache invalidate falhou (%s): %s', keys, exc)


def cache_metrics() -> dict:
    hits = _metrics['hits']
    misses = _metrics['misses']
    total = hits + misses
    calls = _metrics['get_calls']
    return {
        'enabled': cache_enabled(),
        'hits': hits,
        'misses': misses,
        'hit_rate': round(hits / total, 4) if total else 0.0,
        'avg_get_ms': round(_metrics['get_time_ms'] / calls, 3)
        if calls
        else 0.0,
        'sets': _metrics['sets'],
        'invalidations': _metrics['invalidations'],
    }
