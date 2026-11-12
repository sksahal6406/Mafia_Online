'use client';

import { useEffect } from 'react';
import { getSocket } from '../socket';
import { Mesh } from './mesh';

let mesh = null;
if (typeof window !== 'undefined') window.__mesh = () => mesh; // debug/test hook

export const getMesh = () => mesh;

function ensureMesh() {
  if (!mesh) mesh = new Mesh(getSocket());
  return mesh;
}

function destroyMesh() {
  mesh?.destroy();
  mesh = null;
}

/** Keeps the WebRTC mesh in step with the server view while the player is seated in a room. */
export function useMeshSync(view) {
  const active = !!view;
  useEffect(() => {
    if (view) ensureMesh().sync(view);
  }, [view]);
  useEffect(() => {
    if (!active) destroyMesh();
  }, [active]);
  useEffect(() => destroyMesh, []);
}

export const toggleMic = () => mesh?.toggleMic();
export const toggleCam = () => mesh?.toggleCam();
