from http import HTTPStatus


def test_login_retorna_refresh_token(client, user):
    r = client.post(
        '/auth/token',
        data={'username': user.email, 'password': user.clean_password},
    )
    assert r.status_code == HTTPStatus.OK
    body = r.json()
    assert body['token_type'] == 'Bearer'
    assert body.get('refresh_token')


def test_refresh_renova_access_token(client, user):
    login = client.post(
        '/auth/token',
        data={'username': user.email, 'password': user.clean_password},
    ).json()

    r = client.post(
        '/auth/refresh', json={'refresh_token': login['refresh_token']}
    )
    assert r.status_code == HTTPStatus.OK
    data = r.json()
    assert data.get('access_token')
    assert data.get('refresh_token')  # rotação

    me = client.get(
        '/users/me',
        headers={'Authorization': f'Bearer {data["access_token"]}'},
    )
    assert me.status_code == HTTPStatus.OK


def test_refresh_rejeita_access_token(client, user, token):
    # Um access token comum (sem type='refresh') não vale em /auth/refresh
    r = client.post('/auth/refresh', json={'refresh_token': token})
    assert r.status_code == HTTPStatus.UNAUTHORIZED


def test_refresh_rejeita_token_invalido(client):
    r = client.post('/auth/refresh', json={'refresh_token': 'lixo'})
    assert r.status_code == HTTPStatus.UNAUTHORIZED


def test_refresh_token_nao_vale_como_access(client, user):
    # Token confusion: o refresh token NÃO pode autenticar endpoints.
    login = client.post(
        '/auth/token',
        data={'username': user.email, 'password': user.clean_password},
    ).json()
    rt = login['refresh_token']
    r = client.get(
        '/users/me', headers={'Authorization': f'Bearer {rt}'}
    )
    assert r.status_code == HTTPStatus.UNAUTHORIZED
