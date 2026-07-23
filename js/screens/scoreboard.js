import { el, createButton, showToast, showDelta, registerScreen } from '../ui.js';
import { computeTotals, getEliminatedIds, checkGameOver } from '../gameLogic.js';
import { fetchSession, fetchSessionPlayers, fetchRounds, submitRound, deleteLastRound, updateRoundScore, subscribeToSession, unsubscribe } from '../supabase.js';

export function registerScoreboardScreen(navigate, onSessionEnd) {
  registerScreen('scoreboard', ({ code }) => {
    const wrap = el('div', { className: 'screen' });
    wrap.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

    let session, players, rounds, channel;
    let pendingScores = {};
    let showHistory = false;
    let currentRoundNumber = null;

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
      currentRoundNumber = rounds.length + 1;
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

      if (roundNumber !== currentRoundNumber) {
        for (const p of players) pendingScores[p.id] = 0;
        currentRoundNumber = roundNumber;
      }

      /* Header */
      const header = el('div', { className: 'scoreboard-header' });
      const btnBack = el('button', { className: 'btn-back', onClick: () => { unsubscribe(channel); navigate('home'); } });
      btnBack.textContent = '←';
      const gameLabel = el('span', { style: { flex: '1', fontWeight: '600', fontSize: '1rem' } });
      gameLabel.textContent = session.game_name;

      header.append(btnBack, gameLabel);

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

      /* History toggle + section */
      const historyBtn = createButton(
        showHistory ? 'Verberg geschiedenis ▴' : 'Geschiedenis ▾',
        () => { showHistory = !showHistory; render(); },
        'btn btn--ghost btn--full history-toggle'
      );

      let historySection = null;
      if (showHistory) {
        historySection = el('div', { className: 'history-section' });
        if (!rounds.length) {
          const empty = el('p', { className: 'text-muted text-sm' });
          empty.textContent = 'Nog geen rondes gespeeld.';
          historySection.appendChild(empty);
        } else {
          for (const round of [...rounds].reverse()) {
            const roundCard = el('div', { className: 'history-round' });
            const title = el('p', { className: 'history-round__title' });
            title.textContent = `Ronde ${round.round_number}`;
            roundCard.appendChild(title);
            for (const s of round.scores) {
              const p = players.find(pl => pl.id === s.session_player_id);
              const row = el('div', { className: 'history-round__row' });
              const dot = el('div', { className: 'color-dot', style: { background: p ? p.color : '#888' } });
              const name = el('span');
              name.textContent = p ? p.name : '?';
              const pts = el('button', { className: 'history-round__value', onClick: () => openNumpad({
                title: `${p ? p.name : '?'} — Ronde ${round.round_number}`,
                initialValue: s.points,
                maxPoints: session.max_points,
                onConfirm: async (value) => {
                  try {
                    await updateRoundScore(round.id, s.session_player_id, value);
                    rounds = await fetchRounds(session.id);
                  } catch (err) {
                    showToast('Fout bij bewerken: ' + err.message, 'error');
                  }
                  render();
                },
              }) });
              pts.textContent = s.points;
              row.append(dot, name, pts);
              roundCard.appendChild(row);
            }
            historySection.appendChild(roundCard);
          }
        }
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
          pendingScores[p.id] = (pendingScores[p.id] ?? 0) - 1;
          valueEl.textContent = pendingScores[p.id];
        }});
        btnMinus.textContent = '−';

        const valueEl = el('button', { className: 'round-input-row__value', onClick: () => openNumpad({
          title: p.name,
          initialValue: pendingScores[p.id] ?? 0,
          maxPoints: session.max_points,
          onConfirm: (value) => {
            pendingScores[p.id] = value;
            valueEl.textContent = value;
          },
        }) });
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

          /* Show deltas + Pelt-melding */
          const peltThreshold = session.max_points - 1;
          for (const p of players) {
            const before = prevTotals[p.id] ?? 0;
            const after  = newTotals[p.id] ?? 0;
            const delta  = after - before;
            if (delta && cardEls[p.id]) showDelta(cardEls[p.id], delta);
            if (after === peltThreshold && before !== peltThreshold) {
              showToast(`${p.name} staat op Pelt`, 'warning');
            }
          }

          if (checkGameOver(newTotals, session.max_points)) {
            unsubscribe(channel);
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
          unsubscribe(channel);
          onSessionEnd(session, players, rounds);
        }
      }, 'btn btn--danger btn--icon', );
      endBtn.style.minWidth = 'auto';
      endBtn.style.padding = '0 16px';
      endBtn.textContent = 'Beëindigen';
      footer.appendChild(endBtn);

      wrap.append(header, grid, historyBtn);
      if (historySection) wrap.appendChild(historySection);
      wrap.append(inputSection, controls, footer);
    }

    function openNumpad({ title: titleText, initialValue, maxPoints, onConfirm }) {
      let typed = '';
      let negative = (initialValue ?? 0) < 0;

      const overlay = el('div', { className: 'numpad-overlay', onClick: (e) => { if (e.target === overlay) close(); } });
      const card = el('div', { className: 'numpad-card' });
      const title = el('p', { className: 'numpad-card__title' });
      title.textContent = titleText;
      const display = el('p', { className: 'numpad-display' });

      function updateDisplay() {
        const shown = typed || '0';
        display.textContent = negative ? `-${shown}` : shown;
      }
      updateDisplay();

      const grid = el('div', { className: 'numpad-grid' });
      for (const digit of ['1','2','3','4','5','6','7','8','9','±','0','⌫']) {
        const btn = el('button', { onClick: () => {
          if (digit === '⌫') { typed = typed.slice(0, -1); }
          else if (digit === '±') { negative = !negative; }
          else { typed = (typed + digit).replace(/^0+(?=\d)/, ''); }
          updateDisplay();
        }});
        btn.textContent = digit;
        grid.appendChild(btn);
      }

      const actions = el('div', { className: 'numpad-actions' });
      const btnCancel = createButton('Annuleren', () => close(), 'btn btn--ghost btn--full');
      const btnOk = createButton('Bevestigen ✓', () => {
        let value = typed ? parseInt(typed, 10) : 0;
        if (negative) value = -value;
        value = Math.min(value, maxPoints);
        onConfirm(value);
        close();
      }, 'btn btn--primary btn--full');
      actions.append(btnCancel, btnOk);

      card.append(title, display, grid, actions);
      overlay.appendChild(card);

      function close() { overlay.remove(); }

      document.body.appendChild(overlay);
    }

    init();
    return wrap;
  });
}
