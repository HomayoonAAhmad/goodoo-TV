const updates = new Map();
let nextVersion = 0;

function latestPlaybackUpdate(roomId) {
  const version = ++nextVersion;
  updates.set(roomId, version);
  return () => updates.get(roomId) === version;
}

function clearPlaybackUpdates(roomId) {
  updates.delete(roomId);
}

module.exports = { latestPlaybackUpdate, clearPlaybackUpdates };
