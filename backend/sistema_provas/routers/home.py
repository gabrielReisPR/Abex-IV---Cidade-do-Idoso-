"""Endpoint agregador da Home (dados dinâmicos da página inicial).

Reúne, numa só chamada pública, um resumo do portal para a tela inicial:
próximas atividades, últimas notícias e itens de cardápio.
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sistema_provas.database import get_session
from sistema_provas.models import Activity, MenuItem, News

router = APIRouter(prefix='/home', tags=['home'])
Session = Annotated[AsyncSession, Depends(get_session)]


@router.get('/resumo')
async def resumo_home(session: Session):
    atividades = (
        await session.scalars(select(Activity).order_by(Activity.id).limit(6))
    ).all()
    noticias = (
        await session.scalars(select(News).order_by(News.id.desc()).limit(3))
    ).all()
    cardapio = (
        await session.scalars(
            select(MenuItem)
            .order_by(MenuItem.ordem_dia, MenuItem.ordem_refeicao)
            .limit(4)
        )
    ).all()

    return {
        'atividades': [
            {
                'id': a.id,
                'titulo': a.title,
                'hora': a.time_label,
                'data': a.date_label,
                'imagem_url': a.image_url,
            }
            for a in atividades
        ],
        'noticias': [
            {
                'id': n.id,
                'titulo': n.titulo,
                'descricao': n.descricao,
                'fonte': n.fonte,
                'imagem_url': n.imagem_url,
            }
            for n in noticias
        ],
        'cardapio': [
            {
                'id': c.id,
                'dia': c.dia_label,
                'refeicao': c.refeicao,
                'titulo': c.titulo,
                'descricao': c.descricao,
            }
            for c in cardapio
        ],
    }
