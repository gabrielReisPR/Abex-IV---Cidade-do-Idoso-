document.addEventListener('DOMContentLoaded', async () => {
    const ctx = await requireStaff();
    if (!ctx) return;

    const fmtErr = window.staffFormatApiError;
    const withBusy = window.staffWithButtonBusy;

    let selectedId = null;
    const listaEl = document.getElementById('lista-atividades');
    const panelDet = document.getElementById('panel-detalhe');
    const tbodyIns = document.querySelector('#tabela-inscritos tbody');
    const tbodyPres = document.querySelector('#tabela-presenca tbody');
    const presData = document.getElementById('pres-data');

    function todayISO() {
        const d = new Date();
        const p = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    }
    presData.value = todayISO();

    // Converte o valor do campo "vagas" em número inteiro >= 0, ou null quando vazio (sem limite).
    function parseVagas(raw) {
        const s = String(raw ?? '').trim();
        if (s === '') return null;
        const n = Number(s);
        if (!Number.isFinite(n) || n < 0) return null;
        return Math.floor(n);
    }

    function setSelectedCard(id) {
        listaEl.querySelectorAll('.staff-activity-card').forEach((el) => {
            el.classList.toggle('is-selected', Number(el.dataset.activityId) === id);
        });
    }

    async function carregarCatalogo() {
        const r = await fetch(`${API_BASE}/atividades/catalogo`);
        if (!r.ok) {
            staffNotify('Erro ao carregar atividades', 'error');
            return;
        }
        const { atividades } = await r.json();
        while (listaEl.firstChild) listaEl.removeChild(listaEl.firstChild);

        if (!atividades.length) {
            const empty = document.createElement('p');
            empty.className = 'staff-empty';
            empty.textContent = 'Nenhuma atividade cadastrada. Use o formulário acima para criar a primeira.';
            listaEl.appendChild(empty);
            return;
        }

        atividades.forEach((a) => {
            const card = document.createElement('div');
            card.className = 'staff-activity-card';
            card.dataset.activityId = String(a.id);

            const left = document.createElement('div');
            const strong = document.createElement('strong');
            strong.textContent = a.titulo || '—';
            const meta = document.createElement('div');
            meta.className = 'staff-activity-meta';
            meta.textContent = `${a.hora || '—'} · ${a.data || '—'}`;
            left.appendChild(strong);
            left.appendChild(meta);

            const ocup = document.createElement('span');
            ocup.className = 'staff-occupancy';
            const inscritos = Number(a.inscritos) || 0;
            if (a.vagas === null || a.vagas === undefined) {
                ocup.textContent = `Inscritos: ${inscritos} · Vagas: sem limite`;
                ocup.classList.add('staff-occupancy-open');
            } else {
                const vagas = Number(a.vagas);
                const disp = a.vagas_disponiveis === null || a.vagas_disponiveis === undefined
                    ? Math.max(vagas - inscritos, 0)
                    : Number(a.vagas_disponiveis);
                ocup.textContent = `Ocupação: ${inscritos}/${vagas} · ${disp} vaga(s) disponível(is)`;
                ocup.classList.add(disp <= 0 ? 'staff-occupancy-full' : 'staff-occupancy-open');
            }
            left.appendChild(ocup);

            const actions = document.createElement('div');
            actions.className = 'staff-activity-actions';

            const bGerir = document.createElement('button');
            bGerir.type = 'button';
            bGerir.className = 'staff-btn staff-btn-primary staff-btn-sm';
            bGerir.textContent = 'Gerir';
            bGerir.addEventListener('click', () => abrirDetalhe(Number(a.id), atividades));

            const bEdit = document.createElement('button');
            bEdit.type = 'button';
            bEdit.className = 'staff-btn staff-btn-secondary staff-btn-sm';
            bEdit.textContent = 'Editar';
            bEdit.addEventListener('click', () => editarAtividade(Number(a.id), atividades));

            const bDel = document.createElement('button');
            bDel.type = 'button';
            bDel.className = 'staff-btn staff-btn-danger staff-btn-sm';
            bDel.textContent = 'Excluir';
            bDel.addEventListener('click', () => excluirAtividade(Number(a.id)));

            actions.appendChild(bGerir);
            actions.appendChild(bEdit);
            actions.appendChild(bDel);

            card.appendChild(left);
            card.appendChild(actions);
            listaEl.appendChild(card);
        });
    }

    async function excluirAtividade(id) {
        if (!confirm('Excluir atividade e todas as inscrições/presenças?')) return;
        const d = await fetch(`${API_BASE}/atividades/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${ctx.token}` },
        });
        if (d.ok) {
            staffNotify('Atividade removida', 'success');
            if (selectedId === id) {
                selectedId = null;
                panelDet.hidden = true;
            }
            carregarCatalogo();
        } else {
            const err = await d.json().catch(() => ({}));
            staffNotify(fmtErr(err), 'error');
        }
    }

    async function editarAtividade(id, atividades) {
        const a = atividades.find((x) => x.id === id);
        if (!a) return;
        const out = await staffFormModal({
            title: 'Editar atividade',
            submitLabel: 'Salvar',
            fields: [
                { id: 'titulo', label: 'Título', value: a.titulo, required: true },
                { id: 'hora', label: 'Horário', value: a.hora, required: true },
                { id: 'data', label: 'Data / recorrência', value: a.data, required: true },
                { id: 'imagem_url', label: 'URL da imagem', type: 'url', value: a.imagem_url, required: true },
                {
                    id: 'vagas',
                    label: 'Vagas (capacidade — vazio = sem limite)',
                    type: 'number',
                    value: a.vagas ?? '',
                    placeholder: 'Sem limite',
                    required: false,
                },
            ],
        });
        if (!out) return;
        const vagas = parseVagas(out.vagas);
        const p = await fetch(`${API_BASE}/atividades/${id}`, {
            method: 'PATCH',
            headers: staffAuthHeaders(),
            body: JSON.stringify({
                titulo: out.titulo,
                hora: out.hora,
                data: out.data,
                imagem_url: out.imagem_url,
                vagas,
            }),
        });
        if (p.ok) {
            staffNotify('Atividade atualizada', 'success');
            await carregarCatalogo();
            if (selectedId === id) {
                const r2 = await fetch(`${API_BASE}/atividades/catalogo`);
                if (r2.ok) {
                    const { atividades: list } = await r2.json();
                    await abrirDetalhe(id, list);
                }
            }
        } else {
            const err = await p.json().catch(() => ({}));
            staffNotify(fmtErr(err), 'error');
        }
    }

    async function abrirDetalhe(id, atividadesCache) {
        selectedId = id;
        setSelectedCard(id);
        const a = atividadesCache.find((x) => x.id === id);
        document.getElementById('det-titulo').textContent = a
            ? `Gerindo: ${a.titulo}`
            : `Atividade #${id}`;
        panelDet.hidden = false;
        panelDet.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        const ri = await fetch(`${API_BASE}/atividades/${id}/inscricoes`, {
            headers: { Authorization: `Bearer ${ctx.token}` },
        });
        if (!ri.ok) {
            const err = await ri.json().catch(() => ({}));
            staffNotify(fmtErr(err), 'error');
            return;
        }
        const { inscricoes } = await ri.json();
        while (tbodyIns.firstChild) tbodyIns.removeChild(tbodyIns.firstChild);
        if (!inscricoes.length) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 3;
            td.className = 'staff-empty';
            td.style.border = 'none';
            td.textContent = 'Nenhum inscrito confirmado nesta atividade.';
            tr.appendChild(td);
            tbodyIns.appendChild(tr);
        } else {
            inscricoes.forEach((row) => {
                const tr = document.createElement('tr');
                const nome = [row.first_name, row.last_name].filter(Boolean).join(' ') || '—';
                const td1 = document.createElement('td');
                td1.textContent = row.username || '—';
                const td2 = document.createElement('td');
                td2.textContent = nome;
                const td3 = document.createElement('td');
                td3.textContent = row.status || '—';
                tr.appendChild(td1);
                tr.appendChild(td2);
                tr.appendChild(td3);
                tbodyIns.appendChild(tr);
            });
        }

        await carregarPresenca();
    }

    async function carregarPresenca() {
        if (!selectedId) return;
        const d = presData.value;
        if (!d) {
            staffNotify('Escolha uma data', 'error');
            return;
        }
        const r = await fetch(
            `${API_BASE}/atividades/${selectedId}/presenca?data=${encodeURIComponent(d)}`,
            { headers: { Authorization: `Bearer ${ctx.token}` } },
        );
        if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            staffNotify(fmtErr(err), 'error');
            return;
        }
        const body = await r.json();
        while (tbodyPres.firstChild) tbodyPres.removeChild(tbodyPres.firstChild);
        if (!body.linhas || !body.linhas.length) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 2;
            td.className = 'staff-empty';
            td.style.border = 'none';
            td.textContent =
                'Nenhum participante confirmado para esta atividade. A presença só pode ser registrada para inscritos confirmados.';
            tr.appendChild(td);
            tbodyPres.appendChild(tr);
            return;
        }
        body.linhas.forEach((linha) => {
            const tr = document.createElement('tr');
            const nome = [linha.first_name, linha.last_name].filter(Boolean).join(' ') || linha.username;
            const td1 = document.createElement('td');
            td1.textContent = nome;
            const td2 = document.createElement('td');
            const chk = document.createElement('input');
            chk.type = 'checkbox';
            chk.className = 'chk-pres';
            chk.dataset.user = String(linha.user_id);
            chk.checked = linha.present === true;
            chk.addEventListener('change', async () => {
                const prev = !chk.checked;
                const userId = Number(chk.dataset.user);
                const payload = {
                    user_id: userId,
                    data: presData.value,
                    present: chk.checked,
                };
                const put = await fetch(`${API_BASE}/atividades/${selectedId}/presenca`, {
                    method: 'PUT',
                    headers: staffAuthHeaders(),
                    body: JSON.stringify(payload),
                });
                if (!put.ok) {
                    chk.checked = prev;
                    const err = await put.json().catch(() => ({}));
                    staffNotify(fmtErr(err), 'error');
                }
            });
            td2.appendChild(chk);
            tr.appendChild(td1);
            tr.appendChild(td2);
            tbodyPres.appendChild(tr);
        });
    }

    document.getElementById('btn-carregar-presenca').addEventListener('click', () => {
        carregarPresenca();
    });

    document.getElementById('form-atividade').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-criar-atividade');
        await withBusy(btn, async () => {
            const payload = {
                titulo: document.getElementById('a-titulo').value.trim(),
                hora: document.getElementById('a-hora').value.trim(),
                data: document.getElementById('a-data').value.trim(),
                imagem_url: document.getElementById('a-img').value.trim(),
            };
            const vagas = parseVagas(document.getElementById('a-vagas').value);
            if (vagas !== null) payload.vagas = vagas;
            const res = await fetch(`${API_BASE}/atividades/`, {
                method: 'POST',
                headers: staffAuthHeaders(),
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                staffNotify('Atividade criada', 'success');
                e.target.reset();
                carregarCatalogo();
            } else {
                const err = await res.json().catch(() => ({}));
                staffNotify(fmtErr(err), 'error');
            }
        }, 'Salvando…');
    });

    carregarCatalogo();
});
