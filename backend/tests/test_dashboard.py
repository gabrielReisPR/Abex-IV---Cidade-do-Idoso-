from http import HTTPStatus

from sistema_provas.routers.dashboard import _csv_safe


def test_csv_safe_previne_formula_injection():
    assert _csv_safe('=cmd|calc') == "'=cmd|calc"
    assert _csv_safe('+1+1') == "'+1+1"
    assert _csv_safe('-2') == "'-2"
    assert _csv_safe('@SUM') == "'@SUM"
    assert _csv_safe('Maria') == 'Maria'
    assert _csv_safe(None) == ''
    assert _csv_safe(7) == '7'


def _inscrever(client, token, activity_id):
    return client.post(
        '/atividades/inscricoes',
        headers={'Authorization': f'Bearer {token}'},
        json={'activity_id': activity_id},
    )


def test_dashboard_forbidden_para_idoso(client, token):
    r = client.get(
        '/dashboard/resumo', headers={'Authorization': f'Bearer {token}'}
    )
    assert r.status_code == HTTPStatus.FORBIDDEN


def test_dashboard_resumo(client, staff_token, sample_activities, sample_menu):
    r = client.get(
        '/dashboard/resumo',
        headers={'Authorization': f'Bearer {staff_token}'},
    )
    assert r.status_code == HTTPStatus.OK
    data = r.json()
    assert data['total_atividades'] == 2
    assert data['total_itens_cardapio'] == 2
    assert data['total_funcionarios'] >= 1
    assert 'total_idosos' in data


def test_dashboard_uso_e_semana(
    client, staff_token, user, token, sample_activities
):
    aid = sample_activities[0].id
    assert _inscrever(client, token, aid).status_code == HTTPStatus.CREATED

    r = client.get(
        '/dashboard/uso-funcionalidades',
        headers={'Authorization': f'Bearer {staff_token}'},
    )
    assert r.status_code == HTTPStatus.OK
    itens = {i['funcionalidade']: i['total'] for i in r.json()['itens']}
    assert itens['Atividades'] == 2
    assert itens['Inscrições'] == 1

    r2 = client.get(
        '/dashboard/inscricoes-por-semana',
        headers={'Authorization': f'Bearer {staff_token}'},
    )
    assert r2.status_code == HTTPStatus.OK
    assert sum(p['total'] for p in r2.json()['pontos']) == 1


def test_dashboard_alertas_capacidade(client, staff_token, user, token):
    r = client.post(
        '/atividades/',
        headers={'Authorization': f'Bearer {staff_token}'},
        json={
            'titulo': 'Cheia',
            'hora': '10h',
            'data': 'Seg',
            'imagem_url': 'https://x/y.jpg',
            'vagas': 1,
        },
    )
    aid = r.json()['id']
    _inscrever(client, token, aid)

    r2 = client.get(
        '/dashboard/alertas',
        headers={'Authorization': f'Bearer {staff_token}'},
    )
    assert r2.status_code == HTTPStatus.OK
    alertas = r2.json()['alertas']
    assert any(
        a['activity_id'] == aid and a['percentual'] >= 90 for a in alertas
    )


def test_dashboard_export_csv(
    client, staff_token, user, token, sample_activities
):
    aid = sample_activities[0].id
    _inscrever(client, token, aid)
    r = client.get(
        '/dashboard/export/inscricoes.csv',
        headers={'Authorization': f'Bearer {staff_token}'},
    )
    assert r.status_code == HTTPStatus.OK
    assert 'text/csv' in r.headers['content-type']
    linhas = r.text.splitlines()
    assert 'atividade' in linhas[0]
    assert len(linhas) >= 2
