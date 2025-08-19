// ===== Plegables y checklist =====
function toggle(h){
  const card = h.parentElement;
  const content = card.querySelector('.content');
  const caret = h.querySelector('.caret');
  const open = content.style.display !== 'none';
  content.style.display = open ? 'none' : 'block';
  caret.textContent = open ? 'Expandir' : 'Contraer';
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

// ===== Audio robusto =====
(function(){
  const audio = document.getElementById('sceneAudio');
  const btn = document.getElementById('btnPlay');

  // Archivos en orden de prueba (evita fallos por acentos/espacios)
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

  function tryPlayAutoplay(){
    audio.volume = 1.0;
    const p = audio.play();
    if (p && typeof p.then === 'function') {
      p.then(() => { updateBtn(); })
       .catch(() => { markBlocked(); updateBtn(); });
    }
  }

  const playOnInteract = () => { audio.play().then(updateBtn).catch(()=>{}); };
  window.addEventListener('pointerdown', playOnInteract, {once:true, capture:true});
  window.addEventListener('keydown', playOnInteract, {once:true, capture:true});
  window.addEventListener('touchstart', playOnInteract, {once:true, capture:true});

  btn.addEventListener('click', async () => {
    try {
      if (audio.paused) { await audio.play(); } else { audio.pause(); }
    } catch(e) {}
    updateBtn();
  });

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !/input|textarea|select/i.test(e.target.tagName)) {
      e.preventDefault();
      if (audio.paused) { audio.play().catch(()=>{}); } else { audio.pause(); }
      updateBtn();
    }
  });

  audio.addEventListener('error', () => {
    if (currentSrcIdx < sources.length - 1) {
      currentSrcIdx++;
      setEncodedSrc(sources[currentSrcIdx]);
      tryPlayAutoplay();
    } else {
      alert('No se pudo cargar el audio. Verifica el nombre del archivo y su ubicación.');
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !audio.paused) audio.pause();
  });

  document.addEventListener('DOMContentLoaded', tryPlayAutoplay);
})();

// ===== Visor PDF (con fallback) =====
(function(){
  const filename = 'Guión Escena I.pdf';
  const url = encodeURI(filename);

  const frame = document.getElementById('pdfFrame');
  const view  = document.getElementById('pdfView');
  const down  = document.getElementById('pdfDownload');
  const fb    = document.getElementById('pdfFallback');

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
})();

// ===== Filtros por arte + centro + logística + buscador + compartir =====
(function(){
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
  const chips = $$('.chip');
  const cards = $$('.card');
  const q = $('#q');

  const LS_KEY = 'escena1_filters_v2';
  const LS_MI_ARTE = 'escena1_miarte';

  // Recursos curados por arte (edita href con tus enlaces reales)
  const RESOURCES = [
    { title:'Guión Escena I (PDF)', href: encodeURI('Guión Escena I.pdf'), areas:['teatro','produccion'], type:'pdf' },
    { title:'Pista: Mi cuerpo es solo mío (MP3)', href: encodeURI('Mi cuerpo es solo mío.mp3'), areas:['musica'], type:'audio' },
    // NUEVO: Partitura
    { title:'Partitura: Mi Cuerpo Es Sólo Mío (PDF)', href: encodeURI('Mi cuerpo es solo mio Partitura.pdf'), areas:['musica'], type:'pdf' },
    { title:'Cue list de luces', href:'#', areas:['luces','tecnica'], type:'doc' },
    { title:'Materiales plásticos escena 1', href:'#', areas:['plastica','produccion'], type:'sheet' },
    { title:'Roles / reparto', href:'#', areas:['produccion'], type:'doc' },
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
      `<li style="padding:6px 0; border-bottom:1px solid var(--bd)">
         <a href="${r.href}" target="_blank" rel="noreferrer">${ICON[r.type]||ICON.link} ${r.title}</a>
         <small class="muted" style="margin-left:6px">(${r.areas.join(', ')})</small>
       </li>`
    ).join('') || `<li class="muted">No hay recursos para este filtro.</li>`;
  }

  // URL params (?areas=danza,luces&centros=lucero&q=texto&logs=vestuario,sonido)
  function getParams(){
    const p = new URLSearchParams(location.search);
    const getList = k => (p.get(k)||'').split(',').map(s=>s.trim()).filter(Boolean);
    const areas = getList('areas');
    const centros = getList('centros');
    const logs = getList('logs');
    const query = (p.get('q')||'').trim();
    return {areas, centros, logs, query};
  }

  function saveState(){
    const state = getActiveState();
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }

  function applyState({areas=[], centros=[], logs=[], query=''}){
    chips.forEach(ch => {
      const t = ch.dataset.type;
      if (t === 'area') ch.classList.toggle('active', areas.includes(ch.dataset.area));
      if (t === 'centro') ch.classList.toggle('active', centros.includes(ch.dataset.centro));
      if (t === 'log') ch.classList.toggle('active', logs.includes(ch.dataset.log));
    });
    q.value = query || '';
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

  function getActiveState(){
    const areas = chips.filter(c => c.dataset.type==='area' && c.classList.contains('active')).map(c => c.dataset.area);
    const centros = chips.filter(c => c.dataset.type==='centro' && c.classList.contains('active')).map(c => c.dataset.centro);
    const logs = chips.filter(c => c.dataset.type==='log' && c.classList.contains('active')).map(c => c.dataset.log);
    return { areas, centros, logs, query: q.value.trim() };
  }

  function textMatches(el, needle){
    if (!needle) return true;
    const hay = (el.textContent || '').toLowerCase();
    return hay.includes(needle.toLowerCase());
  }

  function cardMatches(card, state){
    // Áreas se mapean desde data-tags (espacios)
    const tags = (card.dataset.tags || 'general').split(/\s+/);
    const areaOk = (state.areas.length === 0) || state.areas.some(a => tags.includes(a));

    // Centros desde data-centros
    const centrosCard = (card.dataset.centros || '').split(/\s+/).filter(Boolean);
    const centroOk = (state.centros.length === 0) || state.centros.some(c => centrosCard.includes(c));

    // Logística desde data-log (varios separados por espacios)
    const logsCard = (card.dataset.log || '').split(/\s+/).filter(Boolean);
    const logOk = (state.logs.length === 0) || state.logs.some(l => logsCard.includes(l));

    const textOk = textMatches(card, state.query);
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

    // Si todo quedó oculto, deja ver "general" para no frustrar
    if (visibleCount === 0 && (state.areas.length || state.centros.length || state.logs.length)){
      cards.forEach(card => {
        const tags = (card.dataset.tags || '').split(/\s+/);
        const centrosCard = (card.dataset.centros || '').split(/\s+/);
        const logsCard = (card.dataset.log || '').split(/\s+/);
        const showGeneral =
          tags.includes('general') ||
          (!state.centros.length || state.centros.some(c=>centrosCard.includes(c))) ||
          (!state.logs.length || state.logs.some(l=>logsCard.includes(l)));
        card.style.display = showGeneral ? '' : 'none';
      });
    }

    renderResources();
    saveState();
  }

  // Eventos UI
  const btnClear = document.getElementById('btnClearFilters');
  const btnSolo = document.getElementById('btnSoloMiArte');
  const btnShare = document.getElementById('btnShare');

  chips.forEach(chip => chip.addEventListener('click', () => {
    chip.classList.toggle('active');
    filterNow();
  }));
  q.addEventListener('input', filterNow);

  btnClear.addEventListener('click', () => {
    chips.forEach(c => c.classList.remove('active'));
    q.value = '';
    filterNow();
  });

  btnSolo.addEventListener('click', () => {
    let mi = localStorage.getItem(LS_MI_ARTE);
    if (!mi){
      mi = prompt('¿Cuál es tu arte? (danza, teatro, plastica, musica, luces, sonido, produccion)');
      if (!mi) return;
      mi = mi.trim().toLowerCase();
      localStorage.setItem(LS_MI_ARTE, mi);
    }
    chips.forEach(c => {
      if (c.dataset.type === 'area'){
        c.classList.toggle('active', c.dataset.area === mi);
      } else {
        c.classList.remove('active');
      }
    });
    q.value = '';
    filterNow();
  });

  btnShare.addEventListener('click', async () => {
    const st = getActiveState();
    const params = new URLSearchParams();
    if (st.areas.length) params.set('areas', st.areas.join(','));
    if (st.centros.length) params.set('centros', st.centros.join(','));
    if (st.logs.length) params.set('logs', st.logs.join(','));
    if (st.query) params.set('q', st.query);
    const shareUrl = `${location.origin}${location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    try{
      await navigator.clipboard.writeText(shareUrl);
      alert('Link copiado. ¡Compártelo con tu equipo!');
    }catch{
      prompt('Copia este link:', shareUrl);
    }
  });

  // Init
  document.addEventListener('DOMContentLoaded', () => {
    renderResources();
    loadState();
  });
})();
