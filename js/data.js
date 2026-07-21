const KEYS = {
  players:       'st_players',
  games:         'st_games',
  activeSession: 'st_active_session',
  sessions:      'st_sessions_history',
};

export const PLAYER_COLORS = [
  '#e94560', '#4fc3f7', '#81c784', '#ffb74d',
  '#ce93d8', '#80cbc4', '#ff8a65', '#f06292',
];

function load(key) {
  try { return JSON.parse(localStorage.getItem(key)) ?? null; }
  catch { return null; }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/* ── Player library ────────────────────────────────── */
export function getPlayers() { return load(KEYS.players) ?? []; }
export function savePlayers(players) { save(KEYS.players, players); }

export function addPlayer(name, color) {
  const players = getPlayers();
  const player = { id: generateId(), name, color, createdAt: Date.now() };
  players.push(player);
  savePlayers(players);
  return player;
}

export function updatePlayer(id, updates) {
  const players = getPlayers().map(p => p.id === id ? { ...p, ...updates } : p);
  savePlayers(players);
}

export function deletePlayer(id) {
  savePlayers(getPlayers().filter(p => p.id !== id));
}

/* ── Games library ─────────────────────────────────── */
export function getGames() {
  const games = load(KEYS.games);
  if (games) return games;
  const defaults = [{ id: generateId(), name: 'Toepen', maxPoints: 10 }];
  save(KEYS.games, defaults);
  return defaults;
}

export function saveGames(games) { save(KEYS.games, games); }

export function addGame(name, maxPoints) {
  const games = getGames();
  const game = { id: generateId(), name, maxPoints };
  games.push(game);
  saveGames(games);
  return game;
}

export function updateGame(id, updates) {
  saveGames(getGames().map(g => g.id === id ? { ...g, ...updates } : g));
}

export function deleteGame(id) {
  saveGames(getGames().filter(g => g.id !== id));
}

/* ── Active session ref ─────────────────────────────── */
export function getActiveSessionCode() { return load(KEYS.activeSession); }
export function setActiveSessionCode(code) { save(KEYS.activeSession, code); }
export function clearActiveSession() { localStorage.removeItem(KEYS.activeSession); }

/* ── Local session history (voor stats) ────────────── */
export function getSessionHistory() { return load(KEYS.sessions) ?? []; }
export function addSessionToHistory(result) {
  const history = getSessionHistory();
  history.unshift(result);
  save(KEYS.sessions, history.slice(0, 50));
}
