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

function validSource(value) {
  try {
    const url = new URL(String(value));
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

app.prepare().then(() => {
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
      try {
        const code = String(roomId || "")
          .trim()
          .toUpperCase();
        const room = await prisma.room.findUnique({ where: { code }, include: { host: true } });
        if (!room) return done({ error: "اتاقی با این کد پیدا نشد." });
        socket.join(code);
        const members = presence.get(code) || new Map();
        members.set(
          socket.id,
          socket.data.user.firstName ||
            socket.data.user.name ||
            socket.data.user.username ||
            "مهمان",
        );
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
      socket.leave(code);
      const members = presence.get(code);
      if (!members) return;
      members.delete(socket.id);
      io.to(code).emit("room:members", [...members.values()]);
      if (!members.size) presence.delete(code);
    });

    socket.on("disconnect", () => {
      for (const [code, members] of presence) {
        if (!members.delete(socket.id)) continue;
        io.to(code).emit("room:members", [...members.values()]);
        if (!members.size) presence.delete(code);
      }
    });
  });
  httpServer.listen(port, hostname, () => console.log("Ready on http://" + hostname + ":" + port));
});
