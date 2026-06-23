from http import HTTPStatus
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sistema_provas.cache import (
    cache_get_json,
    cache_invalidate,
    cache_set_json,
)
from sistema_provas.database import get_session
from sistema_provas.models import MenuItem, User
from sistema_provas.schemas import (
    CardapioItemCreate,
    CardapioItemOut,
    CardapioItemUpdate,
    CardapioListaOut,
)
from sistema_provas.security import get_current_staff_user

router = APIRouter(prefix='/cardapio', tags=['cardapio'])
Session = Annotated[AsyncSession, Depends(get_session)]
StaffUser = Annotated[User, Depends(get_current_staff_user)]

CARDAPIO_CACHE_KEY = 'cardapio:list'


def _item_out(row: MenuItem) -> CardapioItemOut:
    return CardapioItemOut(
        id=row.id,
        dia=row.dia_label,
        ordem_dia=row.ordem_dia,
        refeicao=row.refeicao,
        titulo=row.titulo,
        descricao=row.descricao,
        imagem_url=row.imagem_url,
    )


async def _invalidar_cache():
    await cache_invalidate(CARDAPIO_CACHE_KEY)


@router.get('/', response_model=CardapioListaOut)
async def listar_cardapio(session: Session):
    """Cardápio semanal (público). Ordenado por dia e tipo de refeição."""
    cached = await cache_get_json(CARDAPIO_CACHE_KEY)
    if cached is not None:
        return cached

    rows = (
        await session.scalars(
            select(MenuItem).order_by(
                MenuItem.ordem_dia,
                MenuItem.ordem_refeicao,
            )
        )
    ).all()
    payload = CardapioListaOut(itens=[_item_out(r) for r in rows]).model_dump()
    await cache_set_json(CARDAPIO_CACHE_KEY, payload)
    return payload


@router.post(
    '/itens',
    status_code=HTTPStatus.CREATED,
    response_model=CardapioItemOut,
)
async def criar_item_cardapio(
    body: CardapioItemCreate,
    _staff: StaffUser,
    session: Session,
):
    row = MenuItem(
        dia_label=body.dia,
        ordem_dia=body.ordem_dia,
        ordem_refeicao=body.ordem_refeicao,
        refeicao=body.refeicao,
        titulo=body.titulo,
        descricao=body.descricao,
        imagem_url=body.imagem_url,
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    await _invalidar_cache()
    return _item_out(row)


@router.put('/itens/{item_id}', response_model=CardapioItemOut)
async def atualizar_item_cardapio(
    item_id: int,
    body: CardapioItemUpdate,
    _staff: StaffUser,
    session: Session,
):
    row = await session.scalar(select(MenuItem).where(MenuItem.id == item_id))
    if not row:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail='Item do cardápio não encontrado',
        )
    data = body.model_dump(exclude_unset=True)
    if 'dia' in data:
        row.dia_label = data.pop('dia')
    for k, v in data.items():
        setattr(row, k, v)
    session.add(row)
    await session.commit()
    await session.refresh(row)
    await _invalidar_cache()
    return _item_out(row)


@router.delete('/itens/{item_id}', status_code=HTTPStatus.NO_CONTENT)
async def remover_item_cardapio(
    item_id: int,
    _staff: StaffUser,
    session: Session,
):
    row = await session.scalar(select(MenuItem).where(MenuItem.id == item_id))
    if not row:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail='Item do cardápio não encontrado',
        )
    await session.delete(row)
    await session.commit()
    await _invalidar_cache()
