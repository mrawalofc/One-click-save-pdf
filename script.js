'use strict';
/* A4 Photo Studio Pro — core logic */
const $ = id => document.getElementById(id);
const MM = 3.7795275591;                 /* CSS px per millimetre (96 dpi) */
const CW = 760, CH = 540;                /* logical crop-canvas size */
const state = { photos: [], sel: -1, drag: null, crop: null, pan: null };

/* ---------- helpers ---------- */
const size = () => $('orientation').value === 'portrait' ? { w: 210, h: 297 } : { w: 297, h: 210 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const snapVal = v => { const n = +$('snap').value; return n ? Math.round(v / n) * n : v; };

const cleanName = v => String(v || '').trim().replace(/[^\w\- ]+/g, '').replace(/\s+/g, '-');
function fileName() {
  const d = cleanName($('doc').value) || 'A4-Photo-Studio';
  const n = cleanName($('nick').value);
  const t = $('stamp').checked ? '_' + new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '') : '';
  return d + (n ? '_' + n : '') + t + '.pdf';
}
function updateName() { $('filename').textContent = fileName(); }

let toastTimer = null;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ---------- rendering ---------- */
function render() {
  const page = $('page');
  const z = size();
  page.className = 'a4 ' + $('orientation').value;
  page.innerHTML = '';
  $('hint').style.display = state.photos.length ? 'none' : '';
  $('count').textContent = state.photos.length + (state.photos.length === 1 ? ' photo' : ' photos');
  $('pagesize').innerHTML = z.w + ' &times; ' + z.h + ' mm';

  state.photos.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'photo' + (i === state.sel ? ' selected' : '');
    el.dataset.index = i;
    el.style.left = p.x + 'mm';
    el.style.top = p.y + 'mm';
    el.style.width = p.w + 'mm';
    el.style.height = p.h + 'mm';
    el.innerHTML = '<span class="tag">' + (i + 1) + '</span><img src="' + p.src + '" alt="" draggable="false"><span class="resize" title="Drag to resize"></span>';
    el.addEventListener('pointerdown', ev => {
      if (ev.button !== 0) return;
      startDrag(ev, i, ev.target.classList.contains('resize'), el);
    });
    el.addEventListener('dblclick', () => { state.sel = i; render(); openCrop(); });
    page.appendChild(el);
  });

  const p = state.photos[state.sel];
  const has = !!p;
  $('none').hidden = has;
  $('controls').hidden = !has;
  $('savePdf').classList.toggle('disabled', !state.photos.length);
  if (has) {
    $('x').value = p.x.toFixed(1);
    $('y').value = p.y.toFixed(1);
    $('w').value = p.w.toFixed(1);
    $('h').value = p.h.toFixed(1);
  }
}

function startDrag(ev, i, resizing, el) {
  ev.preventDefault();
  state.sel = i;
  state.drag = { i, resizing, sx: ev.clientX, sy: ev.clientY, p: { ...state.photos[i] } };
  el.setPointerCapture(ev.pointerId);
  document.querySelectorAll('.photo').forEach(n => n.classList.toggle('selected', +n.dataset.index === i));
  $('none').hidden = true;
  $('controls').hidden = false;

  const move = e => {
    const d = state.drag;
    if (!d) return;
    const p = state.photos[d.i], z = size();
    const dx = (e.clientX - d.sx) / MM, dy = (e.clientY - d.sy) / MM;
    if (d.resizing) {
      p.w = clamp(snapVal(d.p.w + dx), 5, z.w - d.p.x);
      p.h = clamp(snapVal(d.p.h + dy), 5, z.h - d.p.y);
    } else {
      p.x = clamp(snapVal(d.p.x + dx), 0, z.w - p.w);
      p.y = clamp(snapVal(d.p.y + dy), 0, z.h - p.h);
    }
    el.style.left = p.x + 'mm';
    el.style.top = p.y + 'mm';
    el.style.width = p.w + 'mm';
    el.style.height = p.h + 'mm';
    $('x').value = p.x.toFixed(1); $('y').value = p.y.toFixed(1);
    $('w').value = p.w.toFixed(1); $('h').value = p.h.toFixed(1);
  };
  const up = () => {
    state.drag = null;
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
    render();
  };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
}

/* ---------- photo inputs ---------- */
['x', 'y', 'w', 'h'].forEach(k => {
  $(k).addEventListener('change', () => {
    if (state.sel < 0) return;
    const p = state.photos[state.sel], z = size();
    p[k] = Number($(k).value) || 0;
    p.w = clamp(p.w, 5, z.w);
    p.h = clamp(p.h, 5, z.h);
    p.x = clamp(p.x, 0, z.w - p.w);
    p.y = clamp(p.y, 0, z.h - p.h);
    render();
  });
});

/* ---------- toolbar ---------- */
$('files').addEventListener('change', e => {
  const list = [...e.target.files];
  list.forEach(f => {
    const r = new FileReader();
    r.onload = () => {
      const im = new Image();
      im.onload = () => {
        const i = state.photos.length, z = size();
        const p = { src: r.result, x: 10 + (i % 2) * 95, y: 10 + Math.floor(i / 2) * 80, w: 90, h: 70, sw: im.naturalWidth, sh: im.naturalHeight };
        p.w = Math.min(p.w, z.w - 10);
        p.h = Math.min(p.h, z.h - 10);
        state.photos.push(p);
        state.sel = i;
        render();
      };
      im.src = r.result;
    };
    r.readAsDataURL(f);
  });
  e.target.value = '';
});

$('orientation').addEventListener('change', () => {
  const z = size();
  state.photos.forEach(p => {
    p.x = clamp(p.x, 0, z.w - p.w);
    p.y = clamp(p.y, 0, z.h - p.h);
  });
  render();
});

$('auto').addEventListener('click', () => {
  const z = size(), n = state.photos.length;
  if (!n) return toast('Add pictures first');
  const cols = n === 1 ? 1 : 2, rows = Math.ceil(n / cols), g = 5;
  const w = (z.w - (cols + 1) * g) / cols;
  const h = Math.min(65, (z.h - (rows + 1) * g) / rows);
  state.photos.forEach((p, i) => {
    p.x = g + (i % cols) * (w + g);
    p.y = g + Math.floor(i / cols) * (h + g);
    p.w = w;
    p.h = h;
  });
  render();
  toast('Auto-arranged ' + n + (n === 1 ? ' photo' : ' photos'));
});

$('clear').addEventListener('click', () => {
  if (!state.photos.length) return;
  state.photos = [];
  state.sel = -1;
  render();
  toast('Canvas cleared');
});

function removeSelected() {
  if (state.sel < 0) return;
  state.photos.splice(state.sel, 1);
  state.sel = Math.min(state.sel, state.photos.length - 1);
  render();
  toast('Photo removed');
}
$('remove').addEventListener('click', removeSelected);

/* ---------- crop / zoom modal ---------- */
function openCrop() {
  if (state.sel < 0) return;
  state.crop = { i: state.sel, z: 1, ox: 0, oy: 0 };
  $('zoom').value = 1;
  $('modal').classList.add('open');   /* fixed: class toggle, no hidden/display conflict */
  drawCrop();
}
function closeCrop() {
  state.crop = null;
  state.pan = null;
  $('modal').classList.remove('open');
}

$('crop').addEventListener('click', openCrop);
$('cancel').addEventListener('click', closeCrop);
$('modal').addEventListener('pointerdown', e => { if (e.target === $('modal')) closeCrop(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('modal').classList.contains('open')) closeCrop();
  if ((e.key === 'Delete' || e.key === 'Backspace') && !$('modal').classList.contains('open')) {
    const t = document.activeElement && document.activeElement.tagName;
    if (t !== 'INPUT' && t !== 'SELECT' && t !== 'TEXTAREA') removeSelected();
  }
});

function drawCrop() {
  if (!state.crop) return;
  const c = $('cropCanvas');
  const dpr = window.devicePixelRatio || 1;
  c.width = CW * dpr;
  c.height = CH * dpr;
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  const cr = state.crop, p = state.photos[cr.i];
  const im = new Image();
  im.onload = () => {
    const sc = Math.max(CW / im.naturalWidth, CH / im.naturalHeight) * cr.z;
    const w = im.naturalWidth * sc, h = im.naturalHeight * sc;
    const x = (CW - w) / 2 + cr.ox, y = (CH - h) / 2 + cr.oy;
    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = '#06080f';
    ctx.fillRect(0, 0, CW, CH);
    ctx.drawImage(im, x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, CW - 2, CH - 2);
  };
  im.src = p.src;
}

const cnv = $('cropCanvas');
cnv.addEventListener('pointerdown', e => {
  if (!state.crop) return;
  e.preventDefault();
  cnv.setPointerCapture(e.pointerId);
  state.pan = { x: e.clientX, y: e.clientY, ox: state.crop.ox, oy: state.crop.oy };
});
cnv.addEventListener('pointermove', e => {
  if (!state.pan || !state.crop) return;
  state.crop.ox = state.pan.ox + e.clientX - state.pan.x;
  state.crop.oy = state.pan.oy + e.clientY - state.pan.y;
  drawCrop();
});
const endPan = () => { state.pan = null; };
cnv.addEventListener('pointerup', endPan);
cnv.addEventListener('pointercancel', endPan);

function setZoom(z2) {
  if (!state.crop) return;
  z2 = clamp(z2, 0.5, 4);
  const cx = CW / 2, cy = CH / 2;
  state.crop.ox = cx - (cx - state.crop.ox) * (z2 / state.crop.z);
  state.crop.oy = cy - (cy - state.crop.oy) * (z2 / state.crop.z);
  state.crop.z = z2;
  $('zoom').value = z2;
  drawCrop();
}
$('zoom').addEventListener('input', () => { if (state.crop) { state.crop.z = +$('zoom').value; drawCrop(); } });
cnv.addEventListener('wheel', e => {
  if (!state.crop) return;
  e.preventDefault();
  setZoom(state.crop.z * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
}, { passive: false });

$('apply').addEventListener('click', () => {
  if (!state.crop) return;
  const cr = state.crop, p = state.photos[cr.i];
  const im = new Image();
  im.onload = () => {
    const sc = Math.max(CW / im.naturalWidth, CH / im.naturalHeight) * cr.z;
    const w = im.naturalWidth * sc, h = im.naturalHeight * sc;
    const x = (CW - w) / 2 + cr.ox, y = (CH - h) / 2 + cr.oy;
    const sx = clamp(-x / sc, 0, im.naturalWidth);
    const sy = clamp(-y / sc, 0, im.naturalHeight);
    const sw = clamp((CW - x) / sc, 1, im.naturalWidth - sx);
    const sh = clamp((CH - y) / sc, 1, im.naturalHeight - sy);
    const out = document.createElement('canvas');
    out.width = 1400;
    out.height = Math.round(1400 * CH / CW);
    out.getContext('2d').drawImage(im, sx, sy, sw, sh, 0, 0, out.width, out.height);
    p.src = out.toDataURL('image/jpeg', 0.92);
    p.sw = out.width;
    p.sh = out.height;
    closeCrop();
    render();
    toast('Crop applied');
  };
  im.src = p.src;
});

/* ---------- save pdf ---------- */
$('savePdf').addEventListener('click', async () => {
  if (!state.photos.length) return toast('Add pictures first');
  if (!window.jspdf) return toast('PDF library did not load — check your internet connection');
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: $('orientation').value, unit: 'mm', format: 'a4', compress: true });
  const per = 6;
  for (let s = 0; s < state.photos.length; s += per) {
    if (s) pdf.addPage('a4', $('orientation').value);
    state.photos.slice(s, s + per).forEach(p => pdf.addImage(p.src, 'JPEG', p.x, p.y, p.w, p.h, undefined, 'FAST'));
  }
  const name = fileName();
  pdf.save(name);
  toast('Saved ' + name);
});

/* ---------- filename live preview ---------- */
['doc', 'nick'].forEach(id => $(id).addEventListener('input', updateName));
$('stamp').addEventListener('change', updateName);

/* ---------- init ---------- */
updateName();
render();
