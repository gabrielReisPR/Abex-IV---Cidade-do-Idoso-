from datetime import date
from http import HTTPStatus
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from sistema_provas.database import get_session
from sistema_provas.models import (
    Activity,
    ActivityAttendance,
    ActivityEnrollment,
    User,
)
from sistema_provas.schemas import (
    AtividadeCreate,
    AtividadeOut,
    AtividadeUpdate,
    CatalogoAtividadesOut,
    InscricaoCreate,
    InscricaoOut,
    InscricoesAtividadeOut,
    InscritoOut,
    MinhasInscricoesOut,
    PresencaLinhaOut,
    PresencaListaOut,
    PresencaUpsert,
)
from sistema_provas.security import get_current_staff_user, get_current_user

router = APIRouter(prefix='/atividades', tags=['atividades'])
Session = Annotated[AsyncSession, Depends(get_session)]
CurrentUser = Annotated[User, Depends(get_current_user)]
StaffUser = Annotated[User, Depends(get_current_staff_user)]

STATUS_CONFIRMADO = 'confirmado'
STATUS_CANCELADO = 'cancelado'


def _atividade_out(
    row: Activity, inscritos: int | None = None
) -> AtividadeOut:
    vagas = row.capacidade
    disponiveis = None
    if vagas is not None and inscritos is not None:
        disponiveis = max(vagas - inscritos, 0)
    return AtividadeOut(
        id=row.id,
        titulo=row.title,
        hora=row.time_label,
        data=row.date_label,
        imagem_url=row.image_url,
        vagas=vagas,
        inscritos=inscritos,
        vagas_disponiveis=disponiveis,
    )


async def _contar_confirmados(session: AsyncSession, activity_id: int) -> int:
    return (
        await session.scalar(
            select(func.count())
            .select_from(ActivityEnrollment)
            .where(
                ActivityEnrollment.activity_id == activity_id,
                ActivityEnrollment.status == STATUS_CONFIRMADO,
            )
        )
    ) or 0


async def _validar_capacidade(
    session: AsyncSession, activity: Activity
) -> None:
    """Regra de negócio: bloqueia inscrição quando a atividade está lotada.

    Só aplica quando a atividade define `capacidade`. None = sem limite.
    """
    if activity.capacidade is None:
        return
    # Lock pessimista na linha da atividade para evitar corrida (TOCTOU):
    # inscrições concorrentes na mesma atividade são serializadas no
    # Postgres até o commit; no sqlite dos testes é um no-op inofensivo.
    await session.execute(
        select(Activity.id)
        .where(Activity.id == activity.id)
        .with_for_update()
    )
    confirmados = await _contar_confirmados(session, activity.id)
    if confirmados >= activity.capacidade:
        raise HTTPException(
            status_code=HTTPStatus.CONFLICT,
            detail='Atividade lotada: não há vagas disponíveis',
        )


def _inscricao_out(enr: ActivityEnrollment, act: Activity) -> InscricaoOut:
    return InscricaoOut(
        id=enr.id,
        status=enr.status,
        atividade=_atividade_out(act),
    )


async def _montar_presenca_lista(
    session: AsyncSession,
    activity_id: int,
    data_ref: date,
) -> PresencaListaOut:
    stmt = (
        select(ActivityEnrollment, User)
        .join(User, ActivityEnrollment.user_id == User.id)
        .where(
            ActivityEnrollment.activity_id == activity_id,
            ActivityEnrollment.status == STATUS_CONFIRMADO,
        )
        .order_by(User.username)
    )
    result = await session.execute(stmt)
    pairs = result.all()

    att_rows = (
        await session.scalars(
            select(ActivityAttendance).where(
                ActivityAttendance.activity_id == activity_id,
                ActivityAttendance.attendance_date == data_ref,
            )
        )
    ).all()
    by_user = {a.user_id: a.present for a in att_rows}

    linhas = [
        PresencaLinhaOut(
            user_id=u.id,
            username=u.username,
            first_name=u.first_name,
            last_name=u.last_name,
            present=by_user.get(u.id),
        )
        for _enr, u in pairs
    ]
    return PresencaListaOut(data=data_ref, linhas=linhas)


@router.get('/catalogo', response_model=CatalogoAtividadesOut)
async def listar_catalogo(session: Session):
    rows = (
        await session.scalars(select(Activity).order_by(Activity.id))
    ).all()

    counts_rows = (
        await session.execute(
            select(
                ActivityEnrollment.activity_id,
                func.count(),
            )
            .where(ActivityEnrollment.status == STATUS_CONFIRMADO)
            .group_by(ActivityEnrollment.activity_id)
        )
    ).all()
    counts = {activity_id: total for activity_id, total in counts_rows}

    return CatalogoAtividadesOut(
        atividades=[
            _atividade_out(a, inscritos=counts.get(a.id, 0)) for a in rows
        ],
    )


@router.get(
    '/minhas-inscricoes',
    response_model=MinhasInscricoesOut,
)
async def minhas_inscricoes(
    current_user: CurrentUser,
    session: Session,
):
    stmt = (
        select(ActivityEnrollment, Activity)
        .join(Activity, ActivityEnrollment.activity_id == Activity.id)
        .where(ActivityEnrollment.user_id == current_user.id)
        .order_by(ActivityEnrollment.id)
    )
    result = await session.execute(stmt)
    inscricoes = [_inscricao_out(enr, act) for enr, act in result.all()]
    return MinhasInscricoesOut(inscricoes=inscricoes)


@router.post(
    '/inscricoes',
    status_code=HTTPStatus.CREATED,
    response_model=InscricaoOut,
)
async def criar_inscricao(
    body: InscricaoCreate,
    current_user: CurrentUser,
    session: Session,
):
    activity = await session.scalar(
        select(Activity).where(Activity.id == body.activity_id)
    )
    if not activity:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail='Atividade não encontrada',
        )

    existing = await session.scalar(
        select(ActivityEnrollment).where(
            and_(
                ActivityEnrollment.user_id == current_user.id,
                ActivityEnrollment.activity_id == body.activity_id,
            )
        )
    )

    if existing:
        if existing.status == STATUS_CONFIRMADO:
            raise HTTPException(
                status_code=HTTPStatus.CONFLICT,
                detail='Você já está inscrito nesta atividade',
            )
        await _validar_capacidade(session, activity)
        existing.status = STATUS_CONFIRMADO
        session.add(existing)
        await session.commit()
        await session.refresh(existing)
        return _inscricao_out(existing, activity)

    await _validar_capacidade(session, activity)

    enrollment = ActivityEnrollment(
        user_id=current_user.id,
        activity_id=body.activity_id,
        status=STATUS_CONFIRMADO,
    )
    session.add(enrollment)
    await session.commit()
    await session.refresh(enrollment)
    return _inscricao_out(enrollment, activity)


@router.post(
    '/inscricoes/{inscricao_id}/cancelar',
    response_model=InscricaoOut,
)
async def cancelar_inscricao(
    inscricao_id: int,
    current_user: CurrentUser,
    session: Session,
):
    row = await session.scalar(
        select(ActivityEnrollment).where(
            ActivityEnrollment.id == inscricao_id,
            ActivityEnrollment.user_id == current_user.id,
        )
    )
    if not row:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail='Inscrição não encontrada',
        )
    if row.status == STATUS_CANCELADO:
        raise HTTPException(
            status_code=HTTPStatus.BAD_REQUEST,
            detail='Esta inscrição já está cancelada',
        )

    activity = await session.scalar(
        select(Activity).where(Activity.id == row.activity_id)
    )
    if not activity:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail='Atividade não encontrada',
        )

    row.status = STATUS_CANCELADO
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return _inscricao_out(row, activity)


@router.post(
    '/',
    status_code=HTTPStatus.CREATED,
    response_model=AtividadeOut,
)
async def criar_atividade(
    body: AtividadeCreate,
    _staff: StaffUser,
    session: Session,
):
    act = Activity(
        title=body.titulo,
        time_label=body.hora,
        date_label=body.data,
        image_url=body.imagem_url,
        capacidade=body.vagas,
    )
    session.add(act)
    await session.commit()
    await session.refresh(act)
    return _atividade_out(act, inscritos=0)


@router.patch('/{activity_id}', response_model=AtividadeOut)
async def atualizar_atividade(
    activity_id: int,
    body: AtividadeUpdate,
    _staff: StaffUser,
    session: Session,
):
    act = await session.scalar(
        select(Activity).where(Activity.id == activity_id)
    )
    if not act:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail='Atividade não encontrada',
        )
    if body.titulo is not None:
        act.title = body.titulo
    if body.hora is not None:
        act.time_label = body.hora
    if body.data is not None:
        act.date_label = body.data
    if body.imagem_url is not None:
        act.image_url = body.imagem_url
    if body.vagas is not None:
        act.capacidade = body.vagas
    session.add(act)
    await session.commit()
    await session.refresh(act)
    inscritos = await _contar_confirmados(session, act.id)
    return _atividade_out(act, inscritos=inscritos)


@router.delete('/{activity_id}', status_code=HTTPStatus.NO_CONTENT)
async def remover_atividade(
    activity_id: int,
    _staff: StaffUser,
    session: Session,
):
    act = await session.scalar(
        select(Activity).where(Activity.id == activity_id)
    )
    if not act:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail='Atividade não encontrada',
        )
    for r in (
        await session.scalars(
            select(ActivityAttendance).where(
                ActivityAttendance.activity_id == activity_id
            )
        )
    ).all():
        await session.delete(r)
    for r in (
        await session.scalars(
            select(ActivityEnrollment).where(
                ActivityEnrollment.activity_id == activity_id
            )
        )
    ).all():
        await session.delete(r)
    await session.delete(act)
    await session.commit()


@router.get(
    '/{activity_id}/inscricoes',
    response_model=InscricoesAtividadeOut,
)
async def listar_inscricoes_atividade(
    activity_id: int,
    _staff: StaffUser,
    session: Session,
):
    act = await session.scalar(
        select(Activity).where(Activity.id == activity_id)
    )
    if not act:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail='Atividade não encontrada',
        )
    stmt = (
        select(ActivityEnrollment, User)
        .join(User, ActivityEnrollment.user_id == User.id)
        .where(ActivityEnrollment.activity_id == activity_id)
        .order_by(ActivityEnrollment.id)
    )
    result = await session.execute(stmt)
    inscricoes = [
        InscritoOut(
            inscricao_id=enr.id,
            status=enr.status,
            user_id=u.id,
            username=u.username,
            first_name=u.first_name,
            last_name=u.last_name,
        )
        for enr, u in result.all()
    ]
    return InscricoesAtividadeOut(inscricoes=inscricoes)


@router.get(
    '/{activity_id}/presenca',
    response_model=PresencaListaOut,
)
async def listar_presenca(
    activity_id: int,
    data: date,
    _staff: StaffUser,
    session: Session,
):
    act = await session.scalar(
        select(Activity).where(Activity.id == activity_id)
    )
    if not act:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail='Atividade não encontrada',
        )
    return await _montar_presenca_lista(session, activity_id, data)


@router.put(
    '/{activity_id}/presenca',
    response_model=PresencaListaOut,
)
async def registrar_presenca(
    activity_id: int,
    body: PresencaUpsert,
    _staff: StaffUser,
    session: Session,
):
    act = await session.scalar(
        select(Activity).where(Activity.id == activity_id)
    )
    if not act:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail='Atividade não encontrada',
        )
    enr = await session.scalar(
        select(ActivityEnrollment).where(
            ActivityEnrollment.activity_id == activity_id,
            ActivityEnrollment.user_id == body.user_id,
            ActivityEnrollment.status == STATUS_CONFIRMADO,
        )
    )
    if not enr:
        raise HTTPException(
            status_code=HTTPStatus.BAD_REQUEST,
            detail='Usuário não possui inscrição confirmada nesta atividade',
        )

    row = await session.scalar(
        select(ActivityAttendance).where(
            and_(
                ActivityAttendance.activity_id == activity_id,
                ActivityAttendance.user_id == body.user_id,
                ActivityAttendance.attendance_date == body.data,
            )
        )
    )
    if row:
        row.present = body.present
        session.add(row)
    else:
        row = ActivityAttendance(
            activity_id=activity_id,
            user_id=body.user_id,
            attendance_date=body.data,
            present=body.present,
        )
        session.add(row)
    await session.commit()

    return await _montar_presenca_lista(session, activity_id, body.data)
