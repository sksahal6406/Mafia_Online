'use client';

import { Ban, Camera, CameraOff, Mic, MicOff, Moon, Skull, Theater, VolumeX } from 'lucide-react';
import { toggleCam, toggleMic } from '@/lib/webrtc/useMesh';
import { useMedia } from '@/lib/webrtc/mediaStore';
import TileVideo from './TileVideo';

/** Why can't (or won't) the player's media flow right now? */
function statusLine(view) {
  const { media, you, phase, youId } = view;
  if (media.forceMuted) {
    if (you && !you.alive) return { Icon: Skull, text: 'You are out: you can watch and listen only.' };
    if (view.players.find((p) => p.id === youId)?.hostMuted) return { Icon: VolumeX, text: 'The host muted you.' };
  }
  const night = phase.startsWith('night');
  if (night && media.sendTo.length === 0) return { Icon: Moon, text: 'Night: everyone is silent.' };
  if (night) return { Icon: Moon, text: 'Night: only the Mafia can hear you.' };
  if (phase === 'role_reveal') return { Icon: Theater, text: 'Media is paused while roles are dealt.' };
  return null;
}

export default function MediaControls({ view, preview = false }) {
  const { micOn, camOn, micError, camError, localVideo } = useMedia();
  const videoAllowed = view.media.video;
  const note = statusLine(view);
  const btn = (on) =>
    `flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-bold transition ${
      on ? 'border-town bg-town/15 text-town' : 'border-line bg-panel-2 text-bone hover:border-mute'
    }`;

  return (
    <section className="card !p-3">
      <h2 className="label px-1">Camera &amp; mic</h2>

      {preview && videoAllowed && camOn && localVideo && (
        <div className="mb-2 aspect-[4/3] overflow-hidden rounded-xl border-2 border-line bg-black">
          <TileVideo stream={localVideo} mirror />
        </div>
      )}

      <div className="flex gap-2">
        <button className={btn(micOn)} onClick={toggleMic} aria-pressed={micOn} data-testid="toggle-mic">
          {micOn ? <Mic className="h-5 w-5" aria-hidden="true" /> : <MicOff className="h-5 w-5" aria-hidden="true" />}
          {micOn ? 'Mic on' : 'Mic off'}
        </button>
        {videoAllowed ? (
          <button className={btn(camOn)} onClick={toggleCam} aria-pressed={camOn} data-testid="toggle-cam">
            {camOn ? <Camera className="h-5 w-5" aria-hidden="true" /> : <CameraOff className="h-5 w-5" aria-hidden="true" />}
            {camOn ? 'Camera on' : 'Camera off'}
          </button>
        ) : (
          <div className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line px-3 py-2 text-sm font-bold text-mute" data-testid="video-disabled">
            <Ban className="h-5 w-5" aria-hidden="true" /> Video disabled
          </div>
        )}
      </div>

      {(micError || camError) && <p className="mt-2 px-1 text-xs font-semibold text-gold">{micError || camError}</p>}
      {note && (
        <p className="mt-2 flex items-center gap-1.5 px-1 text-xs font-semibold text-mute">
          <note.Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> {note.text}
        </p>
      )}
    </section>
  );
}
