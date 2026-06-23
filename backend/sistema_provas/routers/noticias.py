from http import HTTPStatus
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sistema_provas.cache import (
    cache_get_json,
    cache_invalidate,
    cache_set_json,
)
from sistema_provas.database import get_session
from sistema_provas.models import News, User
from sistema_provas.schemas import NoticiaCreate, NoticiaOut, NoticiaUpdate
from sistema_provas.security import get_current_staff_user
from sistema_provas.storage import save_image

router = APIRouter(tags=['noticias'])
Session = Annotated[AsyncSession, Depends(get_session)]
StaffUser = Annotated[User, Depends(get_current_staff_user)]

NOTICIAS_CACHE_KEY = 'noticias:list'

_FALLBACK_NOTICIAS = [
    {
        'titulo': 'Prefeitura de Chapecó — serviços e comunicados',
        'descricao': (
            'Portal oficial com notícias, editais, licitações e '
            'serviços ao cidadão da capital do Oeste catarinense.'
        ),
        'fonte': 'https://www.chapeco.sc.gov.br/',
    },
    {
        'titulo': 'G1 — Região de Chapecó',
        'descricao': (
            'Cobertura de Santa Catarina com foco no Oeste: política, '
            'economia, trânsito e cotidiano de Chapecó e região.'
        ),
        'fonte': 'https://g1.globo.com/sc/santa-catarina/regiao-de-chapeco/',
    },
    {
        'titulo': 'Unochapecó — universidade e comunidade',
        'descricao': (
            'Notícias da Universidade Comunitária da Região de Chapecó: '
            'cursos, pesquisa, extensão e eventos abertos à cidade.'
        ),
        'fonte': 'https://www.unochapeco.edu.br/',
    },
    {
        'titulo': 'ACIOC — Associação Comercial e Industrial de Chapecó',
        'descricao': (
            'Agenda empresarial, desenvolvimento econômico e '
            'iniciativas que fortalecem o comércio e a indústria local.'
        ),
        'fonte': 'https://acioc.com.br/',
    },
    {
        'titulo': 'Oeste em foco — trânsito e mobilidade na região',
        'descricao': (
            'Acompanhe obras, alternativas de transporte e planejamento '
            'urbano que impactam o deslocamento em Chapecó e arredores.'
        ),
        'fonte': 'https://g1.globo.com/sc/santa-catarina/',
    },
    {
        'titulo': 'Diário do Oeste — notícias da região',
        'descricao': (
            'Jornal com cobertura de Chapecó e Oeste catarinense: '
            'política, esporte, cultura e segurança no dia a dia.'
        ),
        'fonte': 'https://odiariodoeste.com.br/',
    },
]


async def _invalidar_cache():
    await cache_invalidate(NOTICIAS_CACHE_KEY)


@router.get('/noticias', response_model=list[NoticiaOut])
async def listar_noticias(session: Session):
    # Cache-aside: tenta o cache antes de bater no banco.
    cached = await cache_get_json(NOTICIAS_CACHE_KEY)
    if cached is not None:
        return cached

    rows = (await session.scalars(select(News).order_by(News.id.desc()))).all()
    if rows:
        data = [NoticiaOut.model_validate(r).model_dump() for r in rows]
        await cache_set_json(NOTICIAS_CACHE_KEY, data)
        return data

    # Garante que a página não fique vazia caso a base esteja vazia.
    return [
        {
            'id': i + 1,
            'titulo': n['titulo'],
            'descricao': n['descricao'],
            'fonte': n['fonte'],
        }
        for i, n in enumerate(_FALLBACK_NOTICIAS)
    ]


@router.post(
    '/noticias',
    status_code=HTTPStatus.CREATED,
    response_model=NoticiaOut,
)
async def criar_noticia(
    body: NoticiaCreate,
    _staff: StaffUser,
    session: Session,
):
    row = News(
        titulo=body.titulo,
        descricao=body.descricao,
        fonte=body.fonte,
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    await _invalidar_cache()  # write-through: invalida cache após escrita
    return row


@router.post('/noticias/{noticia_id}/imagem', response_model=NoticiaOut)
async def enviar_imagem_noticia(
    noticia_id: int,
    arquivo: UploadFile,
    _staff: StaffUser,
    session: Session,
):
    """Upload da imagem de uma notícia (multipart). Salva em /uploads."""
    row = await session.scalar(select(News).where(News.id == noticia_id))
    if not row:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail='Notícia não encontrada',
        )
    row.imagem_url = await save_image(arquivo)
    session.add(row)
    await session.commit()
    await session.refresh(row)
    await _invalidar_cache()
    return row


@router.patch('/noticias/{noticia_id}', response_model=NoticiaOut)
async def atualizar_noticia(
    noticia_id: int,
    body: NoticiaUpdate,
    _staff: StaffUser,
    session: Session,
):
    row = await session.scalar(select(News).where(News.id == noticia_id))
    if not row:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail='Notícia não encontrada',
        )
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)
    session.add(row)
    await session.commit()
    await session.refresh(row)
    await _invalidar_cache()
    return row


@router.delete('/noticias/{noticia_id}', status_code=HTTPStatus.NO_CONTENT)
async def remover_noticia(
    noticia_id: int,
    _staff: StaffUser,
    session: Session,
):
    row = await session.scalar(select(News).where(News.id == noticia_id))
    if not row:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail='Notícia não encontrada',
        )
    await session.delete(row)
    await session.commit()
    await _invalidar_cache()
