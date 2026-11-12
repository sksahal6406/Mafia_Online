import { resetMedia, useMedia } from './mediaStore';

/*
 * P2P mesh. Signaling goes through the game server ('rtc:signal').
 *
 * - For each pair of players, the one with the smaller id is the "initiator" and
 *   is the only side that sends offers (so there is never offer glare).
 * - Every connection has fixed audio (+ video) transceivers, so toggling the mic,
 *   the camera or the night/day policy is just sender.replaceTrack(): no renegotiation.
 * - The server's media policy (view.media) says who we may send to; we simply
 *   replace the track with null for everyone else. Receivers also mute/hide media
 *   from peers they should not hear. (Trust-based: a modified client could ignore it.)
 */

const ICE = () => {
  const servers = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  const turn = process.env.NEXT_PUBLIC_TURN_URL;
  if (turn) {
    servers.push({
      urls: turn.split(','),
      username: process.env.NEXT_PUBLIC_TURN_USER,
      credential: process.env.NEXT_PUBLIC_TURN_PASS,
    });
  }
  return servers;
};

const SPEAK_THRESHOLD = 0.02;

export class Mesh {
  constructor(socket) {
    this.socket = socket;
    this.nonce = Math.random().toString(36).slice(2);
    this.peers = new Map();
    this.greeted = new Map(); // peerId -> connected flag at last greeting
    this.view = null;
    this.gen = 0;
    this.mic = { track: null, on: false };
    this.cam = { track: null, on: false };
    this.audioCtx = null;
    this.analysers = new Map(); // key (peerId | 'self') -> { analyser, buf }
    this.lastSpeaking = {};

    this.onSignalBound = ({ from, data }) => this.onSignal(from, data);
    this.onConnectBound = () => this.greetAll(true);
    socket.on('rtc:signal', this.onSignalBound);
    socket.on('connect', this.onConnectBound);
    this.meter = setInterval(() => this.measure(), 200);
  }

  // ---------- helpers ----------

  send(to, data) {
    this.socket.emit('rtc:signal', { to, data });
  }

  get me() {
    return this.view?.youId;
  }

  isInitiator(id) {
    return this.me < id;
  }

  wantsVideo() {
    return this.view?.media?.video !== false;
  }

  // ---------- view sync ----------

  sync(view) {
    this.view = view;
    const others = view.players.filter((p) => p.id !== view.youId);
    const ids = new Set(others.map((p) => p.id));

    for (const id of [...this.peers.keys()]) if (!ids.has(id)) this.destroyPeer(id);

    for (const p of others) {
      if (p.connected && this.greeted.get(p.id) !== true) this.greet(p.id);
      if (!p.connected) this.greeted.set(p.id, false);
      // Video setting flipped: rebuild the connection without (or with) a video line.
      const peer = this.peers.get(p.id);
      if (peer && peer.initiator && peer.withVideo !== this.wantsVideo()) {
        this.ensureInitiator(p.id, peer.remoteNonce, true);
      }
    }

    if (!this.wantsVideo() && this.cam.track) this.stopCamera();
    this.applyAll();
    this.publishLocal();
  }

  greet(id) {
    this.greeted.set(id, true);
    this.send(id, { type: 'hello', nonce: this.nonce, reply: false });
  }

  greetAll() {
    for (const p of this.view?.players ?? []) {
      if (p.id !== this.me && p.connected) this.greet(p.id);
    }
  }

  // ---------- signaling ----------

  async onSignal(from, data) {
    if (!this.view || !this.view.players.some((p) => p.id === from)) return;
    try {
      switch (data.type) {
        case 'hello':
          if (!data.reply) this.send(from, { type: 'hello', nonce: this.nonce, reply: true });
          this.sendMedia(from);
          if (this.isInitiator(from)) this.ensureInitiator(from, data.nonce);
          break;
        case 'reset':
          if (this.isInitiator(from)) this.ensureInitiator(from, this.peers.get(from)?.remoteNonce ?? null, true);
          break;
        case 'sdp':
          await this.onSdp(from, data);
          break;
        case 'candidate':
          await this.onCandidate(from, data);
          break;
        case 'media':
          useMedia.setState((s) => ({ peerMedia: { ...s.peerMedia, [from]: { mic: data.mic, cam: data.cam } } }));
          break;
      }
    } catch (e) {
      console.warn('[rtc] signal error', data.type, e);
    }
  }

  async onSdp(from, { sdp, gen }) {
    if (sdp.type === 'offer') {
      if (this.isInitiator(from)) return; // only the initiator offers
      let peer = this.peers.get(from);
      if (!peer || peer.gen !== gen) {
        if (peer) this.destroyPeer(from, false);
        peer = this.createPeer(from, false, gen);
      }
      const pc = peer.pc;
      await pc.setRemoteDescription(sdp);
      for (const t of pc.getTransceivers()) {
        t.direction = 'sendrecv';
        if (t.receiver.track.kind === 'audio') peer.audioSender = t.sender;
        else peer.videoSender = t.sender;
      }
      peer.withVideo = !!peer.videoSender;
      await pc.setLocalDescription();
      this.send(from, { type: 'sdp', gen, sdp: pc.localDescription });
      await this.flush(peer);
      this.applyToPeer(peer);
    } else {
      const peer = this.peers.get(from);
      if (!peer || peer.gen !== gen) return;
      await peer.pc.setRemoteDescription(sdp);
      await this.flush(peer);
    }
  }

  async onCandidate(from, { gen, candidate }) {
    const peer = this.peers.get(from);
    if (!peer || peer.gen !== gen) return;
    if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(candidate).catch(() => {});
    else peer.queue.push(candidate);
  }

  async flush(peer) {
    const q = peer.queue.splice(0);
    for (const c of q) await peer.pc.addIceCandidate(c).catch(() => {});
  }

  // ---------- peer lifecycle ----------

  ensureInitiator(id, remoteNonce, force = false) {
    const existing = this.peers.get(id);
    if (!force && existing && existing.remoteNonce === remoteNonce && !['failed', 'closed'].includes(existing.pc.connectionState)) return;
    if (existing) this.destroyPeer(id, false);
    const peer = this.createPeer(id, true, ++this.gen);
    peer.remoteNonce = remoteNonce;
  }

  createPeer(id, initiator, gen) {
    const withVideo = this.wantsVideo();
    const pc = new RTCPeerConnection({ iceServers: ICE() });
    const peer = {
      id, pc, initiator, gen, withVideo,
      stream: new MediaStream(),
      audioSender: null, videoSender: null,
      sentAudio: null, sentVideo: null,
      queue: [], remoteNonce: null,
    };
    this.peers.set(id, peer);

    pc.onicecandidate = (e) => {
      if (e.candidate) this.send(id, { type: 'candidate', gen, candidate: e.candidate });
    };
    pc.ontrack = (e) => {
      peer.stream.addTrack(e.track);
      this.publishRemote(id);
      if (e.track.kind === 'audio') this.watch(id, e.track);
    };
    pc.onconnectionstatechange = () => {
      useMedia.setState((s) => ({ peers: { ...s.peers, [id]: pc.connectionState } }));
      if (pc.connectionState === 'connected') this.sendMedia(id);
      if (pc.connectionState === 'failed') this.recover(peer);
    };

    if (initiator) {
      peer.audioSender = pc.addTransceiver('audio', { direction: 'sendrecv' }).sender;
      if (withVideo) peer.videoSender = pc.addTransceiver('video', { direction: 'sendrecv' }).sender;
      pc.onnegotiationneeded = async () => {
        try {
          await pc.setLocalDescription();
          this.send(id, { type: 'sdp', gen, sdp: pc.localDescription });
        } catch (e) {
          console.warn('[rtc] offer failed', e);
        }
      };
    }
    this.publishRemote(id);
    return peer;
  }

  recover(peer) {
    if (this.peers.get(peer.id) !== peer) return;
    if (peer.initiator) this.ensureInitiator(peer.id, peer.remoteNonce, true);
    else {
      this.destroyPeer(peer.id, false);
      this.send(peer.id, { type: 'reset' });
    }
  }

  destroyPeer(id, clearStore = true) {
    const peer = this.peers.get(id);
    if (!peer) return;
    this.peers.delete(id);
    peer.pc.onconnectionstatechange = null;
    peer.pc.close();
    this.analysers.delete(id);
    if (clearStore) {
      useMedia.setState((s) => {
        const { [id]: _r, ...remote } = s.remote;
        const { [id]: _p, ...peers } = s.peers;
        const { [id]: _m, ...peerMedia } = s.peerMedia;
        return { remote, peers, peerMedia };
      });
      this.greeted.delete(id);
    }
  }

  publishRemote(id) {
    const peer = this.peers.get(id);
    if (!peer) return;
    useMedia.setState((s) => ({ remote: { ...s.remote, [id]: { stream: peer.stream, v: (s.remote[id]?.v ?? 0) + 1 } } }));
  }

  // ---------- policy ----------

  applyAll() {
    for (const peer of this.peers.values()) this.applyToPeer(peer);
  }

  /** Decide, per peer, which of our local tracks may flow right now. */
  applyToPeer(peer) {
    const pol = this.view?.media;
    if (!pol) return;
    const allowed = pol.sendTo.includes(peer.id);
    const audio = allowed && this.mic.on && !pol.forceMuted ? this.mic.track : null;
    const video = allowed && pol.video !== false && this.cam.on ? this.cam.track : null;
    if (peer.audioSender && peer.sentAudio !== audio) {
      peer.sentAudio = audio;
      peer.audioSender.replaceTrack(audio).catch(() => {});
    }
    if (peer.videoSender && peer.sentVideo !== video) {
      peer.sentVideo = video;
      peer.videoSender.replaceTrack(video).catch(() => {});
    }
  }

  // ---------- local devices ----------

  async toggleMic() {
    if (this.mic.on) return this.setMic(false);
    if (!this.mic.track || this.mic.track.readyState === 'ended') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        this.mic.track = stream.getAudioTracks()[0];
        this.watch('self', this.mic.track);
      } catch (e) {
        useMedia.setState({ micError: friendly(e, 'microphone') });
        return;
      }
    }
    useMedia.setState({ micError: null });
    this.setMic(true);
  }

  setMic(on) {
    this.mic.on = on;
    useMedia.setState({ micOn: on });
    this.afterLocalChange();
  }

  async toggleCam() {
    if (!this.wantsVideo()) return;
    if (this.cam.on) return this.stopCamera();
    const crowded = (this.view?.players.length ?? 0) > 8;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: crowded ? 256 : 320 },
          height: { ideal: crowded ? 192 : 240 },
          frameRate: { ideal: crowded ? 12 : 15 },
        },
      });
      this.cam.track = stream.getVideoTracks()[0];
      this.cam.on = true;
      useMedia.setState({ camOn: true, camError: null, localVideo: new MediaStream([this.cam.track]) });
      this.afterLocalChange();
    } catch (e) {
      useMedia.setState({ camError: friendly(e, 'camera') });
    }
  }

  stopCamera() {
    this.cam.track?.stop();
    this.cam.track = null;
    this.cam.on = false;
    useMedia.setState({ camOn: false, localVideo: null });
    this.afterLocalChange();
  }

  afterLocalChange() {
    this.applyAll();
    for (const id of this.peers.keys()) this.sendMedia(id);
    this.publishLocal();
  }

  sendMedia(id) {
    this.send(id, { type: 'media', mic: this.mic.on, cam: this.cam.on });
  }

  publishLocal() {
    // Nothing to do beyond the speaking meter; kept for symmetry with remote state.
  }

  // ---------- speaking indicator ----------

  watch(key, track) {
    try {
      this.audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
      const analyser = this.audioCtx.createAnalyser();
      analyser.fftSize = 512;
      this.audioCtx.createMediaStreamSource(new MediaStream([track])).connect(analyser);
      this.analysers.set(key, { analyser, buf: new Uint8Array(analyser.fftSize) });
    } catch {
      /* speaking indicator is optional */
    }
  }

  measure() {
    if (!this.view) return;
    this.audioCtx?.state === 'suspended' && this.audioCtx.resume().catch(() => {});
    const pol = this.view.media;
    const speaking = {};
    for (const [key, { analyser, buf }] of this.analysers) {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += ((v - 128) / 128) ** 2;
      const loud = Math.sqrt(sum / buf.length) > SPEAK_THRESHOLD;
      if (key === 'self') speaking[this.me] = loud && this.mic.on && !pol.forceMuted && pol.sendTo.length > 0;
      else speaking[key] = loud && pol.receiveFrom.includes(key);
    }
    const changed =
      Object.keys(speaking).length !== Object.keys(this.lastSpeaking).length ||
      Object.keys(speaking).some((k) => speaking[k] !== this.lastSpeaking[k]);
    if (changed) {
      this.lastSpeaking = speaking;
      useMedia.setState({ speaking });
    }
  }

  // ---------- teardown ----------

  destroy() {
    clearInterval(this.meter);
    this.socket.off('rtc:signal', this.onSignalBound);
    this.socket.off('connect', this.onConnectBound);
    for (const id of [...this.peers.keys()]) this.destroyPeer(id);
    this.mic.track?.stop();
    this.cam.track?.stop();
    this.audioCtx?.close().catch(() => {});
    resetMedia();
  }
}

function friendly(e, what) {
  if (e?.name === 'NotAllowedError') return `Access to your ${what} was blocked. Allow it in the browser address bar.`;
  if (e?.name === 'NotFoundError') return `No ${what} found.`;
  if (e?.name === 'NotReadableError') return `Your ${what} is being used by another app.`;
  return `Could not start your ${what}.`;
}
