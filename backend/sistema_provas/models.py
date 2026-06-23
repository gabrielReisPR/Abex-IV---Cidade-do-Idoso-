from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    ForeignKey,
    Integer,
    MetaData,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, registry

# Papéis de acesso (RBAC). 'idoso' é o usuário final; 'funcionario' e
# 'admin' têm acesso ao portal administrativo. O campo legado is_staff é
# mantido em sincronia (staff = role != 'idoso') para compatibilidade.
ROLE_IDOSO = 'idoso'
ROLE_FUNCIONARIO = 'funcionario'
ROLE_ADMIN = 'admin'
STAFF_ROLES = (ROLE_FUNCIONARIO, ROLE_ADMIN)

naming_convention = {
    'ix': 'ix_%(column_0_label)s',
    'uq': 'uq_%(table_name)s_%(column_0_name)s',
    'ck': 'ck_%(table_name)s_%(constraint_name)s',
    'fk': 'fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s',
    'pk': 'pk_%(table_name)s',
}

metadata = MetaData(naming_convention=naming_convention)
table_registry = registry(metadata=metadata)


@table_registry.mapped_as_dataclass
class User:
    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(init=False, primary_key=True)
    username: Mapped[str] = mapped_column(unique=True)
    password: Mapped[str]
    email: Mapped[str] = mapped_column(unique=True)

    # Novos campos adicionados
    first_name: Mapped[Optional[str]] = mapped_column(String(50), default=None)
    last_name: Mapped[Optional[str]] = mapped_column(String(50), default=None)
    phone: Mapped[Optional[str]] = mapped_column(String(20), default=None)
    birth_date: Mapped[Optional[date]] = mapped_column(default=None)
    gender: Mapped[Optional[str]] = mapped_column(String(20), default=None)
    address: Mapped[Optional[str]] = mapped_column(String(200), default=None)
    city: Mapped[Optional[str]] = mapped_column(String(100), default=None)
    state: Mapped[Optional[str]] = mapped_column(String(50), default=None)
    zip_code: Mapped[Optional[str]] = mapped_column(String(20), default=None)
    is_staff: Mapped[bool] = mapped_column(Boolean, default=False)
    # RBAC: idoso | funcionario | admin (fonte de verdade do papel).
    role: Mapped[str] = mapped_column(
        String(20), default=ROLE_IDOSO, server_default=ROLE_IDOSO
    )

    created_at: Mapped[datetime] = mapped_column(
        init=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(), init=False
    )


@table_registry.mapped_as_dataclass
class Activity:
    __tablename__ = 'activities'

    id: Mapped[int] = mapped_column(init=False, primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    time_label: Mapped[str] = mapped_column(String(50))
    date_label: Mapped[str] = mapped_column(String(120))
    image_url: Mapped[str] = mapped_column(String(500))
    # Capacidade máxima de inscritos confirmados. None = sem limite.
    capacidade: Mapped[Optional[int]] = mapped_column(Integer, default=None)


@table_registry.mapped_as_dataclass
class ActivityEnrollment:
    __tablename__ = 'activity_enrollments'

    __table_args__ = (
        UniqueConstraint(
            'user_id',
            'activity_id',
            name='uq_activity_enrollments_user_activity',
        ),
    )

    id: Mapped[int] = mapped_column(init=False, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    activity_id: Mapped[int] = mapped_column(ForeignKey('activities.id'))
    status: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(
        init=False, server_default=func.now()
    )


@table_registry.mapped_as_dataclass
class MenuItem:
    """Itens do cardápio semanal (Portal Cidade do Idoso)."""

    __tablename__ = 'menu_items'

    id: Mapped[int] = mapped_column(init=False, primary_key=True)
    dia_label: Mapped[str] = mapped_column(String(60))
    ordem_dia: Mapped[int] = mapped_column()
    ordem_refeicao: Mapped[int] = mapped_column()
    refeicao: Mapped[str] = mapped_column(String(40))
    titulo: Mapped[str] = mapped_column(String(200))
    descricao: Mapped[str] = mapped_column(String(600))
    imagem_url: Mapped[str] = mapped_column(String(500))


@table_registry.mapped_as_dataclass
class News:
    __tablename__ = 'news'

    id: Mapped[int] = mapped_column(init=False, primary_key=True)
    titulo: Mapped[str] = mapped_column(String(300))
    descricao: Mapped[str] = mapped_column(String(2000))
    fonte: Mapped[str] = mapped_column(String(800))
    # Caminho relativo da imagem enviada (ex.: /uploads/news/abc.jpg).
    imagem_url: Mapped[Optional[str]] = mapped_column(
        String(500), default=None
    )
    created_at: Mapped[datetime] = mapped_column(
        init=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(), init=False
    )


@table_registry.mapped_as_dataclass
class ActivityAttendance:
    __tablename__ = 'activity_attendances'

    __table_args__ = (
        UniqueConstraint(
            'activity_id',
            'user_id',
            'attendance_date',
            name='uq_activity_attendances_activity_user_date',
        ),
    )

    id: Mapped[int] = mapped_column(init=False, primary_key=True)
    activity_id: Mapped[int] = mapped_column(ForeignKey('activities.id'))
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    attendance_date: Mapped[date] = mapped_column()
    present: Mapped[bool] = mapped_column(Boolean, default=False)


@table_registry.mapped_as_dataclass
class PasswordResetToken:
    """Token de recuperação de senha (hash persistido, uso único)."""

    __tablename__ = 'password_reset_tokens'

    id: Mapped[int] = mapped_column(init=False, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    token_hash: Mapped[str] = mapped_column(String(128), unique=True)
    expires_at: Mapped[datetime] = mapped_column()
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        init=False, server_default=func.now()
    )


@table_registry.mapped_as_dataclass
class AuditLog:
    """Trilha de auditoria de acessos e ações sensíveis (por role)."""

    __tablename__ = 'audit_logs'

    id: Mapped[int] = mapped_column(init=False, primary_key=True)
    action: Mapped[str] = mapped_column(String(80))
    user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey('users.id'), default=None
    )
    user_email: Mapped[Optional[str]] = mapped_column(
        String(255), default=None
    )
    user_role: Mapped[Optional[str]] = mapped_column(String(20), default=None)
    detail: Mapped[Optional[str]] = mapped_column(String(500), default=None)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), default=None)
    created_at: Mapped[datetime] = mapped_column(
        init=False, server_default=func.now()
    )
