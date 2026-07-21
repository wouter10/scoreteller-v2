import { el, createButton, showToast, registerScreen } from '../ui.js';
import { getActiveSessionCode } from '../data.js';

export function registerHomeScreen(navigate) {
  registerScreen('home', () => {
    const resumeCode = getActiveSessionCode();

    const wrap = el('div', { className: 'screen' });

    const logo = el('div', { className: 'home-logo' });
    logo.innerHTML = '<h1>Scoreteller</h1><p>Punten bijhouden voor Toepen en meer</p>';

    const actions = el('div', { className: 'home-actions mt-24' });

    const btnNew = createButton('Nieuwe sessie', () => navigate('new-session'));
    actions.appendChild(btnNew);

    if (resumeCode) {
      const btnResume = createButton(
        `Sessie hervatten (${resumeCode})`,
        () => navigate('scoreboard', { code: resumeCode }),
        'btn btn--secondary btn--full'
      );
      actions.appendChild(btnResume);
    }

    const btnStats = createButton('Statistieken', () => navigate('stats'), 'btn btn--ghost btn--full');
    actions.appendChild(btnStats);

    const joinSection = el('div', { className: 'home-join mt-16' });
    const joinInput = el('input', {
      type: 'text',
      placeholder: 'Sessiecode',
      maxlength: '6',
      autocomplete: 'off',
      spellcheck: 'false',
    });
    const joinBtn = createButton('Deelnemen', () => {
      const code = joinInput.value.trim().toUpperCase();
      if (code.length < 4) { showToast('Voer een geldige sessiecode in', 'error'); return; }
      navigate('scoreboard', { code });
    }, 'btn btn--secondary');

    joinInput.addEventListener('keydown', e => { if (e.key === 'Enter') joinBtn.click(); });

    joinSection.append(joinInput, joinBtn);

    const joinLabel = el('p', { className: 'text-muted text-sm mt-12', style: { textAlign: 'center', padding: '0 16px' } });
    joinLabel.textContent = 'Of voer een sessiecode in om mee te doen';

    wrap.append(logo, actions, joinLabel, joinSection);

    const footer = el('div', { style: { padding: '24px 16px', display: 'flex', gap: '10px', justifyContent: 'center' } });
    const btnPlayers = createButton('Spelers', () => navigate('players'), 'btn btn--ghost');
    const btnGames = createButton('Spellen', () => navigate('games'), 'btn btn--ghost');
    footer.append(btnPlayers, btnGames);
    wrap.appendChild(footer);

    return wrap;
  });
}
