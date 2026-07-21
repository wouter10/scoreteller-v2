import { el, createButton, showToast, registerScreen } from '../ui.js';
import { getPlayers, getGames, PLAYER_COLORS } from '../data.js';

export function registerNewSessionScreen(navigate, startSession) {
  registerScreen('new-session', () => {
    const players = getPlayers();
    const games = getGames();
    const selectedPlayerIds = new Set();
    let selectedGame = games[0] ?? null;

    const wrap = el('div', { className: 'screen' });

    const header = el('div', { className: 'screen-header' });
    const btnBack = el('button', { className: 'btn-back', onClick: () => navigate('home') });
    btnBack.textContent = '←';
    const title = el('h1');
    title.textContent = 'Nieuwe sessie';
    header.append(btnBack, title);

    const body = el('div', { className: 'screen-body' });

    /* Game selection */
    const gameTitle = el('p', { className: 'section-title' });
    gameTitle.textContent = 'Spel';
    const gameList = el('div', { className: 'list' });

    function renderGames() {
      gameList.innerHTML = '';
      for (const game of games) {
        const item = el('button', {
          className: `list-item${selectedGame?.id === game.id ? ' list-item--selected' : ''}`,
          onClick: () => { selectedGame = game; renderGames(); },
          style: { background: selectedGame?.id === game.id ? 'var(--bg-raised)' : 'var(--bg-card)', width: '100%', textAlign: 'left', border: selectedGame?.id === game.id ? '2px solid var(--accent)' : '2px solid transparent' },
        });
        const dot = el('div', { className: 'color-dot', style: { background: 'var(--accent)' } });
        const nameEl = el('span', { style: { flex: '1', fontWeight: '600' } });
        nameEl.textContent = game.name;
        const maxEl = el('span', { className: 'text-muted text-sm' });
        maxEl.textContent = `Max ${game.maxPoints} punten`;
        item.append(dot, nameEl, maxEl);
        gameList.appendChild(item);
      }
    }
    renderGames();

    /* Player selection */
    const playerTitle = el('p', { className: 'section-title mt-24' });
    playerTitle.textContent = 'Spelers';
    const playerList = el('div', { className: 'list' });

    if (players.length === 0) {
      const empty = el('div', { className: 'empty-state' });
      empty.innerHTML = '<p>Geen spelers gevonden.<br>Voeg eerst spelers toe.</p>';
      playerList.appendChild(empty);
    }

    function renderPlayers() {
      playerList.innerHTML = '';
      for (const p of players) {
        const selected = selectedPlayerIds.has(p.id);
        const item = el('button', {
          className: 'list-item',
          style: {
            width: '100%',
            textAlign: 'left',
            background: selected ? 'var(--bg-raised)' : 'var(--bg-card)',
            border: selected ? '2px solid var(--accent)' : '2px solid transparent',
          },
          onClick: () => {
            if (selected) selectedPlayerIds.delete(p.id);
            else selectedPlayerIds.add(p.id);
            renderPlayers();
          },
        });
        const dot = el('div', { className: 'color-dot', style: { background: p.color } });
        const name = el('span', { style: { flex: '1', fontWeight: '600' } });
        name.textContent = p.name;
        const check = el('span');
        check.textContent = selected ? '✓' : '';
        item.append(dot, name, check);
        playerList.appendChild(item);
      }
    }
    renderPlayers();

    const btnAddPlayer = createButton('+ Speler toevoegen', () => navigate('players'), 'btn btn--ghost btn--full mt-12');

    body.append(gameTitle, gameList, playerTitle, playerList, btnAddPlayer);

    const footer = el('div', { className: 'screen-footer' });
    const btnStart = createButton('Sessie starten', async () => {
      if (!selectedGame) { showToast('Kies een spel', 'error'); return; }
      if (selectedPlayerIds.size < 2) { showToast('Kies minimaal 2 spelers', 'error'); return; }

      btnStart.disabled = true;
      btnStart.textContent = 'Bezig…';
      try {
        const chosenPlayers = players.filter(p => selectedPlayerIds.has(p.id));
        const code = await startSession(selectedGame, chosenPlayers);
        navigate('scoreboard', { code });
      } catch (err) {
        showToast('Kon sessie niet aanmaken: ' + err.message, 'error');
        btnStart.disabled = false;
        btnStart.textContent = 'Sessie starten';
      }
    });
    footer.appendChild(btnStart);

    wrap.append(header, body, footer);
    return wrap;
  });
}
