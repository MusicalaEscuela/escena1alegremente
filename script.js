/******************************
 *  Plegables y checklist
 ******************************/
function toggle(h){
  const card = h.parentElement;
  const content = card.querySelector('.content');
  const caret = h.querySelector('.caret');
  const open = content.style.display !== 'none';
  content.style.display = open ? 'none' : 'block';
  if (caret) caret.textContent = open ? 'Expandir' : 'Contraer';
}

// Mostrar todo abierto por defecto
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.card .content').forEach(c => c.style.display = 'block');
});

function copyChecklist(){
  const items = Array.from(document.querySelectorAll('#check-escena1 li'))
    .map(li => li.textContent.trim()).join('\n');
  navigator.clipboard.writeText(items || 'Checklist no encontrada');
  alert('Checklist copiada al portapapeles.');
}

/******************************
 *  Audio robusto (autoplay-friendly)
 ******************************/
(function(){
  const audio = document.getElementById('sceneAudio');
  const btn = document.getElementById('btnPlay');
  if (!audio || !btn) return;

  const sources = [
    'Mi cuerpo es solo mío.mp3',
    'Mi cuerpo es solo mio.mp3',
    'mi-cuerpo-es-solo-mio.mp3'
  ];
  let currentSrcIdx = 0;

  function setEncodedSrc(filename){
    const cacheBuster = `?v=${Date.now()}`;
    audio.src = encodeURI(filename) + cacheBuster;
  }
  setEncodedSrc(sources[currentSrcIdx]);

  function markBlocked(){
    btn.style.borderColor = '#f59e0b';
    btn.style.boxShadow = '0 0 0 3px rgba(245,158,11,.25)';
    btn.title = 'Tu navegador bloqueó el autoplay. Toca cualquier parte para iniciar.';
  }
  function updateBtn(){
    btn.textContent = audio.paused ? '▶ Reproducir' : '⏸️ Pausar';
  }

  async function tryPlay(){
    try {
      await audio.play();
      updateBtn();
    } catch {
      markBlocked(); updateBtn();
    }
  }

  // Intento de autoplay al cargar
  document.addEventListener('DOMContentLoaded', tryPlay);

  // Habilitar reproducción con la primera interacción
  const playOnInteract = () => { audio.play().then(updateBtn).catch(()=>{}); };
  window.addEventListener('pointerdown', playOnInteract, {once:true, capture:true});
  window.addEventListener('keydown', playOnInteract, {once:true, capture:true});
  window.addEventListener('touchstart', playOnInteract, {once:true, capture:true});

  // Botón
  btn.addEventListener('click', async () => {
    try {
      if (audio.paused) { await audio.play(); } else { audio.pause(); }
    } catch(e) {}
    updateBtn();
  });

  // Barra espaciadora
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !/input|textarea|select/i.test(e.target.tagName)) {
      e.preventDefault();
      if (audio.paused) { audio.play().catch(()=>{}); } else { audio.pause(); }
      updateBtn();
    }
  });

  // Fallback de nombres de archivo
  audio.addEventListener('error', () => {
    if (currentSrcIdx < sources.length - 1) {
      currentSrcIdx++;
      setEncodedSrc(sources[currentSrcIdx]);
      tryPlay();
    } else {
      alert('No se pudo cargar el audio. Verifica el nombre del archivo y su ubicación.');
    }
  });

  // Pausar al cambiar de pestaña
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !audio.paused) audio.pause();
  });
})();

/******************************
 *  Visores PDF (guion y partitura)
 ******************************/
(function(){
  function initPdfByIds(prefix){
    const frame = document.getElementById(prefix === 'Part' ? 'pdfFramePart' : 'pdfFrame');
    const view  = document.getElementById(prefix === 'Part' ? 'pdfViewPart' : 'pdfView');
    const down  = document.getElementById(prefix === 'Part' ? 'pdfDownloadPart' : 'pdfDownload');
    const fb    = document.getElementById(prefix === 'Part' ? 'pdfFallbackPart' : 'pdfFallback');

    const defaultFile = prefix === 'Part'
      ? 'Mi cuerpo es solo mio Partitura.pdf'
      : 'Guión Escena I.pdf';

    if (!frame || !view || !down || !fb) return;

    const url = encodeURI(defaultFile);
    view.href = url;
    down.href = url;

    fetch(url, { method: 'HEAD' })
      .then(r => {
        if (!r.ok) throw new Error('no disponible');
        frame.src = url + '#toolbar=1&navpanes=0&statusbar=0&view=FitH';
      })
      .catch(() => {
        frame.style.display = 'none';
        fb.style.display = 'block';
      });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initPdfByIds('Guion');
    initPdfByIds('Part');
  });

  function initPdfBlock(block){
    const filename = block.dataset.file || '';
    if (!filename) return;

    const url = encodeURI(filename);
    const frame = block.querySelector('.js-frame') || block.querySelector('iframe');
    const fb    = block.querySelector('.js-fallback') || block.querySelector('.pdf-fallback');

    const card = block.closest('.card') || document;
    const view = card.querySelector('.actions .js-view');
    const down = card.querySelector('.actions .js-down');

    if (view) view.href = url;
    if (down) down.href = url;

    fetch(url, { method: 'HEAD' })
      .then(r => {
        if (!r.ok) throw new Error('no disponible');
        if (frame) frame.src = url + '#toolbar=1&navpanes=0&statusbar=0&view=FitH';
      })
      .catch(() => {
        if (frame) frame.style.display = 'none';
        if (fb) fb.style.display = 'block';
      });
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.pdf-block[data-file]').forEach(initPdfBlock);
  });
})();

/******************************
 *  Filtros + búsqueda + recursos + docentes
 ******************************/
(function(){
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

  const chips = $$('.chip');
  const cards = $$('.card');
  const q = $('#q');
  const LS_KEY = 'escena1_filters_v3';

  const RESOURCES = [
    { title: 'Guión Escena I (PDF)', href: encodeURI('Guión Escena I.pdf'), areas: ['teatro','produccion'], type: 'pdf' },
    { title: 'Partitura: Mi cuerpo es solo mío (PDF)', href: encodeURI('Mi cuerpo es solo mio Partitura.pdf'), areas: ['musica'], type: 'pdf' },
    { title: 'Pista: Mi cuerpo es solo mío (MP3)', href: encodeURI('Mi cuerpo es solo mio.mp3'), areas: ['musica'], type: 'audio' }
  ];
  const ICON = { pdf:'📄', audio:'🎵', sheet:'📊', doc:'📝', link:'🔗' };

  function renderResources(){
    const ul = $('#res-list');
    if (!ul) return;
    const state = getActiveState();
    const items = RESOURCES.filter(r =>
      (!state.areas.length || r.areas.some(a => state.areas.includes(a)))
    );
    ul.innerHTML = items.map(r =>
      `<li><a href="${r.href}" target="_blank" rel="noreferrer">${ICON[r.type]||ICON.link} ${r.title}</a>
       <small class="muted">(${r.areas.join(', ')})</small></li>`
    ).join('') || `<li class="muted">No hay recursos para este filtro.</li>`;
  }

  // ==== DOCENTES ====
  const TEACHERS = [
    { name: 'Angie Nitola',  url: 'docentes/brenda.html',  areas: ['teatro'],   centros: ['lucero','arroyo','padre'] },
    { name: 'Erika López', url: 'docentes/yusting.html', areas: ['danza'],    centros: ['padre','arroyo','jerusalen'] },
    { name: 'Leydy Díaz',    url: 'docentes/leydy.html',    areas: ['plastica'], centros: ['santodomingo','lucero','arroyo'] },
    { name: 'Camila Pirajan',  url: 'docentes/camila.html',  areas: ['danza'],    centros: ['santodomingo','padre','jerusalen'] },
    { name: 'Santiago Gutiérrez', url: 'docentes/santiago.html', areas: ['plastica'], centros: ['jerusalen','lucero','padre','colegio','gmmmc'] },
  ];

  function renderTeachers(){
    const ul = document.getElementById('teachers-list');
    if (!ul) return;
    const state = getActiveState();
    const items = TEACHERS.filter(t => {
      const byArea   = !state.areas.length || t.areas.some(a => state.areas.includes(a));
      const byCentro = !state.centros.length || t.centros.some(c => state.centros.includes(c));
      const byQuery  = !state.query || (t.name.toLowerCase().includes(state.query.toLowerCase()));
      return byArea && byCentro && byQuery;
    });
    ul.innerHTML = items.map(t => `
      <li><a href="${t.url}" target="_blank" rel="noreferrer">${t.name}</a>
      <span class="teacher-tags">${t.areas.join(', ')}</span></li>
    `).join('') || `<li class="muted">No hay docentes para este filtro/búsqueda.</li>`;
  }

  // ==== Estado / Filtros ====
  function getParams(){
    const p = new URLSearchParams(location.search);
    const getList = k => (p.get(k)||'').split(',').map(s=>s.trim()).filter(Boolean);
    const areas = getList('areas');
    const centros = getList('centros');
    const logs = getList('logs');
    const query = (p.get('q')||'').trim();
    return {areas, centros, logs, query};
  }

  function getActiveState(){
    const areas = chips.filter(c => c.dataset.type==='area' && c.classList.contains('active')).map(c => c.dataset.area);
    const centros = chips.filter(c => c.dataset.type==='centro' && c.classList.contains('active')).map(c => c.dataset.centro);
    const logs = chips.filter(c => c.dataset.type==='log' && c.classList.contains('active')).map(c => c.dataset.log);
    return { areas, centros, logs, query: (q && q.value ? q.value.trim() : '') };
  }

  function saveState(){
    const state = getActiveState();
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }

  function cardMatches(card, state){
    const tags = (card.dataset.tags || 'general').split(/\s+/);
    const areaOk = (state.areas.length === 0) || state.areas.some(a => tags.includes(a));

    const centrosCard = (card.dataset.centros || '').split(/\s+/).filter(Boolean);
    const centroOk = (state.centros.length === 0) || state.centros.some(c => centrosCard.includes(c));

    const logsCard = (card.dataset.log || '').split(/\s+/).filter(Boolean);
    const logOk = (state.logs.length === 0) || state.logs.some(l => logsCard.includes(l));

    const textOk = (card.textContent||'').toLowerCase().includes(state.query.toLowerCase());
    return areaOk && centroOk && logOk && textOk;
  }

  function filterNow(){
    const state = getActiveState();
    let visibleCount = 0;

    cards.forEach(card => {
      const show = cardMatches(card, state);
      card.style.display = show ? '' : 'none';
      if (show) visibleCount++;
    });

    if (visibleCount === 0 && (state.areas.length || state.centros.length || state.logs.length)){
      cards.forEach(card => {
        const tags = (card.dataset.tags || '').split(/\s+/);
        const centrosCard = (card.dataset.centros || '').split(/\s+/);
        const logsCard = (card.dataset.log || '').split(/\s+/);
        const showGeneral = tags.includes('general') ||
          (!state.centros.length || state.centros.some(c=>centrosCard.includes(c))) ||
          (!state.logs.length || state.logs.some(l=>logsCard.includes(l)));
        card.style.display = showGeneral ? '' : 'none';
      });
    }

    renderResources();
    renderTeachers();
    saveState();
  }

  function applyState({areas=[], centros=[], logs=[], query=''}){
    chips.forEach(ch => {
      const t = ch.dataset.type;
      if (t === 'area') ch.classList.toggle('active', areas.includes(ch.dataset.area));
      if (t === 'centro') ch.classList.toggle('active', centros.includes(ch.dataset.centro));
      if (t === 'log') ch.classList.toggle('active', logs.includes(ch.dataset.log));
    });
    if (q) q.value = query || '';
    filterNow();
  }

  function loadState(){
    const byUrl = getParams();
    if (byUrl.areas.length || byUrl.centros.length || byUrl.logs.length || byUrl.query){
      applyState(byUrl);
      return;
    }
    try{
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      applyState({
        areas: saved.areas || [],
        centros: saved.centros || [],
        logs: saved.logs || [],
        query: saved.query || ''
      });
    }catch{}
  }

  // Eventos
  chips.forEach(chip => chip.addEventListener('click', () => { chip.classList.toggle('active'); filterNow(); }));
  if (q) q.addEventListener('input', filterNow);

  document.addEventListener('DOMContentLoaded', () => {
    renderResources();
    renderTeachers();
    loadState();
  });
})();

/******************************
 *  Vista previa de imágenes
 ******************************/
(function(){
  function ensureOverlay(){
    let o = document.getElementById('imgPreviewOverlay');
    if (!o){
      o = document.createElement('div');
      o.id = 'imgPreviewOverlay';
      o.style.position = 'fixed';
      o.style.inset = '0';
      o.style.display = 'none';
      o.style.zIndex = '9999';
      o.style.background = 'rgba(0,0,0,.85)';
      o.style.alignItems = 'center';
      o.style.justifyContent = 'center';

      const img = document.createElement('img');
      img.alt = 'Vista previa';
      img.style.maxWidth = '90vw';
      img.style.maxHeight = '90vh';
      img.style.borderRadius = '12px';
      img.style.boxShadow = '0 10px 30px rgba(0,0,0,.5)';

      o.appendChild(img);
      document.body.appendChild(o);

      o.addEventListener('click', () => o.style.display='none');
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') o.style.display='none'; });
    }
    return o;
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-preview]');
    if (!a) return;
    e.preventDefault();
    const overlay = ensureOverlay();
    overlay.querySelector('img').src = a.getAttribute('href');
    overlay.style.display = 'flex';
  });
})();
