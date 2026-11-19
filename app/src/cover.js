// Vice City Nights — the cover painter.
// Draws a three-panel comic-strip cover onto any canvas: a skyline at dusk on
// top, a car-chase street in the middle, a hero portrait at the bottom (or, on
// a wide canvas, the same three panels side by side). Every panel gets its own
// photo, pan and zoom; a magenta-orange sunset grade, halftone dots and grain
// tie the panels together; bold outlined caption lettering sits on a banner.

export const PANEL_LABELS = ['Skyline at dusk', 'Car-chase street', 'Hero portrait'];

/** Seeded pseudo-random generator, so the grain looks the same every paint. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The three panel rectangles for a cover of size w x h, with gutters. */
export function panelRects(w, h) {
  const g = Math.max(6, Math.round(Math.min(w, h) * 0.014));
  if (w >= h) {
    const cw = (w - g * 4) / 3;
    return [0, 1, 2].map((i) => ({ x: g + i * (cw + g), y: g, w: cw, h: h - g * 2 }));
  }
  const rows = [0.30, 0.36, 0.34];
  let y = g;
  return rows.map((frac) => {
    const r = { x: g, y, w: w - g * 2, h: (h - g * 4) * frac };
    y += r.h + g;
    return r;
  });
}

/** Cover-fits one photo into a panel rect, honouring zoom and pan offsets. */
function drawPanelPhoto(ctx, img, rect, zoom, ox, oy) {
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * (zoom || 1);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = rect.x + (rect.w - dw) / 2 + (ox || 0) * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + (oy || 0) * rect.h;
  ctx.drawImage(img, dx, dy, dw, dh);
}

/** A warm sunset wash, stronger toward the bottom of the panel. */
function sunsetWash(ctx, rect, strength) {
  const wash = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  wash.addColorStop(0, `rgba(255, 140, 60, ${0.10 * strength})`);
  wash.addColorStop(0.55, `rgba(255, 80, 140, ${0.16 * strength})`);
  wash.addColorStop(1, `rgba(120, 20, 110, ${0.34 * strength})`);
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

/** Halftone dots fading in from one corner of a panel. */
function halftone(ctx, rect, seed) {
  const rnd = mulberry32(seed);
  const step = Math.max(10, rect.w / 46);
  ctx.fillStyle = 'rgba(20, 8, 30, 0.35)';
  for (let y = rect.y + rect.h - step; y < rect.y + rect.h; y += step) {
    for (let x = rect.x; x < rect.x + rect.w; x += step) {
      const depth = (y - rect.y) / rect.h;
      if (rnd() < depth * depth * 0.9) {
        const r = step * 0.16 + depth * step * 0.22;
        ctx.beginPath();
        ctx.arc(x + step / 2, y + step / 2, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/** A low sun disc with a glow, drawn in the first panel. */
function sunDisc(ctx, rect) {
  const cx = rect.x + rect.w * 0.78;
  const cy = rect.y + rect.h * 0.42;
  const r = Math.min(rect.w, rect.h) * 0.26;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.2);
  glow.addColorStop(0, 'rgba(255, 190, 90, 0.55)');
  glow.addColorStop(1, 'rgba(255, 120, 60, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const disc = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  disc.addColorStop(0, '#ffe9a8');
  disc.addColorStop(0.5, '#ff9e4d');
  disc.addColorStop(1, '#ff4d7e');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Retro slats cut across the lower half of the sun.
  ctx.fillStyle = 'rgba(43, 24, 56, 0.85)';
  for (let i = 0; i < 4; i++) {
    const sy = cy + r * (0.08 + i * 0.22);
    ctx.fillRect(cx - r, sy, r * 2, r * 0.07);
  }
}

/** Fine grain over the whole cover, from a fixed seed. */
function grain(ctx, w, h) {
  const rnd = mulberry32(20261119);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  for (let i = 0; i < 900; i++) {
    ctx.fillRect(rnd() * w, rnd() * h, 2, 2);
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
  for (let i = 0; i < 700; i++) {
    ctx.fillRect(rnd() * w, rnd() * h, 2, 2);
  }
}

/** Bold caption lettering with outline and drop shadow, fitted to the width. */
function drawCaption(ctx, w, h, state) {
  const text = (state.caption || '').trim().toUpperCase();
  if (!text) return;
  const wide = w >= h;
  const bandH = h * (wide ? 0.20 : 0.13);
  const bandY = h - bandH;
  const band = ctx.createLinearGradient(0, bandY, 0, h);
  band.addColorStop(0, 'rgba(20, 6, 32, 0)');
  band.addColorStop(1, 'rgba(20, 6, 32, 0.88)');
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, w, bandH);
  const maxW = w * 0.92;
  let size = (state.captionSize || 96) * (Math.min(w, h) / 1080);
  size = Math.min(size, h * (wide ? 0.13 : 0.085));
  ctx.font = `900 ${size}px system-ui, sans-serif`;
  while (ctx.measureText(text).width > maxW && size > 14) {
    size -= 2;
    ctx.font = `900 ${size}px system-ui, sans-serif`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = w / 2;
  const cy = bandY + bandH * 0.58;
  const outline = Math.max(2, size * (state.outlineWidth ?? 0.09));
  ctx.lineJoin = 'round';
  ctx.strokeStyle = state.outlineColor || '#1a0b26';
  ctx.lineWidth = outline;
  ctx.shadowColor = state.shadow === false ? 'transparent' : 'rgba(255, 60, 140, 0.55)';
  ctx.shadowBlur = size * 0.16;
  ctx.shadowOffsetY = size * 0.05;
  ctx.strokeText(text, cx, cy);
  ctx.fillStyle = state.captionColor || '#ffffff';
  ctx.fillText(text, cx, cy);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  // A thin neon underline under the caption.
  const tw = ctx.measureText(text).width;
  const under = ctx.createLinearGradient(cx - tw / 2, 0, cx + tw / 2, 0);
  under.addColorStop(0, '#ff9e4d');
  under.addColorStop(0.5, '#ff4d7e');
  under.addColorStop(1, '#c94dff');
  ctx.fillStyle = under;
  ctx.fillRect(cx - tw / 2, cy + size * 0.62, tw, Math.max(3, size * 0.045));
}

/**
 * Paints the whole cover. `state` holds panels (each {img, zoom, ox, oy}),
 * caption, captionSize, captionColor, outlineColor, outlineWidth and shadow.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.save();
  ctx.fillStyle = '#1a0b26';
  ctx.fillRect(0, 0, w, h);
  const rects = panelRects(w, h);
  const fallback = ['#3d1a5e', '#57204a', '#2b1838'];
  rects.forEach((rect, i) => {
    const panel = (state.panels && state.panels[i]) || {};
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (panel.img) {
      drawPanelPhoto(ctx, panel.img, rect, panel.zoom, panel.ox, panel.oy);
    } else {
      const base = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      base.addColorStop(0, fallback[i]);
      base.addColorStop(1, '#12081d');
      ctx.fillStyle = base;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    if (i === 0) sunDisc(ctx, rect);
    sunsetWash(ctx, rect, 1);
    halftone(ctx, rect, 1000 + i * 77);
    ctx.restore();
    ctx.strokeStyle = '#f5eefc';
    ctx.lineWidth = Math.max(3, Math.min(w, h) * 0.006);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.003);
    ctx.strokeRect(rect.x + 4, rect.y + 4, rect.w - 8, rect.h - 8);
    // Small panel tag, comic-strip style.
    const tag = PANEL_LABELS[i].toUpperCase();
    const fs = Math.max(11, Math.min(w, h) * 0.016);
    ctx.font = `800 ${fs}px system-ui, sans-serif`;
    const tw = ctx.measureText(tag).width + fs * 1.2;
    ctx.fillStyle = '#ff4d7e';
    ctx.fillRect(rect.x, rect.y, tw, fs * 1.9);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, rect.x + fs * 0.6, rect.y + fs * 0.98);
  });
  // Vignette to pull the eye to the middle panel.
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(10, 4, 20, 0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  grain(ctx, w, h);
  drawCaption(ctx, w, h, state);
  ctx.restore();
}
