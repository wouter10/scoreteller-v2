import { el, createButton, registerScreen } from '../ui.js';
import { getSessionHistory } from '../data.js';

export function registerStatsScreen(navigate) {
  registerScreen('stats', () => {
    const history = getSessionHistory();

    const wrap = el('div', { className: 'screen' });

    const header = el('div', { className: 'screen-header' });
    const btnBack = el('button', { className: 'btn-back', onClick: () => navigate('home') });
    btnBack.textContent = '←';
    const title = el('h1');
    title.textContent = 'Statistieken';
    header.append(btnBack, title);

    const body = el('div', { className: 'screen-body' });

    if (!history.length) {
      const empty = el('div', { className: 'empty-state' });
      empty.innerHTML = '<p>Nog geen afgesloten sessies.<br>Speel een potje en kom terug!</p>';
      body.appendChild(empty);
    } else {
      for (const session of history) {
        const card = el('div', { className: 'card mt-16' });

        const meta = el('p', { className: 'text-muted text-sm' });
        const date = new Date(session.playedAt);
        meta.textContent = `${session.gameName} · ${date.toLocaleDateString('nl-NL')} · ${session.roundCount} rondes`;
        card.appendChild(meta);

        const rankList = el('div', { className: 'list mt-12' });
        const medals = ['🥇', '🥈', '🥉'];
        for (const item of session.ranking) {
          const row = el('div', { className: 'list-item' });
          const medal = el('span', { style: { fontSize: '1.2rem', minWidth: '24px' } });
          medal.textContent = medals[item.rank - 1] ?? item.rank;
          const dot = el('div', { className: 'color-dot', style: { background: item.color } });
          const name = el('span', { style: { flex: '1', fontWeight: '600' } });
          name.textContent = item.name;
          const pts = el('span', { className: 'text-muted text-sm' });
          pts.textContent = `${item.points} pt`;
          row.append(medal, dot, name, pts);
          rankList.appendChild(row);
        }
        card.appendChild(rankList);
        body.appendChild(card);
      }
    }

    wrap.append(header, body);
    return wrap;
  });
}
