const screenRegistry = new Map();

export function registerScreen(name, renderFn) {
  screenRegistry.set(name, renderFn);
}

export function renderScreen(name, params = {}) {
  const fn = screenRegistry.get(name);
  if (!fn) { console.error('Onbekend scherm:', name); return; }
  const app = document.getElementById('app');
  app.innerHTML = '';
  app.appendChild(fn(params));
}

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') node.className = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k === 'dataset' && typeof v === 'object') Object.assign(node.dataset, v);
    else node.setAttribute(k, v);
  }
  for (const child of children) {
    if (child == null) continue;
    node.append(typeof child === 'string' ? child : child);
  }
  return node;
}

export function createButton(label, onClick, className = 'btn btn--primary btn--full') {
  const btn = el('button', { className, onClick });
  btn.textContent = label;
  return btn;
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let toastTimer;
export function showToast(message, type = '') {
  const container = document.getElementById('toast-container');
  const toast = el('div', { className: `toast${type ? ` toast--${type}` : ''}` });
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

export function showDelta(playerCardEl, delta) {
  if (!delta) return;
  const span = el('span', { className: 'score-delta' });
  span.textContent = delta > 0 ? `+${delta}` : String(delta);
  playerCardEl.style.position = 'relative';
  playerCardEl.appendChild(span);
  setTimeout(() => span.remove(), 1200);
}
