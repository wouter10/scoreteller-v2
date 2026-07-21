import { el, createButton, showToast, showDelta, registerScreen } from '../ui.js';
import { computeTotals, getEliminatedIds, checkGameOver } from '../gameLogic.js';
import { fetchSession, fetchSessionPlayers, fetchRounds, submitRound, deleteLastRound, subscribeToSession, unsubscribe } from '../supabase.js';

export function registerScoreboardScreen(navigate, onSessionEnd) {
  registerScreen('scoreboard', ({ code }) => {
    const wrap = el('div', { className: 'screen' });
    wrap.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

    let session, players, rounds, channel;
    let pendingScores = {};

    async function load() {
      session = await fetchSession(code);
      players = await fetchSessionPlayers(session.id);
      rounds  = await fetchRounds(session.id);
    }

    async function init() {
      try { await load(); } catch (e) {
        wrap.innerHTML = '';
        const msg = el('div', { className: 'empty-state', style: { padding: '40px 24px' } });
        msg.innerHTML = `<p>Sessie niet gevonden.<br>Controleer de code en probeer opnieuw.</p>`;
        const btn = createButton('Terug', () => navigate('home'), 'btn btn--secondary btn--full mt-16');
        msg.appendChild(btn);
        wrap.appendChild(msg);
        return;
      }

      if (session.status === 'ended') {
        navigate('end', { session, players, rounds });
        return;
      }

      pendingScores = {};
      for (const p of players) pendingScores[p.id] = 0;
      render();

      channel = subscribeToSession(session.id, {
        onRoundChange: async () => { rounds = await fetchRounds(session.id); render(); },
        onScoreChange: async () => { rounds = await fetchRounds(session.id); render(); },
        onSessionChange: async (payload) => {
          if (payload.new?.status === 'ended') {
            unsubscribe(channel);
            onSessionEnd(session, players, rounds);
          }
        },
      });
    }

    function render() {
      wrap.innerHTML = '';

      const totals      = computeTotals(players, rounds);
      const eliminated  = getEliminatedIds(totals, session.max_points);
      const roundNumber = rounds.length + 1;

      /* Header */
      const header = el('div', { className: 'scoreboard-header' });
      const btnBack = el('button', { className: 'btn-back', onClick: () => { unsubscribe(channel); navigate('home'); } });
      btnBack.textContent = '←';
      const gameLabel = el('span', { style: { flex: '1', fontWeight: '600', fontSize: '1rem' } });
      gameLabel.textContent = session.game_name;

      const codeBtn = el('button', { className: 'session-code', onClick: () => {
        const url = `${location.origin}?join=${code}`;
        if (navigator.share) navigator.share({ title: 'Scoreteller', text: `Sessie ${code}`, url });
        else { navigator.clipboard.writeText(url).then(() => showToast('Link gekopieerd!')); }
      }});
      codeBtn.textContent = code;

      header.append(btnBack, gameLabel, codeBtn);

      /* Player cards grid */
      const grid = el('div', { className: 'players-grid' });
      const cardEls = {};
      for (const p of players) {
        const isOut = eliminated.includes(p.id);
        const card = el('div', { className: `player-card${isOut ? ' player-card--eliminated' : ''}` });
        const dot  = el('div', { className: 'color-dot', style: { background: p.color, margin: '0 auto' } });
        const name = el('div', { className: 'player-card__name' });
        name.textContent = p.name;
        const score = el('div', { className: 'player-card__score' });
        score.textContent = totals[p.id] ?? 0;
        card.append(dot, name, score);
        if (isOut) {
          const lbl = el('div', { className: 'player-card__eliminated-label' });
          lbl.textContent = 'Uitgespeeld';
          card.appendChild(lbl);
        }
        cardEls[p.id] = card;
        grid.appendChild(card);
      }

      /* Round input rows */
      const inputSection = el('div', { className: 'round-inputs' });
      const roundLabel = el('p', { className: 'section-title' });
      roundLabel.textContent = `Ronde ${roundNumber}`;
      inputSection.appendChild(roundLabel);

      for (const p of players) {
        if (eliminated.includes(p.id)) continue;

        const row = el('div', { className: 'round-input-row' });
        const dot  = el('div', { className: 'color-dot', style: { background: p.color } });
        const name = el('span', { className: 'round-input-row__name' });
        name.textContent = p.name;

        const btnMinus = el('button', { className: 'pill-btn', onClick: () => {
          if (pendingScores[p.id] > 0) { pendingScores[p.id]--; valueEl.textContent = pendingScores[p.id]; }
        }});
        btnMinus.textContent = '−';

        const valueEl = el('span', { className: 'round-input-row__value' });
        valueEl.textContent = pendingScores[p.id] ?? 0;

        const btnPlus = el('button', { className: 'pill-btn', onClick: () => {
          if ((pendingScores[p.id] ?? 0) < session.max_points) {
            pendingScores[p.id] = (pendingScores[p.id] ?? 0) + 1;
            valueEl.textContent = pendingScores[p.id];
          }
        }});
        btnPlus.textContent = '+';

        row.append(dot, name, btnMinus, valueEl, btnPlus);
        inputSection.appendChild(row);
      }

      /* Confirm / clear controls */
      const controls = el('div', { className: 'round-controls' });

      const btnConfirm = createButton('Bevestigen ✓', async () => {
        btnConfirm.disabled = true;
        const scores = players
          .filter(p => !eliminated.includes(p.id))
          .map(p => ({ sessionPlayerId: p.id, points: pendingScores[p.id] ?? 0 }));

        const prevTotals = { ...totals };

        try {
          await submitRound(session.id, roundNumber, scores);
          rounds = await fetchRounds(session.id);
          const newTotals = computeTotals(players, rounds);

          /* Show deltas */
          for (const p of players) {
            const delta = (newTotals[p.id] ?? 0) - (prevTotals[p.id] ?? 0);
            if (delta && cardEls[p.id]) showDelta(cardEls[p.id], delta);
          }

          if (checkGameOver(newTotals, session.max_points)) {
            onSessionEnd(session, players, rounds);
            return;
          }
        } catch (err) {
          showToast('Fout bij opslaan: ' + err.message, 'error');
        }
        render();
      });

      const btnClear = createButton('Wis invoer', () => {
        for (const p of players) pendingScores[p.id] = 0;
        render();
      }, 'btn btn--ghost');

      const btnUndo = createButton('Ongedaan maken', async () => {
        if (!rounds.length) { showToast('Geen rondes om te wissen', 'error'); return; }
        btnUndo.disabled = true;
        try {
          const last = rounds[rounds.length - 1];
          await deleteLastRound(session.id, last.round_number);
          rounds = await fetchRounds(session.id);
        } catch (err) {
          showToast('Fout bij ongedaan maken: ' + err.message, 'error');
        }
        render();
      }, 'btn btn--ghost');

      controls.append(btnConfirm, btnClear);

      const footer = el('div', { className: 'screen-footer' });
      footer.append(btnUndo, el('div', { style: { flex: '1' } }));

      const endBtn = createButton('Sessie beëindigen', () => {
        if (confirm('Sessie beëindigen? Dit kan niet ongedaan worden gemaakt.')) {
          onSessionEnd(session, players, rounds);
        }
      }, 'btn btn--danger btn--icon', );
      endBtn.style.minWidth = 'auto';
      endBtn.style.padding = '0 16px';
      endBtn.textContent = 'Beëindigen';
      footer.appendChild(endBtn);

      wrap.append(header, grid, inputSection, controls, footer);
    }

    init();
    return wrap;
  });
}
