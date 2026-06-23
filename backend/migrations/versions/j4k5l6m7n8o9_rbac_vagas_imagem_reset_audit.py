"""RBAC role, capacidade de atividades, imagem de noticias,
tokens de reset de senha e trilha de auditoria

Revision ID: j4k5l6m7n8o9
Revises: i3k4l5m6n7o8
Create Date: 2026-06-23

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'j4k5l6m7n8o9'
down_revision: Union[str, Sequence[str], None] = 'i3k4l5m6n7o8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # RBAC: papel do usuário (idoso | funcionario | admin)
    op.add_column(
        'users',
        sa.Column(
            'role',
            sa.String(length=20),
            nullable=False,
            server_default='idoso',
        ),
    )
    # Funcionários existentes (is_staff) viram role='funcionario'.
    # `WHERE is_staff` (sem '= true') é portável entre Postgres e SQLite.
    op.execute('UPDATE users SET role = \'funcionario\' WHERE is_staff')

    # Capacidade (vagas) das atividades — NULL = sem limite
    op.add_column(
        'activities',
        sa.Column('capacidade', sa.Integer(), nullable=True),
    )

    # created_at nas inscrições (para o histórico semanal do dashboard)
    op.add_column(
        'activity_enrollments',
        sa.Column(
            'created_at',
            sa.DateTime(),
            server_default=sa.text('(CURRENT_TIMESTAMP)'),
            nullable=False,
        ),
    )

    # Imagem das notícias (upload)
    op.add_column(
        'news',
        sa.Column('imagem_url', sa.String(length=500), nullable=True),
    )

    # Tokens de recuperação de senha (hash, uso único)
    op.create_table(
        'password_reset_tokens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('token_hash', sa.String(length=128), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('used', sa.Boolean(), nullable=False),
        sa.Column(
            'created_at',
            sa.DateTime(),
            server_default=sa.text('(CURRENT_TIMESTAMP)'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ['user_id'],
            ['users.id'],
            name=op.f('fk_password_reset_tokens_user_id_users'),
        ),
        sa.PrimaryKeyConstraint(
            'id', name=op.f('pk_password_reset_tokens')
        ),
        sa.UniqueConstraint(
            'token_hash',
            name=op.f('uq_password_reset_tokens_token_hash'),
        ),
    )

    # Trilha de auditoria de acessos/ações (por role)
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(length=80), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('user_email', sa.String(length=255), nullable=True),
        sa.Column('user_role', sa.String(length=20), nullable=True),
        sa.Column('detail', sa.String(length=500), nullable=True),
        sa.Column('ip_address', sa.String(length=64), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(),
            server_default=sa.text('(CURRENT_TIMESTAMP)'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ['user_id'],
            ['users.id'],
            name=op.f('fk_audit_logs_user_id_users'),
        ),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_audit_logs')),
    )


def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('password_reset_tokens')
    op.drop_column('news', 'imagem_url')
    op.drop_column('activity_enrollments', 'created_at')
    op.drop_column('activities', 'capacidade')
    op.drop_column('users', 'role')
