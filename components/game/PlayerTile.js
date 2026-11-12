'use client';

import { motion } from 'framer-motion';
import { roleInfo } from '@/lib/roles';
import TileVideo from '../media/TileVideo';

/**
 * One seat at the table. `children` is the slot where the live video element
 * goes (step 5); until then the avatar is shown.
 */
export default function PlayerTile({ player, isYou, selectable, selected, marks = [], onClick, night, children, hostControls, speaking, micOff, video }) {
  const info = player.role ? roleInfo(player.role) : null;
  const dead = !player.alive;

  return (
    <motion.div
      layout
      whileHover={selectable ? { y: -3 } : undefined}
      onClick={selectable ? onClick : undefined}
      role={selectable ? 'button' : undefined}
      className={[
        'relative aspect-[4/3] overflow-hidden rounded-2xl border bg-panel-2 transition',
        selectable ? 'cursor-pointer border-gold/60 hover:border-gold' : 'border-line',
        selected ? 'ring-4 ring-blood' : '',
        speaking && !selected ? 'ring-2 ring-town shadow-[0_0_18px_rgba(76,195,138,0.5)]' : '',
        dead ? 'opacity-50 grayscale' : '',
      ].join(' ')}
    >
      <div className={`absolute inset-0 flex items-center justify-center ${night ? 'bg-black/40' : ''}`}>
        {video ? <TileVideo stream={video.stream} mirror={video.mirror} /> : children ?? (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blood/20 font-display text-3xl text-blood sm:h-20 sm:w-20 sm:text-4xl">
            {player.name[0].toUpperCase()}
          </span>
        )}
      </div>

      {dead && <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-70">💀</div>}

      {selected && <span className="absolute left-2 top-2 rounded-full bg-blood px-2 py-0.5 text-xs font-bold">✓ Your pick</span>}

      {marks.length > 0 && (
        <div className="absolute right-2 top-2 flex gap-1">
          {marks.map((m, i) => (
            <span key={i} title={m.title} className="rounded-full bg-black/70 px-2 py-0.5 text-xs">{m.label}</span>
          ))}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/90 to-transparent px-3 pb-2 pt-6">
        <span className="truncate text-sm font-semibold">
          {player.name}
          {isYou && <span className="ml-1 text-xs text-mute">(you)</span>}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-xs">
          {player.isHost && <span title="Host">👑</span>}
          {!player.connected && <span title="Disconnected" className="text-gold">⚠</span>}
          {player.hostMuted && <span title="Muted by host">🔇</span>}
          {micOff && !player.hostMuted && <span title="Mic off" className="line-through opacity-70">🎤</span>}
          {info && <span className={info.color} title={info.name}>{info.emoji} {info.name}</span>}
        </span>
      </div>

      {hostControls && <div className="absolute bottom-10 right-2" onClick={(e) => e.stopPropagation()}>{hostControls}</div>}
    </motion.div>
  );
}
