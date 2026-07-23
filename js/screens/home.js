import { el, showToast, registerScreen } from '../ui.js';
import { getActiveSessionCode } from '../data.js';

export function registerHomeScreen(navigate) {
  registerScreen('home', () => {
    const resumeCode = getActiveSessionCode();

    const wrap = el('div', { className: 'screen' });
    const felt = el('div', { className: 'home-felt' });
    const card = el('div', { className: 'home-card' });
    const table = el('div', { className: 'home-table' });

    table.append(
      el('div', { className: 'home-chip home-chip--1', 'aria-hidden': 'true' }),
      el('div', { className: 'home-chip home-chip--2', 'aria-hidden': 'true' })
    );

    const titleWrap = el('div', { className: 'home-title-wrap' },
      el('div', { className: 'home-title' }, 'Scoreteller'),
      el('div', { className: 'home-subtitle-row' },
        el('span', { className: 'home-subtitle-line' }),
        el('span', { className: 'home-subtitle-suit' }, '♣'),
        el('span', { className: 'home-subtitle-text' }, 'Punten bijhouden voor Toepen en meer'),
        el('span', { className: 'home-subtitle-suit' }, '♦'),
        el('span', { className: 'home-subtitle-line home-subtitle-line--r' })
      )
    );

    const btnNew = el('button', {
      className: 'btn--felt-primary',
      onClick: () => navigate('new-session'),
    }, '♣ Nieuwe sessie ♦');

    table.append(titleWrap, btnNew);

    if (resumeCode) {
      const btnResume = el('button', {
        className: 'btn--felt-secondary',
        onClick: () => navigate('scoreboard', { code: resumeCode }),
      }, `Sessie hervatten (${resumeCode})`);
      table.appendChild(btnResume);
    }

    const btnStats = el('button', {
      className: 'home-stats-link',
      onClick: () => navigate('stats'),
    }, 'Statistieken');
    table.appendChild(btnStats);

    const divider = el('div', { className: 'home-divider' },
      el('span', { className: 'home-divider__line' }),
      el('span', { className: 'home-divider__text' }, 'Of voer een sessiecode in om mee te doen'),
      el('span', { className: 'home-divider__line home-divider__line--r' })
    );
    table.appendChild(divider);

    const joinInput = el('input', {
      type: 'text',
      placeholder: 'SESSIECODE',
      maxlength: '6',
      autocomplete: 'off',
      spellcheck: 'false',
    });
    const joinBtn = el('button', { className: 'btn--felt-join' }, 'Deelnemen');
    joinBtn.addEventListener('click', () => {
      const code = joinInput.value.trim().toUpperCase();
      if (code.length < 4) { showToast('Voer een geldige sessiecode in', 'error'); return; }
      navigate('scoreboard', { code });
    });
    joinInput.addEventListener('keydown', e => { if (e.key === 'Enter') joinBtn.click(); });

    const joinRow = el('div', { className: 'home-join-row' }, joinInput, joinBtn);
    table.appendChild(joinRow);

    const linksRow = el('div', { className: 'home-links-row' },
      el('button', { className: 'home-link-btn', onClick: () => navigate('players') },
        el('span', { className: 'home-link-btn__suit' }, '♠'), 'Spelers'
      ),
      el('button', { className: 'home-link-btn', onClick: () => navigate('games') },
        el('span', { className: 'home-link-btn__suit' }, '♥'), 'Spellen'
      )
    );
    table.appendChild(linksRow);

    card.appendChild(table);
    felt.appendChild(card);
    wrap.appendChild(felt);

    return wrap;
  });
}
