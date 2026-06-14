'use strict';

/**
 * Workaholic - Dashboard Kanban
 *
 * Consome shared/applications.js (storage-only, sem backend).
 * Render 8 colunas, drag-drop, regenerar follow-up, export/import JSON.
 *
 * Status enumerados (exato):
 *   Candidatado, Em Analise, Entrevista, Teste Tecnico,
 *   Proposta, Aprovado, Rejeitado, Arquivado
 */

(() => {
  // Ordem fixa das colunas (esquerda -> direita)
  const COLUMN_ORDER = [
    'Candidatado',
    'Em Analise',
    'Entrevista',
    'Teste Tecnico',
    'Proposta',
    'Aprovado',
    'Rejeitado',
    'Arquivado',
  ];

  // ---------------------------------------------------------------------------
  // Utils
  // ---------------------------------------------------------------------------

  const $  = (sel, root = document) => root.querySelector(sel);

  const escapeHTML = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class')      node.className = v;
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') {
        node.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (v != null) {
        node.setAttribute(k, v);
      }
    }
    for (const c of children) {
      if (c == null) continue;
      node.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return node;
  }

  function cssEscape(s) {
    return (window.CSS && CSS.escape) ? CSS.escape(s) : s.replace(/(["\\])/g, '\\$1');
  }

  function toast(msg, kind = 'info') {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.toggle('is-error', kind === 'error');
    t.classList.add('is-visible');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('is-visible'), 2800);
  }

  function showModal(title, body) {
    $('#modal-title').textContent = title;
    $('#modal-body').textContent  = body;
    $('#modal-backdrop').classList.add('is-open');
  }

  function hideModal() {
    $('#modal-backdrop').classList.remove('is-open');
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  function renderBoardSkeleton() {
    const board = $('#board');
    board.innerHTML = '';
    for (const status of COLUMN_ORDER) {
      const col = el('section', {
        class: 'col',
        dataset: { status },
      },
        el('div', { class: 'col__header' },
          el('span', {}, status),
          el('span', { class: 'col__count', 'data-count-for': status }, '0'),
        ),
        el('div', {
          class: 'col__body',
          'data-body-for': status,
          ondragover: onDragOver,
          ondragleave: onDragLeave,
          ondrop: onDrop,
        }),
      );
      board.appendChild(col);
    }
  }

  function buildCard(app) {
    const card = el('article', {
      class: 'card',
      draggable: 'true',
      dataset: { id: app.id, status: app.status },
      ondragstart: onDragStart,
      ondragend:   onDragEnd,
    });

    const empresa  = app.empresa  || '(sem empresa)';
    const plat     = app.plataforma || '?';
    const linkHtml = app.link
      ? `<a class="card__link" href="${escapeHTML(app.link)}" target="_blank" rel="noopener">Abrir vaga ↗</a>`
      : '';

    card.innerHTML = `
      <h3 class="card__title">${escapeHTML(app.titulo)}</h3>
      <p class="card__company">${escapeHTML(empresa)} · ${escapeHTML(plat)}</p>
      <div class="card__meta">
        <span>Envio: <b>${escapeHTML(app.data_envio || '?')}</b></span>
        <span>Follow-up: <b>${escapeHTML(app.data_followup || '?')}</b></span>
      </div>
      ${linkHtml}
      <div class="card__actions">
        <button data-act="msg"  data-id="${escapeHTML(app.id)}">Mensagem</button>
        <button data-act="copy" data-id="${escapeHTML(app.id)}">Copiar</button>
        <button data-act="del"  data-id="${escapeHTML(app.id)}" class="danger">Excluir</button>
      </div>
    `;
    return card;
  }

  function distribuirCartoes(applications) {
    for (const status of COLUMN_ORDER) {
      const body = $(`[data-body-for="${cssEscape(status)}"]`);
      if (body) body.innerHTML = '';
    }

    const buckets = Object.fromEntries(COLUMN_ORDER.map((s) => [s, []]));
    let orphans = 0;
    for (const a of applications) {
      if (buckets[a.status]) buckets[a.status].push(a);
      else orphans++;
    }
    if (orphans > 0) console.warn(`${orphans} candidatura(s) com status fora do enum.`);

    for (const status of COLUMN_ORDER) {
      const body  = $(`[data-body-for="${cssEscape(status)}"]`);
      const count = $(`[data-count-for="${cssEscape(status)}"]`);
      const items = buckets[status];
      count.textContent = items.length;

      if (items.length === 0) {
        body.appendChild(el('div', { class: 'empty' }, 'Sem cartoes'));
        continue;
      }
      for (const a of items) body.appendChild(buildCard(a));
    }

    $('#stats').textContent =
      `${applications.length} candidatura${applications.length === 1 ? '' : 's'}`;
  }

  function bumpCount(status, delta) {
    const e = $(`[data-count-for="${cssEscape(status)}"]`);
    if (!e) return;
    const n = Math.max(0, parseInt(e.textContent, 10) + delta);
    e.textContent = String(n);
  }

  function cleanupEmpty(body) {
    if (!body) return;
    const cards = body.querySelectorAll('.card').length;
    const empty = body.querySelector('.empty');
    if (cards === 0 && !empty) {
      body.appendChild(el('div', { class: 'empty' }, 'Sem cartoes'));
    } else if (cards > 0 && empty) {
      empty.remove();
    }
  }

  // ---------------------------------------------------------------------------
  // Drag & Drop
  // ---------------------------------------------------------------------------

  let dragCtx = null;

  function onDragStart(ev) {
    const card = ev.currentTarget;
    dragCtx = { id: card.dataset.id, fromStatus: card.dataset.status, cardEl: card };
    card.classList.add('is-dragging');
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData('text/plain', card.dataset.id);
  }

  function onDragEnd(ev) {
    ev.currentTarget.classList.remove('is-dragging');
  }

  function onDragOver(ev) {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
    ev.currentTarget.classList.add('is-drop-target');
  }

  function onDragLeave(ev) {
    ev.currentTarget.classList.remove('is-drop-target');
  }

  async function onDrop(ev) {
    ev.preventDefault();
    const body = ev.currentTarget;
    body.classList.remove('is-drop-target');

    if (!dragCtx) return;
    const { id, fromStatus, cardEl } = dragCtx;
    const toStatus = body.dataset.bodyFor;
    dragCtx = null;

    if (!toStatus || toStatus === fromStatus) return;

    // Move otimista
    const placeholder = cardEl.nextSibling;
    const fromBody    = cardEl.parentElement;
    body.appendChild(cardEl);
    cardEl.dataset.status = toStatus;
    bumpCount(fromStatus, -1);
    bumpCount(toStatus,    +1);
    cleanupEmpty(fromBody);
    cleanupEmpty(body);

    try {
      await updateApplicationStatus(id, toStatus);
    } catch (err) {
      // Rollback
      if (fromBody) {
        if (placeholder && placeholder.parentElement === fromBody) {
          fromBody.insertBefore(cardEl, placeholder);
        } else {
          fromBody.appendChild(cardEl);
        }
      }
      cardEl.dataset.status = fromStatus;
      bumpCount(toStatus,    -1);
      bumpCount(fromStatus,  +1);
      cleanupEmpty(body);
      cleanupEmpty(fromBody);
      toast(`Falha ao atualizar status: ${err.message || 'erro'}. Cartao retornado.`, 'error');
    }
  }

  // ---------------------------------------------------------------------------
  // Card actions
  // ---------------------------------------------------------------------------

  async function handleCardClick(ev) {
    const btn = ev.target.closest('button[data-act]');
    if (!btn) return;
    const id  = btn.dataset.id;
    const act = btn.dataset.act;

    let app;
    try {
      app = await getApplication(id);
    } catch (err) {
      toast('Erro ao carregar candidatura.', 'error');
      return;
    }
    if (!app) {
      toast('Candidatura nao encontrada.', 'error');
      return;
    }

    if (act === 'msg') {
      // Regenera + mostra modal com mensagem
      try {
        const msg = buildFollowupMessage({ application: app, mode: 'gentle' });
        await patchApplication(id, { followup_message: msg });
        showModal(`Follow-up: ${app.titulo}`, msg);
      } catch (err) {
        toast(`Erro ao gerar mensagem: ${err.message}`, 'error');
      }
      return;
    }

    if (act === 'copy') {
      const msg = app.followup_message ||
        buildFollowupMessage({ application: app, mode: 'gentle' });
      try {
        await navigator.clipboard.writeText(msg);
        toast('Mensagem copiada para clipboard.');
      } catch {
        showModal(`Copie manualmente: ${app.titulo}`, msg);
      }
      return;
    }

    if (act === 'del') {
      if (!confirm(`Excluir "${app.titulo}"? Acao irreversivel.`)) return;
      try {
        await deleteApplication(id);
        toast('Candidatura excluida.');
        await load();
      } catch (err) {
        toast(`Erro ao excluir: ${err.message}`, 'error');
      }
      return;
    }
  }

  // ---------------------------------------------------------------------------
  // Export / Import
  // ---------------------------------------------------------------------------

  async function doExport() {
    try {
      const apps  = await exportApplications();
      const projs = await exportProjects();
      const payload = {
        version:     1,
        exported_at: new Date().toISOString(),
        applications: apps.applications,
        projects:     projs.projects,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const ts   = new Date().toISOString().slice(0, 10);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `workaholic-export-${ts}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('Export gerado.');
    } catch (err) {
      toast(`Erro ao exportar: ${err.message}`, 'error');
    }
  }

  async function doImport(file) {
    try {
      const text    = await file.text();
      const payload = JSON.parse(text);

      let importedApps  = 0, skippedApps = 0;
      let importedProjs = 0, skippedProjs = 0;

      if (Array.isArray(payload.applications)) {
        const r = await importApplications({ applications: payload.applications });
        importedApps = r.imported; skippedApps = r.skipped;
      }
      if (Array.isArray(payload.projects)) {
        const r = await importProjects({ projects: payload.projects });
        importedProjs = r.imported; skippedProjs = r.skipped;
      }

      toast(
        `Importado: ${importedApps} candidaturas, ${importedProjs} projetos ` +
        `(skip: ${skippedApps}/${skippedProjs}).`
      );
      await load();
    } catch (err) {
      toast(`Erro ao importar: ${err.message}`, 'error');
    }
  }

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------

  async function load() {
    try {
      const apps = await listApplications();
      distribuirCartoes(apps);
    } catch (err) {
      console.error(err);
      toast('Falha ao carregar candidaturas.', 'error');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderBoardSkeleton();
    load();

    $('#refresh-btn').addEventListener('click', load);
    $('#export-btn').addEventListener('click', doExport);
    $('#import-btn').addEventListener('click', () => $('#import-file').click());
    $('#import-file').addEventListener('change', (ev) => {
      const f = ev.target.files && ev.target.files[0];
      if (f) doImport(f);
      ev.target.value = '';
    });

    // Delegacao de clicks em botoes de card
    $('#board').addEventListener('click', handleCardClick);

    // Modal
    $('#modal-close').addEventListener('click', hideModal);
    $('#modal-backdrop').addEventListener('click', (ev) => {
      if (ev.target === $('#modal-backdrop')) hideModal();
    });
    $('#modal-copy').addEventListener('click', async () => {
      const txt = $('#modal-body').textContent;
      try {
        await navigator.clipboard.writeText(txt);
        toast('Copiado.');
      } catch {
        // noop — texto ja visivel no modal
      }
    });
  });
})();
