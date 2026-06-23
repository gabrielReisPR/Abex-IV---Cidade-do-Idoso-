"""Dashboard administrativo (Sprints 4 e 5).

Indicadores do sistema, histórico de inscrições por semana (gráfico de
linha), uso comparativo das funcionalidades (gráfico de barras), alertas
automáticos de capacidade (>90%) e exportação CSV de inscrições/presença.
Todas as rotas são restritas a funcionários/admin (auditoria por role).
"""

import csv
import io
from collections import defaultdict
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from sistema_provas.database import get_session
from sistema_provas.models import (
    STAFF_ROLES,
    Activity,
    ActivityAttendance,
    ActivityEnrollment,
    MenuItem,
    News,
    User,
)
from sistema_provas.schemas import (
    AlertaAtividadeOut,
    AlertasOut,
    DashboardIndicadoresOut,
    InscricoesPorSemanaOut,
    PontoSemanaOut,
    UsoFuncionalidadeOut,
    UsoFuncionalidadesOut,
)
from sistema_provas.security import get_current_staff_user

router = APIRouter(prefix='/dashboard', tags=['dashboard'])
Session = Annotated[AsyncSession, Depends(get_session)]
StaffUser = Annotated[User, Depends(get_current_staff_user)]

STATUS_CONFIRMADO = 'confirmado'
ALERT_THRESHOLD = 0.9


async def _count(session: AsyncSession, stmt) -> int:
    return (await session.scalar(stmt)) or 0


@router.get('/resumo', response_model=DashboardIndicadoresOut)
async def resumo(_staff: StaffUser, session: Session):
    total_funcionarios = await _count(
        session,
        select(func.count())
        .select_from(User)
        .where((User.is_staff.is_(True)) | (User.role.in_(STAFF_ROLES))),
    )
    total_usuarios = await _count(
        session, select(func.count()).select_from(User)
    )
    return DashboardIndicadoresOut(
        total_idosos=total_usuarios - total_funcionarios,
        total_funcionarios=total_funcionarios,
        total_atividades=await _count(
            session, select(func.count()).select_from(Activity)
        ),
        total_inscricoes_confirmadas=await _count(
            session,
            select(func.count())
            .select_from(ActivityEnrollment)
            .where(ActivityEnrollment.status == STATUS_CONFIRMADO),
        ),
        total_noticias=await _count(
            session, select(func.count()).select_from(News)
        ),
        total_itens_cardapio=await _count(
            session, select(func.count()).select_from(MenuItem)
        ),
        total_presencas=await _count(
            session,
            select(func.count())
            .select_from(ActivityAttendance)
            .where(ActivityAttendance.present.is_(True)),
        ),
    )


@router.get('/inscricoes-por-semana', response_model=InscricoesPorSemanaOut)
async def inscricoes_por_semana(_staff: StaffUser, session: Session):
    """Histórico de inscrições agrupado por semana ISO (gráfico de linha)."""
    rows = (
        await session.scalars(
            select(ActivityEnrollment.created_at).where(
                ActivityEnrollment.status == STATUS_CONFIRMADO
            )
        )
    ).all()

    buckets: dict[str, int] = defaultdict(int)
    for created in rows:
        if created is None:
            continue
        iso = created.isocalendar()
        buckets[f'{iso[0]}-W{iso[1]:02d}'] += 1

    pontos = [
        PontoSemanaOut(semana=semana, total=total)
        for semana, total in sorted(buckets.items())
    ]
    return InscricoesPorSemanaOut(pontos=pontos)


@router.get('/uso-funcionalidades', response_model=UsoFuncionalidadesOut)
async def uso_funcionalidades(_staff: StaffUser, session: Session):
    """Uso comparativo das principais funcionalidades (gráfico de barras)."""
    itens = [
        UsoFuncionalidadeOut(
            funcionalidade='Cardápio',
            total=await _count(
                session, select(func.count()).select_from(MenuItem)
            ),
        ),
        UsoFuncionalidadeOut(
            funcionalidade='Notícias',
            total=await _count(
                session, select(func.count()).select_from(News)
            ),
        ),
        UsoFuncionalidadeOut(
            funcionalidade='Atividades',
            total=await _count(
                session, select(func.count()).select_from(Activity)
            ),
        ),
        UsoFuncionalidadeOut(
            funcionalidade='Inscrições',
            total=await _count(
                session,
                select(func.count())
                .select_from(ActivityEnrollment)
                .where(ActivityEnrollment.status == STATUS_CONFIRMADO),
            ),
        ),
    ]
    return UsoFuncionalidadesOut(itens=itens)


@router.get('/alertas', response_model=AlertasOut)
async def alertas(_staff: StaffUser, session: Session):
    """Alertas automáticos: atividades com ocupação >= 90% da capacidade."""
    activities = (
        await session.scalars(
            select(Activity).where(Activity.capacidade.is_not(None))
        )
    ).all()

    counts_rows = (
        await session.execute(
            select(ActivityEnrollment.activity_id, func.count())
            .where(ActivityEnrollment.status == STATUS_CONFIRMADO)
            .group_by(ActivityEnrollment.activity_id)
        )
    ).all()
    counts = {aid: total for aid, total in counts_rows}

    out = []
    for act in activities:
        capacidade = act.capacidade or 0
        if capacidade <= 0:
            continue
        inscritos = counts.get(act.id, 0)
        ratio = inscritos / capacidade
        if ratio >= ALERT_THRESHOLD:
            out.append(
                AlertaAtividadeOut(
                    activity_id=act.id,
                    titulo=act.title,
                    capacidade=capacidade,
                    inscritos=inscritos,
                    percentual=round(ratio * 100, 1),
                )
            )
    return AlertasOut(alertas=out)


_CSV_INJECTION_PREFIXES = ('=', '+', '-', '@', '\t', '\r')


def _csv_safe(value):
    """Evita CSV formula injection: prefixa com aspa simples valores que
    começam com caracteres interpretados como fórmula pelo Excel."""
    s = '' if value is None else str(value)
    if s and s[0] in _CSV_INJECTION_PREFIXES:
        return "'" + s
    return s


@router.get('/export/inscricoes.csv')
async def exportar_inscricoes_csv(_staff: StaffUser, session: Session):
    """Exporta inscrições + presença em CSV (demanda da gestora)."""
    rows = (
        await session.execute(
            select(ActivityEnrollment, Activity, User)
            .join(Activity, ActivityEnrollment.activity_id == Activity.id)
            .join(User, ActivityEnrollment.user_id == User.id)
            .order_by(Activity.title, User.username)
        )
    ).all()

    presenca_rows = (
        await session.execute(
            select(
                ActivityAttendance.activity_id,
                ActivityAttendance.user_id,
                func.count(),
            )
            .where(ActivityAttendance.present.is_(True))
            .group_by(
                ActivityAttendance.activity_id,
                ActivityAttendance.user_id,
            )
        )
    ).all()
    presencas = {(aid, uid): total for aid, uid, total in presenca_rows}

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([
        'atividade_id',
        'atividade',
        'usuario_id',
        'idoso',
        'nome',
        'status',
        'presencas',
    ])
    for enr, act, user in rows:
        nome = ' '.join(
            filter(None, [user.first_name, user.last_name])
        ).strip()
        writer.writerow([
            act.id,
            _csv_safe(act.title),
            user.id,
            _csv_safe(user.username),
            _csv_safe(nome),
            _csv_safe(enr.status),
            presencas.get((act.id, user.id), 0),
        ])

    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type='text/csv',
        headers={
            'Content-Disposition': (
                'attachment; filename="inscricoes_presenca.csv"'
            )
        },
    )
