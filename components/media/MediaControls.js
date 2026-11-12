'use client';

import { toggleCam, toggleMic } from '@/lib/webrtc/useMesh';
import { useMedia } from '@/lib/webrtc/mediaStore';
import TileVideo from './TileVideo';

/** Why can't (or won't) the player's media flow right now? */
function statusLine(view) {
  const { media, you, phase, youId } = view;
  if (media.forceMuted) {
    if (you && !you.alive) return '💀 You are out: you can watch and listen only.';
    if (view.players.find((p) => p.id === youId)?.hostMuted) return '🔇 The host muted you.';
  }
  const night = phase.startsWith('night');
  if (night && media.sendTo.length === 0) return '🌙 Night: everyone is silent.';
  if (night) return '🌙 Night: only the Mafia can hear you.';
  if (phase === 'role_reveal') return '🎭 Media is paused while roles are dealt.';
  return null;
}

export default function MediaControls({ view, preview = false }) {
  const { micOn, camOn, micError, camError, localVideo } = useMedia();
  const videoAllowed = view.media.video;
  const note = statusLine(view);
  const btn = (on) =>
    `flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
      on ? 'border-town/60 bg-town/15 text-town' : 'border-line bg-panel-2 text-bone hover:border-mute'
    }`;

  return (
    <section className="card !p-3">
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-mute">Camera &amp; mic</h2>

      {preview && videoAllowed && camOn && localVideo && (
        <div className="mb-2 aspect-[4/3] overflow-hidden rounded-xl border border-line bg-black">
          <TileVideo stream={localVideo} mirror />
        </div>
      )}

      <div className="flex gap-2">
        <button className={btn(micOn)} onClick={toggleMic} aria-pressed={micOn} data-testid="toggle-mic">
          {micOn ? '🎙️ Mic on' : '🔇 Mic off'}
        </button>
        {videoAllowed ? (
          <button className={btn(camOn)} onClick={toggleCam} aria-pressed={camOn} data-testid="toggle-cam">
            {camOn ? '📹 Camera on' : '📷 Camera off'}
          </button>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-line px-3 py-2.5 text-sm text-mute" data-testid="video-disabled">
            🚫 Video disabled
          </div>
        )}
      </div>

      {(micError || camError) && <p className="mt-2 px-1 text-xs text-gold">{micError || camError}</p>}
      {note && <p className="mt-2 px-1 text-xs text-mute">{note}</p>}
    </section>
  );
}
