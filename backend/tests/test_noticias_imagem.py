import io
from http import HTTPStatus

from sistema_provas import storage


def _criar_noticia(client, staff_token, titulo='N'):
    r = client.post(
        '/noticias',
        headers={'Authorization': f'Bearer {staff_token}'},
        json={'titulo': titulo, 'descricao': 'D', 'fonte': 'https://x'},
    )
    return r.json()['id']


def test_upload_imagem_noticia(client, staff_token, monkeypatch, tmp_path):
    monkeypatch.setattr(storage, 'UPLOAD_ROOT', tmp_path)
    nid = _criar_noticia(client, staff_token)

    files = {
        'arquivo': (
            'foto.png',
            io.BytesIO(b'\x89PNG\r\n\x1a\nfake'),
            'image/png',
        )
    }
    r = client.post(
        f'/noticias/{nid}/imagem',
        headers={'Authorization': f'Bearer {staff_token}'},
        files=files,
    )
    assert r.status_code == HTTPStatus.OK
    assert r.json()['imagem_url'].startswith('/uploads/news/')

    # Aparece na listagem
    lista = client.get('/noticias').json()
    alvo = next(n for n in lista if n['id'] == nid)
    assert alvo['imagem_url'].startswith('/uploads/news/')


def test_upload_tipo_invalido(client, staff_token, monkeypatch, tmp_path):
    monkeypatch.setattr(storage, 'UPLOAD_ROOT', tmp_path)
    nid = _criar_noticia(client, staff_token, titulo='N2')
    files = {'arquivo': ('a.txt', io.BytesIO(b'oi'), 'text/plain')}
    r = client.post(
        f'/noticias/{nid}/imagem',
        headers={'Authorization': f'Bearer {staff_token}'},
        files=files,
    )
    assert r.status_code == HTTPStatus.UNSUPPORTED_MEDIA_TYPE


def test_upload_forbidden_para_idoso(client, token):
    files = {'arquivo': ('a.png', io.BytesIO(b'x'), 'image/png')}
    r = client.post(
        '/noticias/1/imagem',
        headers={'Authorization': f'Bearer {token}'},
        files=files,
    )
    assert r.status_code == HTTPStatus.FORBIDDEN
