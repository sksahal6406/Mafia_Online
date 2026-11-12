/**
 * What can this player do right now? Returns null when nothing is expected of them.
 * { type, title, hint, targets: [ids], selected, locked, allowAbstain, abstained }
 */
export function getActionMode(view) {
  const { you, phase, round, youId, players } = view;
  const priv = view.private ?? {};
  if (!you?.alive) return null;

  const alive = players.filter((p) => p.alive);
  const ids = (list) => list.map((p) => p.id);
  const others = alive.filter((p) => p.id !== youId);

  switch (phase) {
    case 'night_mafia':
      if (you.role !== 'mafia') return null;
      return {
        type: 'mafia_vote',
        title: 'Choose tonight’s victim',
        hint: 'All Mafia must pick the same player, otherwise nobody dies.',
        targets: ids(alive.filter((p) => p.role !== 'mafia')),
        selected: priv.mafiaVotes?.[youId] ?? null,
      };
    case 'night_doctor':
      if (you.role !== 'doctor') return null;
      return {
        type: 'protect',
        title: 'Who do you protect?',
        hint: 'You may protect yourself.',
        targets: ids(alive),
        selected: priv.myProtect ?? null,
      };
    case 'night_detective': {
      if (you.role !== 'detective') return null;
      const found = (priv.findings ?? []).find((f) => f.round === round);
      return {
        type: 'investigate',
        title: 'Who do you investigate?',
        hint: 'You will learn whether they are Mafia.',
        targets: ids(others),
        selected: found?.target ?? null,
        locked: !!found,
        result: found ?? null,
      };
    }
    case 'day_vote':
      return {
        type: 'vote',
        title: 'Cast your vote',
        hint: 'Click a player to eliminate. You can change it until voting closes.',
        targets: ids(others),
        selected: priv.myVote ?? null,
        allowAbstain: true,
        abstained: priv.myVote === null,
      };
    case 'day_revote':
      return {
        type: 'vote',
        title: 'Revote',
        hint: 'Only the tied players can be chosen.',
        targets: ids(others.filter((p) => view.day?.tied?.includes(p.id))),
        selected: priv.myVote ?? null,
        allowAbstain: true,
        abstained: priv.myVote === null,
      };
    default:
      return null;
  }
}
