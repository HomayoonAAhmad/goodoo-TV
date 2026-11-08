const { createServer } = require("node:http");
const { createHash, randomBytes } = require("node:crypto");
const next = require("next");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOSTNAME || "0.0.0.0";
const app = next({ dev: process.env.NODE_ENV !== "production", hostname, port });
// shortcut: presence lives in one Node process, add a Socket.IO adapter before scaling horizontally.
const presence = new Map();
const roomQueues = new Map();

function withRoomLock(code, task) {
  const previous = roomQueues.get(code) || Promise.resolve();
  const current = previous.catch(() => {}).then(task);
  roomQueues.set(code, current);
  return current.finally(() => {
    if (roomQueues.get(code) === current) roomQueues.delete(code);
  });
}

async function removeMember(io, code, socketId) {
  const members = presence.get(code);
  if (!members || !members.delete(socketId)) return;
  if (members.size) {
    io.to(code).emit("room:members", [...members.values()]);
    return;
  }
  presence.delete(code);
  await prisma.room.deleteMany({ where: { code } });
}

function validSource(value) {
  try {
    const url = new URL(String(value));
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

app.prepare().then(async () => {
  // Presence is process-local, so stored rooms are empty after a server restart.
  await prisma.room.deleteMany().catch((error) => console.error("Could not clean up empty rooms", error));
  const httpServer = createServer((req, res) => app.getRequestHandler()(req, res));
  const io = new Server(httpServer);

  io.use(async (socket, nextAuth) => {
    try {
      const token = socket.request.headers.cookie
        ?.split("; ")
        .find((part) => part.startsWith("kinema_session="))
        ?.split("=")[1];
      if (!token) return nextAuth(new Error("unauthorized"));
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const session = await prisma.session.findUnique({
        where: { tokenHash },
        include: { user: true },
      });
      if (!session || session.expiresAt <= new Date()) return nextAuth(new Error("unauthorized"));
      socket.data.user = session.user;
      nextAuth();
    } catch {
      nextAuth(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("room:create", async ({ source }, done) => {
      const link = validSource(source);
      if (!link) return done({ error: "لینک معتبر وارد کن." });
      try {
        let code;
        do code = randomBytes(6).toString("hex").toUpperCase();
        while (await prisma.room.findUnique({ where: { code } }));
        await prisma.room.create({ data: { code, source: link, hostId: socket.data.user.id } });
        done({ roomId: code });
      } catch {
        done({ error: "ساخت اتاق ممکن نشد." });
      }
    });

    socket.on("room:join", async ({ roomId }, done) => {
      const code = String(roomId || "")
        .trim()
        .toUpperCase();
      try {
        await withRoomLock(code, async () => {
          const room = await prisma.room.findUnique({ where: { code }, include: { host: true } });
          if (!room) return done({ error: "اتاقی با این کد پیدا نشد." });
          socket.join(code);
          const members = presence.get(code) || new Map();
          members.set(socket.id, {
            name: socket.data.user.firstName || socket.data.user.name || socket.data.user.username || "مهمان",
            avatar: socket.data.user.avatar,
          });
          presence.set(code, members);
          io.to(code).emit("room:members", [...members.values()]);
          const currentTime =
            room.currentTime +
            (room.isPlaying ? Math.max(0, (Date.now() - room.updatedAt.getTime()) / 1000) : 0);
          done({
            roomId: code,
            source: room.source,
            hostName: room.host.firstName || room.host.name || room.host.username || "میزبان",
            isHost: room.hostId === socket.data.user.id,
            members: [...members.values()],
            playback: { isPlaying: room.isPlaying, currentTime, updatedAt: Date.now() },
          });
        });
      } catch {
        done({ error: "ورود به اتاق ممکن نشد." });
      }
    });

    socket.on("playback:update", async ({ roomId, isPlaying, currentTime }) => {
      if (!Number.isFinite(currentTime) || currentTime < 0) return;
      const code = String(roomId || "").toUpperCase();
      if (!socket.rooms.has(code)) return;
      try {
        const room = await prisma.room.findUnique({ where: { code } });
        if (!room || (room.hostId !== socket.data.user.id && isPlaying !== false)) return;
        const updated = await prisma.room.update({
          where: { code },
          data: { isPlaying: Boolean(isPlaying), currentTime: room.hostId === socket.data.user.id ? currentTime : room.currentTime },
        });
        (room.hostId === socket.data.user.id ? socket.to(code) : io.to(code)).emit("playback:update", {
          isPlaying: updated.isPlaying,
          currentTime: updated.currentTime,
          updatedAt: updated.updatedAt.getTime(),
        });
      } catch (error) {
        console.error("Could not update playback", error);
      }
    });

    socket.on("room:leave", ({ roomId }) => {
      const code = String(roomId || "").toUpperCase();
      withRoomLock(code, async () => {
        socket.leave(code);
        await removeMember(io, code, socket.id);
      }).catch((error) => console.error("Could not leave room", error));
    });

    socket.on("disconnect", async () => {
      for (const [code, members] of presence) {
        if (!members.has(socket.id)) continue;
        try {
          await withRoomLock(code, () => removeMember(io, code, socket.id));
        } catch (error) {
          console.error("Could not clean up room presence", error);
        }
      }
    });
  });
  httpServer.listen(port, hostname, () => console.log("Ready on http://" + hostname + ":" + port));
});
