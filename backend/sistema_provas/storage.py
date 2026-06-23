"""Armazenamento de arquivos enviados (uploads), ex.: imagens de notícias.

Os arquivos ficam em backend/uploads/<subdir>/ e são servidos pela app
em /uploads/... (StaticFiles montado em app.py).
"""

import secrets
from http import HTTPStatus
from pathlib import Path

from fastapi import HTTPException, UploadFile

UPLOAD_ROOT = Path(__file__).resolve().parent.parent / 'uploads'
NEWS_SUBDIR = 'news'

_ALLOWED_CONTENT_TYPES = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
}
_MAX_BYTES = 5 * 1024 * 1024  # 5 MB
_CHUNK_SIZE = 64 * 1024


def ensure_dirs() -> None:
    (UPLOAD_ROOT / NEWS_SUBDIR).mkdir(parents=True, exist_ok=True)


def _matches_signature(content: bytes, content_type: str) -> bool:
    """Confere os magic bytes do conteúdo contra o tipo declarado, para
    não confiar apenas no Content-Type enviado pelo cliente."""
    if content_type == 'image/png':
        return content[:8] == b'\x89PNG\r\n\x1a\n'
    if content_type == 'image/jpeg':
        return content[:3] == b'\xff\xd8\xff'
    if content_type == 'image/gif':
        return content[:6] in {b'GIF87a', b'GIF89a'}
    if content_type == 'image/webp':
        return content[:4] == b'RIFF' and content[8:12] == b'WEBP'
    return False


async def save_image(file: UploadFile, subdir: str = NEWS_SUBDIR) -> str:
    """Salva uma imagem validando tipo, tamanho e assinatura de conteúdo.
    Retorna a URL relativa (/uploads/...)."""
    content_type = file.content_type or ''
    ext = _ALLOWED_CONTENT_TYPES.get(content_type)
    if ext is None:
        raise HTTPException(
            status_code=HTTPStatus.UNSUPPORTED_MEDIA_TYPE,
            detail='Formato de imagem inválido (use JPG, PNG, WEBP ou GIF).',
        )

    # Lê em pedaços e aborta cedo se exceder o limite (evita bufferizar
    # arquivos enormes em memória).
    size = 0
    chunks: list[bytes] = []
    while True:
        chunk = await file.read(_CHUNK_SIZE)
        if not chunk:
            break
        size += len(chunk)
        if size > _MAX_BYTES:
            raise HTTPException(
                status_code=HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
                detail='Imagem muito grande (máximo 5 MB).',
            )
        chunks.append(chunk)
    content = b''.join(chunks)

    if not _matches_signature(content, content_type):
        raise HTTPException(
            status_code=HTTPStatus.UNSUPPORTED_MEDIA_TYPE,
            detail='O conteúdo enviado não é uma imagem válida.',
        )

    target_dir = UPLOAD_ROOT / subdir
    target_dir.mkdir(parents=True, exist_ok=True)
    filename = f'{secrets.token_hex(16)}{ext}'
    (target_dir / filename).write_bytes(content)

    return f'/uploads/{subdir}/{filename}'
