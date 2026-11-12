'use client';

import { Check, Crown, MicOff, Skull, TriangleAlert, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';
import { roleInfo } from '@/lib/roles';
import TileVideo from '../media/TileVideo';
import { Avatar, RoleIcon } from '../ui/icons';

/**
 * One seat at the table. `children` is the slot where the live video element
 * goes; until then the avatar is shown.
 */
export default function PlayerTile({ player, isYou, selectable, selected, marks = [], onClick, night, children, hostControls, speaking, micOff, video }) {
  const info = player.role ? roleInfo(player.role) : null;
  const dead = !player.alive;

  return (
    <motion.div
      layout
      whileHover={selectable ? { y: -4 } : undefined}
      whileTap={selectable ? { scale: 0.98 } : undefined}
      onClick={selectable ? onClick : undefined}
      onKeyDown={selectable ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick()) : undefined}
      role={selectable ? 'button' : undefined}
      tabIndex={selectable ? 0 : undefined}
      aria-pressed={selectable ? !!selected : undefined}
      aria-label={selectable ? `Pick ${player.name}` : undefined}
      className={[
        'relative aspect-[4/3] overflow-hidden rounded-2xl border-2 bg-panel-2 shadow-[3px_3px_0_0_#000] transition',
        selectable ? 'cursor-pointer border-gold hover:shadow-[3px_6px_0_0_#000]' : 'border-line',
        selected ? '!border-blood ring-4 ring-blood' : '',
        speaking && !selected ? 'speaking !border-town' : '',
        dead ? 'opacity-55 grayscale' : '',
      ].join(' ')}
    >
      <div className={`absolute inset-0 flex items-center justify-center ${night ? 'bg-black/40' : ''}`}>
        {video ? <TileVideo stream={video.stream} mirror={video.mirror} /> : children ?? (
          <Avatar name={player.name} className="h-16 w-16 text-3xl sm:h-20 sm:w-20 sm:text-4xl" />
        )}
      </div>

      {dead && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <Skull className="h-14 w-14 text-bone/80" aria-label="Eliminated" />
        </div>
      )}

      {selected && (
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full border-2 border-black bg-blood px-2.5 py-0.5 text-xs font-bold text-white">
          <Check className="h-3.5 w-3.5" aria-hidden="true" /> Your pick
        </span>
      )}

      {marks.length > 0 && (
        <div className="absolute right-2 top-2 flex flex-wrap justify-end gap-1">
          {marks.map((m, i) => (
            <span key={i} title={m.title} className="flex items-center gap-1 rounded-full border border-black bg-black/80 px-2 py-0.5 text-xs font-bold">
              <m.Icon className={`h-3.5 w-3.5 ${m.tone ?? ''}`} aria-hidden="true" /> {m.label}
            </span>
          ))}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/90 to-transparent px-3 pb-2 pt-7">
        <span className="truncate text-sm font-bold">
          {player.name}
          {isYou && <span className="ml-1 text-xs font-bold text-gold">YOU</span>}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs">
          {player.isHost && <Crown className="h-4 w-4 text-gold" aria-label="Host" />}
          {!player.connected && <TriangleAlert className="h-4 w-4 text-gold" aria-label="Disconnected" />}
          {player.hostMuted && <VolumeX className="h-4 w-4" aria-label="Muted by host" />}
          {micOff && !player.hostMuted && <MicOff className="h-4 w-4 opacity-70" aria-label="Mic off" />}
          {info && (
            <span className={`flex items-center gap-1 font-bold ${info.color}`} title={info.name}>
              <RoleIcon role={player.role} className="h-4 w-4" /> {info.name}
            </span>
          )}
        </span>
      </div>

      {hostControls && <div className="absolute bottom-10 right-2" onClick={(e) => e.stopPropagation()}>{hostControls}</div>}
    </motion.div>
  );
}
