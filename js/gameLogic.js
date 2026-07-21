export function isValidPoints(points, maxPoints) {
  return Number.isInteger(points) && points >= 0 && points <= maxPoints;
}

export function computeTotals(sessionPlayers, rounds) {
  const totals = {};
  for (const p of sessionPlayers) totals[p.id] = 0;
  for (const round of rounds) {
    for (const score of round.scores) {
      totals[score.session_player_id] = (totals[score.session_player_id] ?? 0) + score.points;
    }
  }
  return totals;
}

export function getEliminatedIds(totals, maxPoints) {
  return Object.entries(totals)
    .filter(([, pts]) => pts >= maxPoints)
    .map(([id]) => id);
}

export function getActivePlayers(sessionPlayers, eliminatedIds) {
  return sessionPlayers.filter(p => !eliminatedIds.includes(p.id));
}

export function checkGameOver(totals, maxPoints) {
  const active = Object.values(totals).filter(pts => pts < maxPoints);
  return active.length <= 1;
}

export function buildSessionResult(session, sessionPlayers, rounds) {
  const totals = computeTotals(sessionPlayers, rounds);
  const ranked = [...sessionPlayers].sort((a, b) => totals[a.id] - totals[b.id]);
  return {
    sessionId:   session.id,
    sessionCode: session.code,
    gameName:    session.game_name,
    maxPoints:   session.max_points,
    playedAt:    session.ended_at ?? new Date().toISOString(),
    roundCount:  rounds.length,
    ranking:     ranked.map((p, i) => ({
      rank:   i + 1,
      name:   p.name,
      color:  p.color,
      points: totals[p.id],
    })),
  };
}

export function generateSessionCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
