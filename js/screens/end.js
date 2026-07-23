import { el, createButton, registerScreen } from '../ui.js';
import { buildSessionResult } from '../gameLogic.js';
import { addSessionToHistory } from '../data.js';

const savedSessionIds = new Set();

export function registerEndScreen(navigate) {
  registerScreen('end', ({ session, players, rounds }) => {
    const result = buildSessionResult(session, players, rounds);
    if (!savedSessionIds.has(session.id)) {
      savedSessionIds.add(session.id);
      addSessionToHistory(result);
    }

    const wrap = el('div', { className: 'screen' });

    const header = el('div', { className: 'screen-header' });
    const title = el('h1');
    title.textContent = 'Eindstand';
    header.appendChild(title);

    const body = el('div', { className: 'screen-body' });

    const podium = el('div', { className: 'podium' });

    const medals = ['🥇', '🥈', '🥉'];
    for (const item of result.ranking) {
      const row = el('div', { className: 'podium-item' });
      const rank = el('div', { className: 'podium-item__rank' });
      rank.textContent = medals[item.rank - 1] ?? item.rank;
      const dot = el('div', { className: 'color-dot', style: { background: item.color } });
      const name = el('div', { className: 'podium-item__name' });
      name.textContent = item.name;
      const pts = el('div', { className: 'podium-item__score' });
      pts.textContent = `${item.points} pt`;
      row.append(rank, dot, name, pts);
      podium.appendChild(row);
    }

    const meta = el('p', { className: 'text-muted text-sm mt-16', style: { textAlign: 'center' } });
    meta.textContent = `${result.gameName} · ${result.roundCount} rondes`;

    body.append(podium, meta);

    const footer = el('div', { className: 'screen-footer' });
    const btnHome = createButton('Terug naar home', () => navigate('home'));
    footer.appendChild(btnHome);

    wrap.append(header, body, footer);
    return wrap;
  });
}
