from http import HTTPStatus


def _token_for(client, email, password):
    r = client.post(
        '/auth/token', data={'username': email, 'password': password}
    )
    return r.json()['access_token']


def _criar_atividade(client, staff_token, vagas=None):
    payload = {
        'titulo': 'Aula',
        'hora': '10h',
        'data': 'Segunda',
        'imagem_url': 'https://example.com/a.jpg',
    }
    if vagas is not None:
        payload['vagas'] = vagas
    return client.post(
        '/atividades/',
        headers={'Authorization': f'Bearer {staff_token}'},
        json=payload,
    )


def test_capacidade_bloqueia_quando_lotada(
    client, staff_token, user, token, other_user
):
    r = _criar_atividade(client, staff_token, vagas=1)
    assert r.status_code == HTTPStatus.CREATED
    assert r.json()['vagas'] == 1
    aid = r.json()['id']

    r1 = client.post(
        '/atividades/inscricoes',
        headers={'Authorization': f'Bearer {token}'},
        json={'activity_id': aid},
    )
    assert r1.status_code == HTTPStatus.CREATED

    outro = _token_for(client, other_user.email, other_user.clean_password)
    r2 = client.post(
        '/atividades/inscricoes',
        headers={'Authorization': f'Bearer {outro}'},
        json={'activity_id': aid},
    )
    assert r2.status_code == HTTPStatus.CONFLICT

    catalogo = client.get('/atividades/catalogo').json()['atividades']
    item = next(a for a in catalogo if a['id'] == aid)
    assert item['vagas'] == 1
    assert item['inscritos'] == 1
    assert item['vagas_disponiveis'] == 0


def test_sem_capacidade_nao_limita(
    client, staff_token, user, token, other_user
):
    r = _criar_atividade(client, staff_token, vagas=None)
    assert r.json()['vagas'] is None
    aid = r.json()['id']

    client.post(
        '/atividades/inscricoes',
        headers={'Authorization': f'Bearer {token}'},
        json={'activity_id': aid},
    )
    outro = _token_for(client, other_user.email, other_user.clean_password)
    r2 = client.post(
        '/atividades/inscricoes',
        headers={'Authorization': f'Bearer {outro}'},
        json={'activity_id': aid},
    )
    assert r2.status_code == HTTPStatus.CREATED
