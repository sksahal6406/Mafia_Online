import { create } from 'zustand';

/**
 * Reactive media state shared with the UI. The mesh (mesh.js) owns the actual
 * RTCPeerConnections and writes here.
 *  remote:    { [peerId]: { stream, v } }      v bumps when tracks change
 *  peerMedia: { [peerId]: { mic, cam } }       what each peer says they have switched on
 *  speaking:  { [playerId]: boolean }
 *  peers:     { [peerId]: connectionState }
 */
export const useMedia = create(() => ({
  micOn: false,
  camOn: false,
  micError: null,
  camError: null,
  localVideo: null,
  remote: {},
  peerMedia: {},
  speaking: {},
  peers: {},
}));

if (typeof window !== 'undefined') window.__media = useMedia; // debug/test hook

export const resetMedia = () =>
  useMedia.setState({
    micOn: false,
    camOn: false,
    micError: null,
    camError: null,
    localVideo: null,
    remote: {},
    peerMedia: {},
    speaking: {},
    peers: {},
  });
