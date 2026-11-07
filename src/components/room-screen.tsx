"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Clapperboard,
  Copy,
  Link2,
  LoaderCircle,
  Play,
  Radio,
  Users,
} from "lucide-react";
import { Button } from "glisse";
import { getSocket } from "@/lib/socket";
import { getYoutubeId, isHlsUrl } from "@/lib/media";
import { ThemeToggle } from "./theme-toggle";
import { AppDock } from "./app-dock";

type Playback = { isPlaying: boolean; currentTime: number; updatedAt: number };
type RoomData = {
  roomId: string;
  source: string;
  hostName: string;
  isHost: boolean;
  members: string[];
  playback: Playback;
};
type PlayerApi = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (time: number, allow: boolean) => void;
  getCurrentTime: () => number;
  getPlayerState?: () => number;
  destroy: () => void;
};
type SocketLike = ReturnType<typeof getSocket>;

export function RoomScreen({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [socket, setSocket] = useState<SocketLike | null>(null);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSocket(getSocket());
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onMembers = (members: string[]) =>
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

  const copyInvite = useCallback(async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
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
          <Clapperboard size={19} /> Goodoo TV
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
        <section className="mt-6 overflow-hidden rounded-3xl bg-white dark:bg-[#1c1c1e]">
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="min-w-0">
              <p className="text-xs text-[#8e8e93]">کد دعوت</p>
              <strong dir="ltr" className="mt-1 block font-mono text-base tracking-widest">
                {roomId}
              </strong>
            </div>
            <Button
              variant="glass"
              onClick={copyInvite}
              className="flex shrink-0 items-center gap-2 text-[#007aff] dark:text-[#0a84ff]"
            >
              {copied ? <Check size={17} /> : <Copy size={17} />}
              {copied ? "کپی شد" : "دعوت"}
            </Button>
          </div>
          <div className="mx-5 border-t border-black/10 dark:border-white/10" />
          <div className="flex items-center gap-3 px-5 py-4">
            <Users size={18} className="text-[#007aff] dark:text-[#0a84ff]" />
            <span className="flex-1 text-sm">افراد حاضر</span>
            <span className="text-sm text-[#8e8e93]">{room.members.length} نفر</span>
          </div>
          <div className="mx-5 border-t border-black/10 dark:border-white/10" />
          <div className="flex min-w-0 items-center gap-3 px-5 py-4">
            <Link2 size={18} className="shrink-0 text-[#007aff] dark:text-[#0a84ff]" />
            <span className="shrink-0 text-sm">ویدیو</span>
            <span dir="ltr" className="min-w-0 flex-1 truncate text-left text-xs text-[#8e8e93]">
              {room.source}
            </span>
          </div>
        </section>
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
      {/* <AppDock active="home" /> */}
    </main>
  );
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
      key={source}
      source={source}
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
  const lastSent = useRef(0);
  const [needsGesture, setNeedsGesture] = useState(false);
  const emitPlayback = useCallback(
    (isPlaying: boolean, currentTime: number) =>
      socket.emit("playback:update", { roomId, isPlaying, currentTime }),
    [roomId, socket],
  );

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
        hls = new Hls();
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
    if (!video || isHost) return;
    applyingRemote.current = true;
    const target =
      playback.currentTime +
      (playback.isPlaying ? Math.max(0, (Date.now() - playback.updatedAt) / 1000) : 0);
    if (Math.abs(video.currentTime - target) > 1.15) video.currentTime = target;
    if (playback.isPlaying)
      video
        .play()
        .then(() => setNeedsGesture(false))
        .catch(() => setNeedsGesture(true));
    else video.pause();
    const timer = window.setTimeout(() => {
      applyingRemote.current = false;
    }, 250);
    return () => window.clearTimeout(timer);
  }, [playback, isHost]);

  const onChange = (playing: boolean) => {
    const video = videoRef.current;
    if (!video || applyingRemote.current) return;
    if (isHost) emitPlayback(playing, video.currentTime);
    else {
      applyingRemote.current = true;
      const target =
        playback.currentTime +
        (playback.isPlaying ? Math.max(0, (Date.now() - playback.updatedAt) / 1000) : 0);
      video.currentTime = target;
      if (playback.isPlaying) video.play().catch(() => {});
      else video.pause();
      window.setTimeout(() => {
        applyingRemote.current = false;
      }, 250);
    }
  };

  return (
    <div className="relative size-full">
      <video
        className="size-full bg-black object-contain"
        ref={videoRef}
        src={isHlsUrl(source) ? undefined : source}
        controls={isHost}
        playsInline
        preload="metadata"
        onPlay={() => onChange(true)}
        onPause={() => onChange(false)}
        onSeeked={() => onChange(!videoRef.current?.paused)}
        onTimeUpdate={() => {
          const video = videoRef.current;
          if (isHost && video && !video.paused && Date.now() - lastSent.current > 1800) {
            lastSent.current = Date.now();
            emitPlayback(true, video.currentTime);
          }
        }}
        onError={() => setFailed(true)}
      />
      {needsGesture && !isHost && playback.isPlaying && (
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
  const applyingRemote = useRef(false);
  const playbackRef = useRef(playback);
  playbackRef.current = playback;

  useEffect(() => {
    let cancelled = false;
    const create = () => {
      if (cancelled || !window.YT?.Player) return;
      playerRef.current = new window.YT.Player(`youtube-${id}`, {
        width: "100%",
        height: "100%",
        videoId: id,
        playerVars: { playsinline: 1, controls: 1, rel: 0 },
        events: {
          onReady: () =>
            applyYoutubePlayback(playerRef.current, playbackRef.current, applyingRemote),
          onStateChange: (event: { data: number }) => {
            if (applyingRemote.current || !playerRef.current) return;
            const current = playerRef.current.getCurrentTime();
            if (isHost && [0, 1, 2].includes(event.data))
              socket.emit("playback:update", {
                roomId,
                isPlaying: event.data === 1,
                currentTime: current,
              });
            else if (!isHost && [0, 1, 2].includes(event.data))
              applyYoutubePlayback(playerRef.current, playbackRef.current, applyingRemote);
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
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [id, isHost, roomId, socket]);

  useEffect(() => {
    applyYoutubePlayback(playerRef.current, playback, applyingRemote);
  }, [playback]);
  useEffect(() => {
    if (!isHost) return;
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (player && player.getPlayerState?.() === 1)
        socket.emit("playback:update", {
          roomId,
          isPlaying: true,
          currentTime: player.getCurrentTime(),
        });
    }, 2000);
    return () => window.clearInterval(timer);
  }, [isHost, roomId, socket]);
  return (
    <div className="relative size-full [&_iframe]:size-full">
      <div className="size-full" id={`youtube-${id}`} />
    </div>
  );
}

function applyYoutubePlayback(
  player: PlayerApi | null,
  playback: Playback,
  applyingRemote: { current: boolean },
) {
  if (!player) return;
  applyingRemote.current = true;
  const target =
    playback.currentTime +
    (playback.isPlaying ? Math.max(0, (Date.now() - playback.updatedAt) / 1000) : 0);
  try {
    if (Math.abs(player.getCurrentTime() - target) > 1.5) player.seekTo(target, true);
    if (playback.isPlaying) player.playVideo();
    else player.pauseVideo();
  } catch {}
  window.setTimeout(() => {
    applyingRemote.current = false;
  }, 300);
}

declare global {
  interface Window {
    YT?: { Player: new (id: string, options: Record<string, unknown>) => PlayerApi };
    onYouTubeIframeAPIReady?: () => void;
  }
}
