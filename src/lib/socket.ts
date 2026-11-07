"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | undefined;

export function getSocket() {
  socket ??= io({ autoConnect: false });
  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = undefined;
}
