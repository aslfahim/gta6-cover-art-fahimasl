// Fixed scenes for screenshots: ?shot=editor shows the editor with sample
// photos loaded; ?shot=cover shows the cover alone at the requested post
// size (?size=landscape 1920x1080, portrait 1080x1350, square 1080x1080).
// `photo` picks the first panel's sample and `caption` the words.
// window.__shotReady is set once the cover has been painted.
import { loadImage } from './main.js';

const SIZES = {
  landscape: [1920, 1080],
  portrait: [1080, 1350],
  square: [1080, 1080],
};

export async function runShot(shot, query, apply) {
  const canvas = document.getElementById('cover');
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const [w, h] = SIZES[query.get('size')] || SIZES.square;
    canvas.width = w;
    canvas.height = h;
  }
  const first = query.get('photo') ?? 'pier';
  const second = first === 'pier' ? 'boulevard' : 'pier';
  const pier = await loadImage(`samples/${first}.jpg`);
  const boulevard = await loadImage(`samples/${second}.jpg`);
  // Skyline and hero panels share the first photo, the chase panel the other.
  await apply([pier, boulevard, pier], query.get('caption') ?? 'VICE CITY NIGHTS');
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
