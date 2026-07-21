import { el, createButton, showToast, registerScreen, escapeHtml } from '../ui.js';
import { getPlayers, addPlayer, updatePlayer, deletePlayer, PLAYER_COLORS } from '../data.js';

export function registerPlayersScreen(navigate) {
  registerScreen('players', () => {
    let players = getPlayers();
    let editingId = null;
    let newName = '';
    let newColor = PLAYER_COLORS[0];

    const wrap = el('div', { className: 'screen' });

    const header = el('div', { className: 'screen-header' });
    const btnBack = el('button', { className: 'btn-back', onClick: () => navigate('home') });
    btnBack.textContent = '←';
    const title = el('h1');
    title.textContent = 'Spelers';
    header.append(btnBack, title);

    const body = el('div', { className: 'screen-body' });

    function renderColorPicker(selectedColor, onSelect) {
      const picker = el('div', { className: 'color-picker' });
      for (const c of PLAYER_COLORS) {
        const swatch = el('button', {
          className: `color-swatch${c === selectedColor ? ' color-swatch--selected' : ''}`,
          style: { background: c },
          onClick: () => onSelect(c),
        });
        picker.appendChild(swatch);
      }
      return picker;
    }

    function renderForm() {
      const form = el('div', { className: 'card mt-16' });

      const label = el('p', { className: 'section-title' });
      label.textContent = editingId ? 'Speler bewerken' : 'Nieuwe speler';
      form.appendChild(label);

      const nameInput = el('input', { type: 'text', placeholder: 'Naam', value: newName, maxlength: '20' });
      nameInput.addEventListener('input', e => { newName = e.target.value; });
      form.appendChild(nameInput);

      const colorLabel = el('p', { className: 'text-muted text-sm mt-12' });
      colorLabel.textContent = 'Kleur';
      form.appendChild(colorLabel);

      let pickerColor = newColor;
      let pickerEl = renderColorPicker(pickerColor, (c) => {
        pickerColor = c; newColor = c;
        const old = form.querySelector('.color-picker');
        form.replaceChild(renderColorPicker(c, arguments.callee), old);
      });
      form.appendChild(pickerEl);

      const btnRow = el('div', { className: 'flex gap-10 mt-12' });
      const btnSave = createButton(editingId ? 'Opslaan' : 'Toevoegen', () => {
        const trimmed = newName.trim();
        if (!trimmed) { showToast('Naam mag niet leeg zijn', 'error'); return; }
        if (editingId) updatePlayer(editingId, { name: trimmed, color: newColor });
        else addPlayer(trimmed, newColor);
        editingId = null; newName = ''; newColor = PLAYER_COLORS[0];
        players = getPlayers();
        render();
      });
      btnRow.appendChild(btnSave);

      if (editingId) {
        const btnCancel = createButton('Annuleren', () => {
          editingId = null; newName = ''; newColor = PLAYER_COLORS[0];
          render();
        }, 'btn btn--ghost');
        btnRow.appendChild(btnCancel);
      }
      form.appendChild(btnRow);
      return form;
    }

    function render() {
      body.innerHTML = '';
      players = getPlayers();

      const listLabel = el('p', { className: 'section-title' });
      listLabel.textContent = 'Spelerslijst';
      body.appendChild(listLabel);

      if (!players.length) {
        const empty = el('div', { className: 'empty-state' });
        empty.innerHTML = '<p>Nog geen spelers. Voeg er hieronder een toe.</p>';
        body.appendChild(empty);
      } else {
        const list = el('div', { className: 'list' });
        for (const p of players) {
          const item = el('div', { className: 'list-item' });
          const dot = el('div', { className: 'color-dot', style: { background: p.color } });
          const name = el('span', { style: { flex: '1' } });
          name.textContent = p.name;

          const btnEdit = el('button', { className: 'btn btn--ghost btn--icon', onClick: () => {
            editingId = p.id; newName = p.name; newColor = p.color; render();
          }});
          btnEdit.textContent = '✎';

          const btnDel = el('button', { className: 'btn btn--ghost btn--icon', style: { color: 'var(--danger)' }, onClick: () => {
            if (confirm(`"${p.name}" verwijderen?`)) { deletePlayer(p.id); players = getPlayers(); render(); }
          }});
          btnDel.textContent = '✕';

          item.append(dot, name, btnEdit, btnDel);
          list.appendChild(item);
        }
        body.appendChild(list);
      }

      body.appendChild(renderForm());
    }

    render();
    wrap.append(header, body);
    return wrap;
  });
}
