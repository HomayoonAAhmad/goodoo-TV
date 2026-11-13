"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  House,
  Link2,
  LoaderCircle,
  Play,
  Radio,
  RefreshCw,
  Users,
} from "lucide-react";
import { Button } from "glisse";
import { getSocket } from "@/lib/socket";
import { getPlayableSource, getYoutubeId, isHlsUrl } from "@/lib/media";
import { ThemeToggle } from "./theme-toggle";

type Playback = { isPlaying: boolean; currentTime: number; updatedAt: number; controllerId?: string; isControl?: boolean };
type TranscodeStatus = { ready: boolean; finished: boolean; error: boolean; percent: number | null; etaSeconds: number | null };
type Member = { name: string; avatar: string | null };
type RoomData = {
  roomId: string;
  source: string;
  hostName: string;
  isHost: boolean;
  members: Member[];
  playback: Playback;
};
type PlayerApi = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (time: number, allow: boolean) => void;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  destroy: () => void;
};
type SocketLike = ReturnType<typeof getSocket>;

export function RoomScreen({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [socket, setSocket] = useState<SocketLike | null>(null);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [error, setError] = useState("");
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    setSocket(getSocket());
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onMembers = (members: Member[]) =>
      setRoom((current) => (current ? { ...current, members } : current));
    const onPlayback = (playback: Playback) =>
      setRoom((current) =>
        current ? { ...current, playback: { ...playback, updatedAt: Date.now() } } : current,
      );
    const join = () =>
      socket.emit("room:join", { roomId }, (result: RoomData | { error: string }) => {
        if ("error" in result) return setError(result.error);
        setError("");
        setRoom({ ...result, playback: { ...result.playback, updatedAt: Date.now() } });
      });
    socket.on("room:members", onMembers);
    socket.on("playback:update", onPlayback);
    socket.on("connect", join);
    socket.on("connect_error", () => setError("اتصال برقرار نشد. دوباره وارد حساب شو."));
    if (socket.connected) join();
    return () => {
      socket.emit("room:leave", { roomId });
      socket.off("room:members", onMembers);
      socket.off("playback:update", onPlayback);
      socket.off("connect", join);
    };
  }, [roomId, socket]);

  const shareInvite = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: "دعوت به اتاق تماشا", url });
      else {
        await navigator.clipboard.writeText(url);
        setSharing(true);
        window.setTimeout(() => setSharing(false), 1800);
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") console.error("Could not share invite", error);
    }
  }, []);

  if (!socket)
    return (
      <main className="grid min-h-dvh place-items-center">
        <LoaderCircle className="animate-spin" /> در حال آماده‌سازی اتاق…
      </main>
    );
  if (error)
    return (
      <main className="grid min-h-dvh place-items-center px-5">
        <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-7 text-center dark:border-stone-800 dark:bg-stone-900">
          <Radio className="mx-auto" size={28} />
          <h1 className="mt-3 text-xl font-bold">اتاق در دسترس نیست</h1>
          <p className="mt-2 text-sm text-stone-500">{error}</p>
          <Button
            className="min-h-12 w-full rounded-2xl font-semibold mt-5"
            variant="filled"
            onClick={() => router.push("/")}
          >
            برگشت به خانه
          </Button>
        </div>
      </main>
    );
  if (!room)
    return (
      <main className="grid min-h-dvh place-items-center">
        <LoaderCircle className="animate-spin" /> در حال ورود به اتاق…
      </main>
    );

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-4 pt-[max(20px,env(safe-area-inset-top))] sm:px-8">
      <header className="flex items-center justify-between">
        <Button
          variant="glass"
          icon={<ArrowRight size={18} />}
          aria-label="بازگشت به خانه"
          onClick={() => router.push("/")}
        />
        <span className="flex items-center gap-2 text-sm font-bold">
          <House size={19} /> Goodoo TV
        </span>
        <ThemeToggle />
      </header>
      <section className="pt-10">
        <h1 className="text-3xl font-bold tracking-tight">اتاق تماشا</h1>
        <p className="mt-1 text-sm text-[#8e8e93]">
          {room.isHost ? "تو میزبان هستی" : `میزبان: ${room.hostName}`}
        </p>
        <div className="mt-6 overflow-hidden rounded-[24px] bg-black ring-1 ring-black/5 dark:ring-white/10">
          <div className="aspect-video">
            <MediaPlayer
              source={room.source}
              isHost={room.isHost}
              playback={room.playback}
              roomId={roomId}
              socket={socket}
            />
          </div>
        </div>
        <TranscodeProgress source={room.source} />
        <RoomInfoCard roomId={roomId} source={room.source} members={room.members} sharing={sharing} onInvite={shareInvite} />
        {!room.isHost && (
          <p className="mt-4 text-center text-xs text-[#8e8e93]">برای شروع، یک بار روی پخش بزن.</p>
        )}
        <Button
          variant="glass"
          onClick={() => router.push("/")}
          className="mt-6 min-h-12 w-full rounded-2xl"
        >
          خروج از اتاق
        </Button>
      </section>
    </main>
  );
}

function TranscodeProgress({ source }: { source: string }) {
  const playable = getPlayableSource(source);
  const [status, setStatus] = useState<TranscodeStatus | null>(null);
  useEffect(() => {
    if (!playable.startsWith("/api/media/transcode/index.m3u8?")) return;
    let active = true;
    const statusUrl = playable.replace("/index.m3u8?", "/status.json?");
    const poll = async () => {
      try {
        const response = await fetch(statusUrl, { cache: "no-store" });
        if (response.ok && active) {
          const next: TranscodeStatus = await response.json();
          setStatus(next);
          if (next.finished) window.clearInterval(timer);
        }
      } catch {}
    };
    const timer = window.setInterval(poll, 1000);
    void poll();
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [playable]);
  if (!status || status.finished) return null;
  const eta = status.etaSeconds === null ? "زمان در حال محاسبه" : `حدود ${Math.ceil(status.etaSeconds / 60)} دقیقه مانده`;
  return (
    <div className="mt-3 rounded-2xl border border-black/5 bg-white px-4 py-3 dark:border-white/5 dark:bg-[#1c1c1e]" aria-live="polite">
      <div className="flex items-center gap-3">
        <RefreshCw size={18} className="shrink-0 animate-spin text-[#007aff] dark:text-[#0a84ff]" />
        <div className="min-w-0 flex-1">
          <div className="flex justify-between gap-3 text-xs">
            <span>{status.ready ? "تبدیل برای پخش" : "آماده‌سازی شروع ویدیو"}</span>
            <span className="shrink-0 text-[#8e8e93]">{status.percent === null ? "…" : `${status.percent}٪`} · {eta}</span>
          </div>
          <progress className="mt-2 h-1 w-full accent-blue-500" max={100} value={status.percent ?? undefined} />
        </div>
      </div>
    </div>
  );
}

function RoomInfoCard({ roomId, source, members, sharing, onInvite }: { roomId: string; source: string; members: Member[]; sharing: boolean; onInvite: () => void }) {
  return <section className="mt-6 overflow-hidden rounded-3xl bg-white dark:bg-[#1c1c1e]">
    <div className="flex items-center justify-between gap-3 px-5 py-4"><div className="min-w-0"><p className="text-xs text-[#8e8e93]">کد دعوت</p><strong dir="ltr" className="mt-1 block font-mono text-base tracking-widest">{roomId}</strong></div><Button variant="glass" onClick={onInvite} className="flex shrink-0 items-center gap-2 text-[#007aff] dark:text-[#0a84ff]"><ShareIcon size={17} />{sharing ? "کپی شد" : "اشتراک‌گذاری"}</Button></div>
    <div className="mx-5 border-t border-black/10 dark:border-white/10" />
    <details className="group"><summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4"><Users size={18} className="text-[#007aff] dark:text-[#0a84ff]" /><span className="flex-1 text-sm">افراد حاضر</span><span className="text-sm text-[#8e8e93]">{members.length} نفر</span></summary><div className="space-y-3 px-5 pb-4">{members.map((member, index) => <div key={`${member.name}-${index}`} className="flex items-center gap-3 text-sm"><div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">{member.avatar ? <img src={member.avatar} alt="" className="size-full object-cover" /> : <Users size={16} />}</div><span>{member.name}</span></div>)}</div></details>
    <div className="mx-5 border-t border-black/10 dark:border-white/10" />
    <div className="flex min-w-0 items-center gap-3 px-5 py-4"><Link2 size={18} className="shrink-0 text-[#007aff] dark:text-[#0a84ff]" /><span className="shrink-0 text-sm">ویدیو</span><span dir="ltr" className="min-w-0 flex-1 truncate text-left text-xs text-[#8e8e93]">{source}</span></div>
  </section>;
}

function ShareIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V3m0 0L8 7m4-4 4 4"/><path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/></svg>;
}

function MediaPlayer({
  source,
  isHost,
  playback,
  roomId,
  socket,
}: {
  source: string;
  isHost: boolean;
  playback: Playback;
  roomId: string;
  socket: SocketLike;
}) {
  const youtubeId = getYoutubeId(source);
  const playableSource = getPlayableSource(source);
  const [failed, setFailed] = useState(false);
  if (youtubeId)
    return (
      <YoutubePlayer
        key={youtubeId}
        id={youtubeId}
        isHost={isHost}
        playback={playback}
        roomId={roomId}
        socket={socket}
      />
    );
  return (
    <DirectPlayer
      key={playableSource}
      source={playableSource}
      isHost={isHost}
      playback={playback}
      roomId={roomId}
      socket={socket}
      failed={failed}
      setFailed={setFailed}
    />
  );
}

function DirectPlayer({
  source,
  isHost,
  playback,
  roomId,
  socket,
  failed,
  setFailed,
}: {
  source: string;
  isHost: boolean;
  playback: Playback;
  roomId: string;
  socket: SocketLike;
  failed: boolean;
  setFailed: (value: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const applyingRemote = useRef(false);
  const remoteTimer = useRef(0);
  const remoteSeek = useRef<number | null>(null);
  const pendingLocal = useRef<{ isPlaying: boolean; seq: number; expiresAt: number } | null>(null);
  const localSeq = useRef(0);
  const playbackRef = useRef(playback);
  playbackRef.current = playback;
  const lastSent = useRef(0);
  const [needsGesture, setNeedsGesture] = useState(false);
  const emitPlayback = useCallback((isPlaying: boolean, currentTime: number, isControl = true) => {
    if (!isControl) return socket.emit("playback:update", { roomId, isPlaying, currentTime, isControl });
    const seq = ++localSeq.current;
    pendingLocal.current = { isPlaying, seq, expiresAt: Date.now() + 1500 };
    socket.emit("playback:update", { roomId, isPlaying, currentTime, isControl }, () => {
      if (pendingLocal.current?.seq === seq) pendingLocal.current = null;
    });
  }, [roomId, socket]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isHlsUrl(source)) return;
    let hls: import("hls.js").default | undefined;
    let cancelled = false;
    import("hls.js").then(({ default: Hls }) => {
      if (cancelled) return;
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = source;
        return;
      }
      if (Hls.isSupported()) {
        hls = new Hls({ startPosition: 0 });
        hls.loadSource(source);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) setFailed(true);
        });
      } else setFailed(true);
    });
    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [source, setFailed]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const apply = () => {
      if (pendingLocal.current && pendingLocal.current.expiresAt > Date.now()) return;
      const latest = playbackRef.current;
      if (latest.controllerId && latest.controllerId === socket.id) return;
      const target = latest.currentTime +
        (latest.isPlaying ? Math.max(0, (Date.now() - latest.updatedAt) / 1000) : 0);
      const seek = Math.abs(video.currentTime - target) > (latest.isControl === false ? 2.5 : 1.15);
      const play = latest.isPlaying && video.paused;
      const pause = !latest.isPlaying && !video.paused;
      if (!seek && !play && !pause) return;
      applyingRemote.current = true;
      if (seek) {
        remoteSeek.current = target;
        video.currentTime = target;
      }
      if (play)
        video.play().then(() => setNeedsGesture(false)).catch(() => setNeedsGesture(true));
      else if (pause) video.pause();
      window.clearTimeout(remoteTimer.current);
      remoteTimer.current = window.setTimeout(() => { applyingRemote.current = false; }, 250);
    };
    const pending = pendingLocal.current;
    const retryTimer = pending && pending.expiresAt > Date.now()
      ? window.setTimeout(apply, pending.expiresAt - Date.now())
      : 0;
    if (!retryTimer) apply();
    return () => window.clearTimeout(retryTimer);
  }, [playback, isHost, socket]);

  const onChange = (playing: boolean, seek = false) => {
    const video = videoRef.current;
    if (!video || applyingRemote.current) return;
    const pending = pendingLocal.current;
    const expected = pending && pending.expiresAt > Date.now() ? pending : playbackRef.current;
    if (!seek && playing === expected.isPlaying) return;
    emitPlayback(playing, video.currentTime);
  };

  return (
    <div className="relative size-full">
      <video
        className="size-full bg-black object-contain"
        ref={videoRef}
        src={isHlsUrl(source) ? undefined : source}
        controls
        playsInline
        preload="metadata"
        onPlay={() => onChange(true)}
        onPause={() => onChange(false)}
        onSeeked={() => {
          const video = videoRef.current;
          if (video && remoteSeek.current !== null && Math.abs(video.currentTime - remoteSeek.current) < 1.15) {
            remoteSeek.current = null;
            return;
          }
          remoteSeek.current = null;
          onChange(!video?.paused, true);
        }}
        onTimeUpdate={() => {
          const video = videoRef.current;
          if ((isHost || playbackRef.current.controllerId === socket.id) && video && !video.paused && Date.now() - lastSent.current > 1800) {
            lastSent.current = Date.now();
            emitPlayback(true, video.currentTime, false);
          }
        }}
        onError={() => setFailed(true)}
      />
      {needsGesture && playback.isPlaying && (
        <Button
          variant="glass"
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-xl bg-white px-4 py-3 text-xs text-stone-900"
          onClick={() =>
            videoRef.current
              ?.play()
              .then(() => setNeedsGesture(false))
              .catch(() => setFailed(true))
          }
        >
          <Play size={19} fill="currentColor" /> برای شروع تماشای هم‌زمان بزن
        </Button>
      )}
      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-stone-900 p-5 text-center text-xs text-white">
          <Link2 size={22} />
          <strong>این لینک در مرورگر پخش نشد</strong>
          <span>
            لینک باید مستقیم و قابل‌دسترسی برای پلیر وب باشد و فرمت مرورگر را پشتیبانی کند.
          </span>
        </div>
      )}
    </div>
  );
}

function YoutubePlayer({
  id,
  isHost,
  playback,
  roomId,
  socket,
}: {
  id: string;
  isHost: boolean;
  playback: Playback;
  roomId: string;
  socket: SocketLike;
}) {
  const playerRef = useRef<PlayerApi | null>(null);
  const readyRef = useRef(false);
  const autoplayBlocked = useRef(false);
  const applyingRemote = useRef(false);
  const applyVersion = useRef(0);
  const lastRemoteAction = useRef<{ time: number; isPlaying: boolean; at: number } | null>(null);
  const lastSample = useRef<{ time: number; at: number; state: number } | null>(null);
  const waitingSince = useRef<number | null>(null);
  const pendingLocal = useRef<(Playback & { seq: number; expiresAt: number }) | null>(null);
  const localSeq = useRef(0);
  const playbackRef = useRef(playback);
  playbackRef.current = playback;
  const [needsGesture, setNeedsGesture] = useState(false);
  const sendControl = useCallback((isPlaying: boolean, currentTime: number) => {
    const seq = ++localSeq.current;
    pendingLocal.current = { isPlaying, currentTime, updatedAt: Date.now(), seq, expiresAt: Date.now() + 1500 };
    lastRemoteAction.current = null;
    socket.emit("playback:update", { roomId, isPlaying, currentTime, isControl: true }, () => {
      if (pendingLocal.current?.seq === seq) pendingLocal.current = null;
    });
  }, [roomId, socket]);

  useEffect(() => {
    let cancelled = false;
    const create = () => {
      if (cancelled || !window.YT?.Player) return;
      playerRef.current = new window.YT.Player(`youtube-${id}`, {
        width: "100%",
        height: "100%",
        videoId: id,
        playerVars: { playsinline: 1, controls: 1, rel: 0, cc_load_policy: 1 },
        events: {
          onReady: () => {
            readyRef.current = true;
            applyYoutubePlayback(playerRef.current, playbackRef.current, applyingRemote, applyVersion, lastRemoteAction);
          },
          onAutoplayBlocked: () => {
            autoplayBlocked.current = true;
            setNeedsGesture(true);
          },
          onStateChange: (event: { data: number }) => {
            if (!readyRef.current || !playerRef.current) return;
            if (![0, 1, 2].includes(event.data)) return;
            if (event.data !== 0 && playerRef.current.getPlayerState() !== event.data) return;
            if (event.data === 1) {
              autoplayBlocked.current = false;
              setNeedsGesture(false);
            }
            if (event.data === 2 && autoplayBlocked.current) return;
            const current = playerRef.current.getCurrentTime();
            const remote = lastRemoteAction.current;
            if (remote && Date.now() - remote.at < 8000 && event.data !== 0 &&
              (event.data === 1) === remote.isPlaying && Math.abs(current - remote.time) < 2.5) {
              lastRemoteAction.current = null;
              return;
            }
            if (applyingRemote.current) return;
            const pending = pendingLocal.current;
            const expected = pending && pending.expiresAt > Date.now() ? pending : playbackRef.current;
            if (event.data !== 0 && (event.data === 1) === expected.isPlaying) return;
            sendControl(event.data === 1, current);
          },
        },
      }) as PlayerApi;
    };
    if (window.YT?.Player) create();
    else {
      const script =
        document.querySelector<HTMLScriptElement>("script[data-youtube-api]") ||
        document.createElement("script");
      if (!script.dataset.youtubeApi) {
        script.src = "https://www.youtube.com/iframe_api";
        script.dataset.youtubeApi = "true";
        document.head.appendChild(script);
      }
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        create();
      };
    }
    return () => {
      cancelled = true;
      readyRef.current = false;
      autoplayBlocked.current = false;
      applyVersion.current++;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [id, sendControl]);

  useEffect(() => {
    const pending = pendingLocal.current;
    if (!readyRef.current) return;
    const delay = pending && pending.expiresAt > Date.now() ? pending.expiresAt - Date.now() : 120;
    const timer = window.setTimeout(() => {
      if (pendingLocal.current && pendingLocal.current.expiresAt > Date.now()) return;
      const latest = playbackRef.current;
      if (latest.controllerId !== socket.id)
        applyYoutubePlayback(playerRef.current, latest, applyingRemote, applyVersion, lastRemoteAction);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [playback, socket]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!readyRef.current || !player) return;
      const state = player.getPlayerState();
      const now = Date.now();
      const pending = pendingLocal.current;
      const activePending = pending && pending.expiresAt > now ? pending : null;
      const expected = activePending ?? playbackRef.current;
      if (expected.isPlaying && state !== 1) {
        waitingSince.current ??= now;
        if (now - waitingSince.current > 1500) setNeedsGesture(true);
      } else {
        waitingSince.current = null;
        setNeedsGesture(false);
      }
      if (state === -1 || state === 5) return;
      const time = player.getCurrentTime();
      const previous = lastSample.current;
      lastSample.current = { time, at: now, state };
      if (!previous || applyingRemote.current) return;
      const expectedTime = previous.time + (previous.state === 1 ? (now - previous.at) / 1000 : 0);
      if (Math.abs(time - expectedTime) < 1.8) return;
      const remote = lastRemoteAction.current;
      if (!activePending && remote && now - remote.at < 8000 && Math.abs(time - remote.time) < 2.5) return;
      sendControl(state === 1 || (state === 3 && expected.isPlaying), time);
    }, 250);
    return () => window.clearInterval(timer);
  }, [sendControl]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if ((isHost || playbackRef.current.controllerId === socket.id) &&
          readyRef.current && !applyingRemote.current &&
          (!pendingLocal.current || pendingLocal.current.expiresAt <= Date.now()) &&
          player?.getPlayerState() === 1)
        socket.emit("playback:update", {
          roomId,
          isPlaying: true,
          currentTime: player.getCurrentTime(),
          isControl: false,
        });
    }, 2000);
    return () => window.clearInterval(timer);
  }, [isHost, roomId, socket]);
  return (
    <div className="relative size-full [&_iframe]:size-full">
      <div className="size-full" id={`youtube-${id}`} />
      {needsGesture && playback.isPlaying && (
        <Button
          variant="glass"
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-xl bg-white px-4 py-3 text-xs text-stone-900"
          onClick={() => playerRef.current?.playVideo()}
        >
          <Play size={19} fill="currentColor" /> برای شروع تماشای هم‌زمان بزن
        </Button>
      )}
    </div>
  );
}

function applyYoutubePlayback(
  player: PlayerApi | null,
  playback: Playback,
  applyingRemote: { current: boolean },
  applyVersion: { current: number },
  lastRemoteAction: { current: { time: number; isPlaying: boolean; at: number } | null },
) {
  if (!player) return;
  const target =
    playback.currentTime +
    (playback.isPlaying ? Math.max(0, (Date.now() - playback.updatedAt) / 1000) : 0);
  let version = 0;
  try {
    const state = player.getPlayerState();
    const seek = Math.abs(player.getCurrentTime() - target) > (playback.isControl === false ? 2.5 : 1.5);
    const play = playback.isPlaying && state !== 1 &&
      (state !== 3 || lastRemoteAction.current?.isPlaying !== true);
    const pause = !playback.isPlaying && (state === 1 || state === 3);
    if (!seek && !play && !pause) return;
    version = ++applyVersion.current;
    applyingRemote.current = true;
    lastRemoteAction.current = { time: target, isPlaying: playback.isPlaying, at: Date.now() };
    if (seek) player.seekTo(target, true);
    if (play) player.playVideo();
    else if (pause) player.pauseVideo();
  } catch {}
  if (version) window.setTimeout(() => {
    if (version === applyVersion.current) applyingRemote.current = false;
  }, 300);
}

declare global {
  interface Window {
    YT?: { Player: new (id: string, options: Record<string, unknown>) => PlayerApi };
    onYouTubeIframeAPIReady?: () => void;
  }
}
