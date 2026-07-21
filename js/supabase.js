import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/esm/index.js';

const SUPABASE_URL  = 'https://veijzncqjhqvyqbjrdgw.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlaWp6bmNxamhxdnlxYmpyZGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NDMyNTgsImV4cCI6MjEwMDIxOTI1OH0.E8C4K1kNyrg-jDDeOiLFgIb0L_RBAXM3-m_9-QaNkcs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

/* ── Sessions ───────────────────────────────────────── */
export async function createSession(code, gameName, maxPoints) {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ code, game_name: gameName, max_points: maxPoints })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchSession(code) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('code', code)
    .single();
  if (error) throw error;
  return data;
}

export async function endSession(sessionId) {
  const { error } = await supabase
    .from('sessions')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (error) throw error;
}

/* ── Session players ────────────────────────────────── */
export async function createSessionPlayers(sessionId, players) {
  const rows = players.map((p, i) => ({
    session_id: sessionId,
    name: p.name,
    color: p.color,
    position: i,
  }));
  const { data, error } = await supabase
    .from('session_players')
    .insert(rows)
    .select();
  if (error) throw error;
  return data;
}

export async function fetchSessionPlayers(sessionId) {
  const { data, error } = await supabase
    .from('session_players')
    .select('*')
    .eq('session_id', sessionId)
    .order('position');
  if (error) throw error;
  return data;
}

/* ── Rounds ─────────────────────────────────────────── */
export async function submitRound(sessionId, roundNumber, scores) {
  const { data: round, error: roundErr } = await supabase
    .from('rounds')
    .insert({ session_id: sessionId, round_number: roundNumber })
    .select()
    .single();
  if (roundErr) throw roundErr;

  const scoreRows = scores.map(s => ({
    round_id: round.id,
    session_player_id: s.sessionPlayerId,
    points: s.points,
  }));
  const { error: scoresErr } = await supabase.from('round_scores').insert(scoreRows);
  if (scoresErr) throw scoresErr;

  return round;
}

export async function fetchRounds(sessionId) {
  const { data: rounds, error: roundsErr } = await supabase
    .from('rounds')
    .select('id, round_number, created_at')
    .eq('session_id', sessionId)
    .order('round_number');
  if (roundsErr) throw roundsErr;

  if (!rounds.length) return [];

  const { data: scores, error: scoresErr } = await supabase
    .from('round_scores')
    .select('round_id, session_player_id, points')
    .in('round_id', rounds.map(r => r.id));
  if (scoresErr) throw scoresErr;

  return rounds.map(r => ({
    ...r,
    scores: scores.filter(s => s.round_id === r.id),
  }));
}

export async function deleteLastRound(sessionId, roundNumber) {
  const { error } = await supabase
    .from('rounds')
    .delete()
    .eq('session_id', sessionId)
    .eq('round_number', roundNumber);
  if (error) throw error;
}

/* ── Realtime ───────────────────────────────────────── */
export function subscribeToSession(sessionId, callbacks) {
  const channel = supabase.channel(`session-${sessionId}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'rounds',
      filter: `session_id=eq.${sessionId}`,
    }, callbacks.onRoundChange)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'round_scores',
    }, callbacks.onScoreChange)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'sessions',
      filter: `id=eq.${sessionId}`,
    }, callbacks.onSessionChange)
    .subscribe();
  return channel;
}

export function unsubscribe(channel) {
  if (channel) supabase.removeChannel(channel);
}
