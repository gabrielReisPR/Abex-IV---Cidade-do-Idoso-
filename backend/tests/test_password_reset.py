from http import HTTPStatus

from sistema_provas.routers import password as password_router


def test_fluxo_completo_reset(client, user, monkeypatch):
    captured = {}

    async def fake_send(email, link):
        captured['email'] = email
        captured['link'] = link
        return True

    monkeypatch.setattr(
        password_router, 'send_password_reset_email', fake_send
    )

    r = client.post('/password/reset-request', json={'email': user.email})
    assert r.status_code == HTTPStatus.OK
    assert r.json() == {}
    assert 'token=' in captured['link']
    assert captured['email'] == user.email

    token = captured['link'].split('token=')[1]
    r2 = client.post(
        '/password/reset',
        json={'token': token, 'nova_senha': 'novasenha123'},
    )
    assert r2.status_code == HTTPStatus.OK

    # A nova senha funciona no login
    r3 = client.post(
        '/auth/token',
        data={'username': user.email, 'password': 'novasenha123'},
    )
    assert r3.status_code == HTTPStatus.OK


def test_reset_token_invalido(client):
    r = client.post(
        '/password/reset',
        json={'token': 'inexistente', 'nova_senha': 'qualquer1'},
    )
    assert r.status_code == HTTPStatus.BAD_REQUEST
    assert r.json() == {'message': 'Token inválido ou expirado.'}


def test_novo_pedido_invalida_token_anterior(client, user, monkeypatch):
    links = []

    async def fake_send(email, link):
        links.append(link)
        return True

    monkeypatch.setattr(
        password_router, 'send_password_reset_email', fake_send
    )

    client.post('/password/reset-request', json={'email': user.email})
    client.post('/password/reset-request', json={'email': user.email})
    token_antigo = links[0].split('token=')[1]
    token_novo = links[1].split('token=')[1]

    # O token do primeiro pedido foi invalidado pelo segundo.
    r_old = client.post(
        '/password/reset',
        json={'token': token_antigo, 'nova_senha': 'abcd1234'},
    )
    assert r_old.status_code == HTTPStatus.BAD_REQUEST

    # O token mais recente funciona.
    r_new = client.post(
        '/password/reset',
        json={'token': token_novo, 'nova_senha': 'abcd1234'},
    )
    assert r_new.status_code == HTTPStatus.OK


def test_reset_token_nao_reutilizavel(client, user, monkeypatch):
    captured = {}

    async def fake_send(email, link):
        captured['link'] = link
        return True

    monkeypatch.setattr(
        password_router, 'send_password_reset_email', fake_send
    )
    client.post('/password/reset-request', json={'email': user.email})
    token = captured['link'].split('token=')[1]

    r1 = client.post(
        '/password/reset',
        json={'token': token, 'nova_senha': 'primeira123'},
    )
    assert r1.status_code == HTTPStatus.OK

    # Segundo uso do mesmo token deve falhar (uso único)
    r2 = client.post(
        '/password/reset',
        json={'token': token, 'nova_senha': 'segunda123'},
    )
    assert r2.status_code == HTTPStatus.BAD_REQUEST
