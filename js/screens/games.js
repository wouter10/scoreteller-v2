import { el, createButton, showToast, registerScreen } from '../ui.js';
import { getGames, addGame, updateGame, deleteGame } from '../data.js';

export function registerGamesScreen(navigate) {
  registerScreen('games', () => {
    let games = getGames();
    let editingId = null;
    let newName = '';
    let newMax = 10;

    const wrap = el('div', { className: 'screen' });

    const header = el('div', { className: 'screen-header' });
    const btnBack = el('button', { className: 'btn-back', onClick: () => navigate('home') });
    btnBack.textContent = '←';
    const title = el('h1');
    title.textContent = 'Spellen';
    header.append(btnBack, title);

    const body = el('div', { className: 'screen-body' });

    function render() {
      body.innerHTML = '';
      games = getGames();

      const listLabel = el('p', { className: 'section-title' });
      listLabel.textContent = 'Spellenlijst';
      body.appendChild(listLabel);

      const list = el('div', { className: 'list' });
      for (const g of games) {
        const item = el('div', { className: 'list-item' });
        const name = el('span', { style: { flex: '1', fontWeight: '600' } });
        name.textContent = g.name;
        const pts = el('span', { className: 'text-muted text-sm' });
        pts.textContent = `Max ${g.maxPoints} pt`;

        const btnEdit = el('button', { className: 'btn btn--ghost btn--icon', onClick: () => {
          editingId = g.id; newName = g.name; newMax = g.maxPoints; render();
        }});
        btnEdit.textContent = '✎';

        const btnDel = el('button', { className: 'btn btn--ghost btn--icon', style: { color: 'var(--danger)' }, onClick: () => {
          if (games.length <= 1) { showToast('Minimaal één spel vereist', 'error'); return; }
          if (confirm(`"${g.name}" verwijderen?`)) { deleteGame(g.id); render(); }
        }});
        btnDel.textContent = '✕';

        item.append(name, pts, btnEdit, btnDel);
        list.appendChild(item);
      }
      body.appendChild(list);

      /* Form */
      const form = el('div', { className: 'card mt-16' });
      const formLabel = el('p', { className: 'section-title' });
      formLabel.textContent = editingId ? 'Spel bewerken' : 'Nieuw spel';
      form.appendChild(formLabel);

      const nameInput = el('input', { type: 'text', placeholder: 'Naam', maxlength: '30' });
      nameInput.value = newName;
      nameInput.addEventListener('input', e => { newName = e.target.value; });

      const maxLabel = el('p', { className: 'text-muted text-sm mt-12' });
      maxLabel.textContent = 'Maximaal punten';
      const maxInput = el('input', { type: 'number', min: '2', max: '999' });
      maxInput.value = newMax;
      maxInput.addEventListener('input', e => { newMax = parseInt(e.target.value, 10); });

      const btnRow = el('div', { className: 'flex gap-10 mt-12' });
      const btnSave = createButton(editingId ? 'Opslaan' : 'Toevoegen', () => {
        const trimmed = newName.trim();
        if (!trimmed) { showToast('Naam mag niet leeg zijn', 'error'); return; }
        if (!newMax || newMax < 2) { showToast('Ongeldig maximum', 'error'); return; }
        if (editingId) updateGame(editingId, { name: trimmed, maxPoints: newMax });
        else addGame(trimmed, newMax);
        editingId = null; newName = ''; newMax = 10;
        render();
      });
      btnRow.appendChild(btnSave);

      if (editingId) {
        const btnCancel = createButton('Annuleren', () => {
          editingId = null; newName = ''; newMax = 10; render();
        }, 'btn btn--ghost');
        btnRow.appendChild(btnCancel);
      }

      form.append(nameInput, maxLabel, maxInput, btnRow);
      body.appendChild(form);
    }

    render();
    wrap.append(header, body);
    return wrap;
  });
}
