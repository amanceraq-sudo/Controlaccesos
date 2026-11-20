let io;

export function setIO(serverIO) {
  io = serverIO;
}

export function emitTrackingEvent(event, payload) {
  if (!io) return;
  io.emit(event, payload);
}
