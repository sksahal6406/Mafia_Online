'use client';

import { motion } from 'framer-motion';
import { roleInfo } from '@/lib/roles';

/** Dawn and verdict results, in the host's wording from the rules. */
export default function Announcement({ view }) {
  const { phase, history, players } = view;
  const name = (id) => players.find((p) => p.id === id)?.name ?? '?';
  const last = (type) => [...history].reverse().find((h) => h.type === type);

  let body = null;

  if (phase === 'day_announce') {
    const n = last('night');
    if (!n) return null;
    body = n.victim ? (
      <Elim who={name(n.victim)} role={n.role} verb="was eliminated" />
    ) : (
      <p className="font-display text-3xl">Nobody was eliminated last night.</p>
    );
  }

  if (phase === 'day_result' || phase === 'day_revote_discuss') {
    const v = last('vote');
    if (!v) return null;
    const rows = Object.entries(v.tally).sort((a, b) => b[1] - a[1]);
    body = (
      <>
        {v.victim ? (
          <Elim who={name(v.victim)} role={v.role} verb="was voted out" />
        ) : v.tied.length ? (
          <>
            <p className="font-display text-3xl">The vote is tied.</p>
            <p className="mt-1 text-mute">A revote will take place between {v.tied.map(name).join(' and ')}.</p>
          </>
        ) : (
          <p className="font-display text-3xl">
            {v.revote ? 'Still tied. Nobody is eliminated today.' : 'No votes were cast. Nobody is eliminated.'}
          </p>
        )}
        <ul className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
          {rows.map(([id, n]) => (
            <li key={id} className="rounded-full border border-line bg-panel-2 px-3 py-1">{name(id)}: <b>{n}</b></li>
          ))}
          {v.abstain > 0 && <li className="rounded-full border border-line px-3 py-1 text-mute">Abstained: {v.abstain}</li>}
        </ul>
      </>
    );
  }

  if (!body) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-line bg-panel p-6 text-center">
      {body}
    </motion.div>
  );
}

function Elim({ who, role, verb }) {
  const info = roleInfo(role);
  return (
    <>
      <p className="font-display text-3xl">
        <span className="text-blood">{who}</span> {verb}.
      </p>
      <p className="mt-2 text-lg">
        Their role was <b className={info.color}>{info.emoji} {info.name}</b>.
      </p>
    </>
  );
}
