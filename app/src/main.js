// Vice City Nights — wires the editor: photo upload (file pick and drag-drop),
// per-panel crop and position, caption styling, live preview and PNG export.
// A `?shot=` query sets up a fixed scene for a screenshot (see shots.js).
import { drawCover, panelRects, PANEL_LABELS } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const panelList = document.getElementById('panels');
const captionInput = document.getElementById('caption');
const captionSize = document.getElementById('caption-size');
const captionColor = document.getElementById('caption-color');
const outlineColor = document.getElementById('outline-color');
const outlineWidth = document.getElementById('outline-width');
const shadowToggle = document.getElementById('caption-shadow');
const sizeButtons = document.querySelectorAll('[data-export]');

const state = {
  panels: [0, 1, 2].map(() => ({ img: null, zoom: 1, ox: 0, oy: 0, name: '' })),
  caption: 'VICE CITY NIGHTS',
  captionSize: 96,
  captionColor: '#ffffff',
  outlineColor: '#1a0b26',
  outlineWidth: 0.09,
  shadow: true,
};
let selected = 0;

function redraw() {
  drawCover(canvas, state);
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function setStatus(text) {
  status.textContent = text;
}

/** Puts `img` into panel `i`, keeping the panel's zoom and pan. */
function setPanelPhoto(i, img, name) {
  state.panels[i].img = img;
  state.panels[i].name = name || 'Your photo';
  redraw();
  renderPanelCards();
}

/** One photo across every panel: the same shot, cropped three ways. */
function fillAllPanels(img, name) {
  state.panels.forEach((panel, i) => {
    panel.img = img;
    panel.name = name || 'Your photo';
    // Give each panel a different crop of the same photo.
    panel.ox = [-0.08, 0, 0.08][i];
    panel.oy = [-0.06, 0, 0.06][i];
  });
  redraw();
  renderPanelCards();
  setStatus('One photo fills all three panels — drag each panel to reframe it.');
}

async function loadFileIntoPanel(file, i) {
  if (!file || !file.type.startsWith('image/')) return;
  const img = await loadImage(URL.createObjectURL(file));
  setPanelPhoto(i, img, file.name);
  setStatus(`Loaded ${file.name} into “${PANEL_LABELS[i]}”.`);
}

/** Builds the three per-panel control cards. */
function renderPanelCards() {
  panelList.innerHTML = '';
  state.panels.forEach((panel, i) => {
    const card = document.createElement('section');
    card.className = 'panel-card' + (i === selected ? ' selected' : '');
    card.addEventListener('click', () => { selected = i; renderPanelCards(); });

    const head = document.createElement('h3');
    head.textContent = `${i + 1}. ${PANEL_LABELS[i]}`;
    card.appendChild(head);

    const meta = document.createElement('p');
    meta.className = 'panel-meta';
    meta.textContent = panel.img ? panel.name : 'No photo yet — pick one below.';
    card.appendChild(meta);

    const fileLabel = document.createElement('label');
    fileLabel.className = 'file-btn';
    fileLabel.textContent = 'Choose photo';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.addEventListener('change', (e) => loadFileIntoPanel(e.target.files[0], i));
    fileLabel.appendChild(fileInput);
    card.appendChild(fileLabel);

    const samples = document.createElement('div');
    samples.className = 'sample-row';
    [['Pier', 'pier'], ['Boulevard', 'boulevard']].forEach(([label, sample]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = `Sample: ${label}`;
      b.addEventListener('click', async (e) => {
        e.stopPropagation();
        setPanelPhoto(i, await loadImage(`samples/${sample}.jpg`), `Sample ${label}`);
        setStatus(`Sample ${label} in “${PANEL_LABELS[i]}”.`);
      });
      samples.appendChild(b);
    });
    card.appendChild(samples);

    const zoomLabel = document.createElement('label');
    zoomLabel.textContent = `Zoom ${panel.zoom.toFixed(2)}×`;
    const zoom = document.createElement('input');
    zoom.type = 'range';
    zoom.min = '1';
    zoom.max = '3';
    zoom.step = '0.01';
    zoom.value = String(panel.zoom);
    zoom.addEventListener('input', () => {
      panel.zoom = Number(zoom.value);
      zoomLabel.textContent = `Zoom ${panel.zoom.toFixed(2)}×`;
      redraw();
    });
    zoomLabel.appendChild(zoom);
    card.appendChild(zoomLabel);

    const row = document.createElement('div');
    row.className = 'card-row';
    const fillBtn = document.createElement('button');
    fillBtn.type = 'button';
    fillBtn.className = 'chip';
    fillBtn.textContent = 'Use for all panels';
    fillBtn.disabled = !panel.img;
    fillBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fillAllPanels(panel.img, panel.name);
    });
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'chip';
    resetBtn.textContent = 'Reset crop';
    resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.zoom = 1; panel.ox = 0; panel.oy = 0;
      redraw();
      renderPanelCards();
    });
    row.appendChild(fillBtn);
    row.appendChild(resetBtn);
    card.appendChild(row);
    panelList.appendChild(card);
  });
}

// Caption controls.
captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
captionSize.addEventListener('input', () => { state.captionSize = Number(captionSize.value); redraw(); });
captionColor.addEventListener('input', () => { state.captionColor = captionColor.value; redraw(); });
outlineColor.addEventListener('input', () => { state.outlineColor = outlineColor.value; redraw(); });
outlineWidth.addEventListener('input', () => { state.outlineWidth = Number(outlineWidth.value); redraw(); });
shadowToggle.addEventListener('change', () => { state.shadow = shadowToggle.checked; redraw(); });

// Drag on the preview pans the panel under the pointer; dropping a file
// onto the preview loads it into that panel.
let drag = null;
function panelAt(clientX, clientY) {
  const box = canvas.getBoundingClientRect();
  const x = (clientX - box.left) / box.width * canvas.width;
  const y = (clientY - box.top) / box.height * canvas.height;
  const rects = panelRects(canvas.width, canvas.height);
  return rects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
}
canvas.addEventListener('pointerdown', (e) => {
  const i = panelAt(e.clientX, e.clientY);
  if (i < 0) return;
  selected = i;
  renderPanelCards();
  drag = { i, x: e.clientX, y: e.clientY, ox: state.panels[i].ox, oy: state.panels[i].oy };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const box = canvas.getBoundingClientRect();
  const panel = state.panels[drag.i];
  const rect = panelRects(canvas.width, canvas.height)[drag.i];
  panel.ox = drag.ox + (e.clientX - drag.x) / box.width * (canvas.width / rect.w);
  panel.oy = drag.oy + (e.clientY - drag.y) / box.height * (canvas.height / rect.h);
  panel.ox = Math.max(-0.6, Math.min(0.6, panel.ox));
  panel.oy = Math.max(-0.6, Math.min(0.6, panel.oy));
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('dragover', (e) => { e.preventDefault(); canvas.classList.add('dropping'); });
canvas.addEventListener('dragleave', () => canvas.classList.remove('dropping'));
canvas.addEventListener('drop', async (e) => {
  e.preventDefault();
  canvas.classList.remove('dropping');
  const i = panelAt(e.clientX, e.clientY);
  await loadFileIntoPanel(e.dataTransfer.files[0], i < 0 ? selected : i);
});

// Export the cover at a post size, as a PNG download.
function exportCover(w, h) {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, state);
  off.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-city-nights-${w}x${h}.png`;
    a.click();
    setStatus(`Saved vice-city-nights-${w}x${h}.png`);
  }, 'image/png');
}
sizeButtons.forEach((btn) => {
  btn.addEventListener('click', () => exportCover(Number(btn.dataset.w), Number(btn.dataset.h)));
});

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), async (photos, text) => {
    photos.forEach((img, i) => { state.panels[i].img = img; state.panels[i].name = 'Sample photo'; });
    // A tall cover's panels are wide, short strips: a portrait photo's
    // cover-fit would centre on the torso, so nudge each panel's frame
    // upward to keep faces in view.
    if (canvas.height > canvas.width) {
      state.panels[0].oy = 0.62;
      state.panels[1].oy = 0.30;
      state.panels[2].oy = 0.58;
    }
    state.caption = text;
    captionInput.value = text;
    redraw();
    renderPanelCards();
  });
} else {
  renderPanelCards();
  redraw();
}
