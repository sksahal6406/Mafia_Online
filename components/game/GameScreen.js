'use client';

import { AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { getActionMode } from '@/lib/actions';
import { isNight } from '@/lib/phases';
import { useGame } from '@/lib/store';
import ActionPanel from './ActionPanel';
import Announcement from './Announcement';
import Chat from './Chat';
import GameOver from './GameOver';
import PhaseBar from './PhaseBar';
import PlayerTile from './PlayerTile';
import RoleCard from './RoleCard';
import RoleReveal from './RoleReveal';
import MediaControls from '../media/MediaControls';
import TileVideo from '../media/TileVideo';
import { useMedia } from '@/lib/webrtc/mediaStore';

const DAY_TALK = new Set(['day_announce', 'day_discussion', 'day_vote', 'day_revote_discuss', 'day_revote', 'day_result']);

export default function GameScreen({ view }) {
  const { act, muteToggle } = useGame();
  const [dismissedOver, setDismissedOver] = useState(false);
  const media = useMedia();
  const night = isNight(view.phase);
  const mode = getActionMode(view);
  const isHost = view.hostId === view.youId;
  const findings = view.private?.findings ?? [];
  const mafiaVotes = view.private?.mafiaVotes ?? {};

  const marksFor = (p) => {
    const marks = [];
    for (const [voter, target] of Object.entries(night ? mafiaVotes : {})) {
      if (target === p.id) marks.push({ label: `🔪 ${view.players.find((x) => x.id === voter)?.name}`, title: 'Mafia vote' });
    }
    for (const f of findings) {
      if (f.target === p.id) marks.push({ label: f.isMafia ? '🔍 Mafia' : '🔍 Clear', title: `Night ${f.round} investigation` });
    }
    return marks;
  };

  // Who do we see on camera? Only people the server lets us receive from.
  const videoFor = (p) => {
    if (!view.media.video) return null;
    if (p.id === view.youId) {
      return media.camOn && media.localVideo && view.media.sendTo.length > 0 ? { stream: media.localVideo, mirror: true } : null;
    }
    const r = media.remote[p.id];
    const on = view.media.receiveFrom.includes(p.id) && media.peerMedia[p.id]?.cam && r?.stream.getVideoTracks().length;
    return on ? { stream: r.stream, mirror: false } : null;
  };

  const pick = (id) => mode && !mode.locked && act({ type: mode.type, target: id });

  return (
    <div className={`flex min-h-screen flex-col transition-colors duration-1000 ${night ? 'bg-[#05060f]' : ''}`}>
      <PhaseBar view={view} night={night} />

      <div className="mx-auto grid w-full max-w-[1500px] flex-1 gap-4 p-4 lg:grid-cols-[1fr_340px]">
        <section className="flex min-w-0 flex-col gap-4">
          <div className="order-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:order-1 xl:grid-cols-4">
            {view.players.map((p) => {
              const selectable = !!mode && !mode.locked && mode.targets.includes(p.id);
              return (
                <PlayerTile
                  key={p.id}
                  player={p}
                  isYou={p.id === view.youId}
                  night={night}
                  selectable={selectable}
                  selected={mode?.selected === p.id}
                  marks={marksFor(p)}
                  speaking={media.speaking[p.id]}
                  micOff={p.id === view.youId ? !media.micOn : media.peerMedia[p.id]?.mic === false}
                  onClick={() => pick(p.id)}
                  video={videoFor(p)}
                  hostControls={
                    isHost && p.id !== view.youId && DAY_TALK.has(view.phase) && p.alive ? (
                      <button className="rounded-full bg-black/70 px-2 py-0.5 text-xs hover:bg-black" onClick={() => muteToggle(p.id, !p.hostMuted)}>
                        {p.hostMuted ? 'Unmute' : 'Mute'}
                      </button>
                    ) : null
                  }
                />
              );
            })}
          </div>

          {/* On phones the thing you must do comes first; on desktop it sits under the table. */}
          <div className="order-1 flex flex-col gap-4 lg:order-2 empty:hidden">
            <Announcement view={view} />
            <ActionPanel view={view} mode={mode} />
          </div>
        </section>

        <aside className="flex min-h-[420px] flex-col gap-4 lg:max-h-[calc(100vh-110px)]">
          <RoleCard view={view} />
          <MediaControls view={view} />
          <Chat view={view} />
        </aside>
      </div>

      <AnimatePresence>
        {view.phase === 'role_reveal' && <RoleReveal key="reveal" view={view} />}
        {view.phase === 'game_over' && !dismissedOver && (
          <GameOver key="over" view={view} onClose={() => setDismissedOver(true)} />
        )}
      </AnimatePresence>
    </div>
  );
}
