import { describe, expect, it } from 'vitest';
import { getActionMode } from '../lib/actions.js';

const players = (...defs) => defs.map(([id, alive = true, role = null]) => ({ id, name: id, alive, role }));
const view = (over) => ({
  youId: 'me', round: 1, phase: 'day_vote', private: {}, day: { tied: [] },
  you: { role: 'civilian', alive: true },
  players: players(['me'], ['a'], ['b'], ['dead', false]),
  ...over,
});

describe('getActionMode', () => {
  it('civilians have no night action; dead players never act', () => {
    expect(getActionMode(view({ phase: 'night_mafia' }))).toBeNull();
    expect(getActionMode(view({ you: { role: 'civilian', alive: false } }))).toBeNull();
  });

  it('day vote excludes self and the dead, allows abstain', () => {
    const m = getActionMode(view({ private: { myVote: 'a' } }));
    expect(m.targets.sort()).toEqual(['a', 'b']);
    expect(m.selected).toBe('a');
    expect(m.allowAbstain).toBe(true);
    expect(getActionMode(view({ private: { myVote: null } })).abstained).toBe(true);
  });

  it('revote only offers tied players', () => {
    const m = getActionMode(view({ phase: 'day_revote', day: { tied: ['b'] } }));
    expect(m.targets).toEqual(['b']);
  });

  it('mafia cannot target their partner', () => {
    const m = getActionMode(view({
      phase: 'night_mafia', you: { role: 'mafia', alive: true },
      players: players(['me', true, 'mafia'], ['pal', true, 'mafia'], ['x']),
    }));
    expect(m.targets).toEqual(['x']);
  });

  it('doctor may protect self; detective cannot, and locks after one check', () => {
    const doc = getActionMode(view({ phase: 'night_doctor', you: { role: 'doctor', alive: true } }));
    expect(doc.targets).toContain('me');
    const det = getActionMode(view({
      phase: 'night_detective', you: { role: 'detective', alive: true },
      private: { findings: [{ round: 1, target: 'a', isMafia: true }] },
    }));
    expect(det.targets).not.toContain('me');
    expect(det.locked).toBe(true);
    expect(det.result.isMafia).toBe(true);
  });
});
