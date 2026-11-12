export const NIGHT_PHASES = new Set(['night_mafia', 'night_doctor', 'night_detective']);
export const isNight = (phase) => NIGHT_PHASES.has(phase);

// Titles are generic on purpose: they must not tell the table which role is acting.
const TITLES = {
  role_reveal: ['🎭', 'Your role', 'Keep it secret.'],
  night_mafia: ['🌙', 'Night', 'The town sleeps. Everyone close your eyes.'],
  night_doctor: ['🌙', 'Night', 'The town sleeps. Everyone close your eyes.'],
  night_detective: ['🌙', 'Night', 'The town sleeps. Everyone close your eyes.'],
  day_announce: ['🌅', 'Dawn', 'Everyone wake up.'],
  day_discussion: ['☀️', 'Discussion', 'Discuss who you suspect.'],
  day_vote: ['🗳️', 'Vote', 'Cast one vote. It is anonymous.'],
  day_revote_discuss: ['⚖️', 'Tie: last words', 'The tied players may defend themselves.'],
  day_revote: ['🗳️', 'Revote', 'Vote among the tied players only.'],
  day_result: ['⚖️', 'Verdict', 'The votes are counted.'],
  game_over: ['🏁', 'Game over', ''],
};

export function phaseTitle(phase) {
  const [emoji, title, subtitle] = TITLES[phase] ?? ['', phase, ''];
  return { emoji, title, subtitle };
}
