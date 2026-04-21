// ===========================
//  Matrix Code Rain — Static DOM Control
//  The HTML is baked into index.html, this module just shows/hides it
// ===========================

let el = null;
let currentPhase = 0;

function getEl() {
  if (!el) el = document.getElementById('boss4-matrix');
  return el;
}

export function startMatrixRain(W, H, phase = 1) {
  const m = getEl();
  console.log('[MatrixRain] startMatrixRain called, element:', m, 'phase:', phase);
  if (!m) { console.warn('[MatrixRain] #boss4-matrix NOT FOUND!'); return; }
  currentPhase = phase;
  m.className = 'phase' + phase;
  m.style.display = 'block';
  m.style.opacity = '0';
  // Force reflow then fade in
  void m.offsetWidth;
  m.style.opacity = getOpacity(phase);
  console.log('[MatrixRain] display:', m.style.display, 'opacity:', m.style.opacity);
}

export function updateMatrixPhase(phase) {
  const m = getEl();
  if (!m || phase === currentPhase) return;
  currentPhase = phase;
  m.className = 'phase' + phase;
  m.style.opacity = getOpacity(phase);
}

export function stopMatrixRain() {
  const m = getEl();
  if (!m) return;
  m.style.opacity = '0';
  setTimeout(() => {
    if (m) m.style.display = 'none';
  }, 2200);
  currentPhase = 0;
}

export function destroyMatrixRain() {
  const m = getEl();
  if (!m) return;
  m.style.display = 'none';
  m.style.opacity = '0';
  currentPhase = 0;
}

// drawMatrixRain is kept as a no-op for compatibility
export function drawMatrixRain(scene) {
  // No-op — rain is CSS-animated, not canvas-drawn
}

function getOpacity(phase) {
  switch (phase) {
    case 1: return '0.35';
    case 2: return '0.50';
    case 3: return '0.70';
    default: return '0.35';
  }
}
