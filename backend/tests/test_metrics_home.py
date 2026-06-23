from http import HTTPStatus


def test_metrics_cache(client):
    r = client.get('/metrics/cache')
    assert r.status_code == HTTPStatus.OK
    data = r.json()
    # Sem REDIS_URL configurado nos testes, o cache fica desabilitado.
    assert data['enabled'] is False
    for key in ('hits', 'misses', 'hit_rate', 'avg_get_ms', 'sets'):
        assert key in data


def test_home_resumo(client, sample_activities, sample_menu):
    r = client.get('/home/resumo')
    assert r.status_code == HTTPStatus.OK
    data = r.json()
    assert 'atividades' in data
    assert 'noticias' in data
    assert 'cardapio' in data
    assert len(data['atividades']) == 2
