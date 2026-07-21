import { renderScreen } from './ui.js';
import { setActiveSessionCode, clearActiveSession } from './data.js';
import { createSession, createSessionPlayers, endSession } from './supabase.js';
import { generateSessionCode, buildSessionResult } from './gameLogic.js';
import { addSessionToHistory } from './data.js';

import { registerHomeScreen }       from './screens/home.js';
import { registerNewSessionScreen }  from './screens/newSession.js';
import { registerScoreboardScreen }  from './screens/scoreboard.js';
import { registerEndScreen }         from './screens/end.js';
import { registerPlayersScreen }     from './screens/players.js';
import { registerGamesScreen }       from './screens/games.js';
import { registerStatsScreen }       from './screens/stats.js';

function navigate(screen, params = {}) {
  history.pushState({ screen, params }, '', location.pathname);
  renderScreen(screen, params);
}

async function startSession(game, players) {
  let code;
  let session;
  for (let attempt = 0; attempt < 5; attempt++) {
    code = generateSessionCode();
    try {
      session = await createSession(code, game.name, game.maxPoints);
      break;
    } catch (err) {
      if (err.code !== '23505') throw err; // 23505 = unique_violation
    }
  }
  if (!session) throw new Error('Kon geen unieke sessiecode genereren');

  await createSessionPlayers(session.id, players);
  setActiveSessionCode(code);
  return code;
}

async function handleSessionEnd(session, players, rounds) {
  clearActiveSession();
  try { await endSession(session.id); } catch {}
  navigate('end', { session, players, rounds });
}

window.addEventListener('popstate', (e) => {
  const { screen, params } = e.state ?? { screen: 'home', params: {} };
  renderScreen(screen, params);
});

registerHomeScreen(navigate);
registerNewSessionScreen(navigate, startSession);
registerScoreboardScreen(navigate, handleSessionEnd);
registerEndScreen(navigate);
registerPlayersScreen(navigate);
registerGamesScreen(navigate);
registerStatsScreen(navigate);

/* Handle ?join= URL param */
function boot() {
  const params = new URLSearchParams(location.search);
  const joinCode = params.get('join');
  if (joinCode) {
    history.replaceState({}, '', location.pathname);
    navigate('scoreboard', { code: joinCode.toUpperCase() });
  } else {
    navigate('home');
  }
}

boot();

/* Register service worker */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
