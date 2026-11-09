import { spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getUser } from "@/lib/auth";

export const runtime = "nodejs";

type Job = {
  dir: string;
  child?: ChildProcess;
  ready: Promise<void>;
  finished: boolean;
  readyForPlayback: boolean;
  startedAt: number;
  durationSeconds: number;
  processedSeconds: number;
  error?: Error;
  cleanup?: NodeJS.Timeout;
};

const jobs = new Map<string, Job>();
const allowedHost = (hostname: string) =>
  hostname === "fj-ios.com" || hostname === "tdmm2.ir" || hostname.endsWith(".tdmm2.ir");

async function resolveSource(input: string) {
  let target = new URL(input);
  if (
    !allowedHost(target.hostname) ||
    !["http:", "https:"].includes(target.protocol) ||
    target.port ||
    target.username ||
    target.password
  )
    throw new Error("Media host is not allowed");

  for (let redirects = 0; redirects <= 5; redirects++) {
    const response = await fetch(target, {
      headers: { Range: "bytes=0-0" },
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    await response.body?.cancel();
    if (![301, 302, 303, 307, 308].includes(response.status)) return target.href;
    const location = response.headers.get("location");
    if (!location || redirects === 5) throw new Error("Too many media redirects");
    target = new URL(location, target);
    if (
      !allowedHost(target.hostname) ||
      !["http:", "https:"].includes(target.protocol) ||
      target.port ||
      target.username ||
      target.password
    )
      throw new Error("Media redirect is not allowed");
  }
  throw new Error("Could not resolve media URL");
}

function touch(id: string, job: Job) {
  clearTimeout(job.cleanup);
  job.cleanup = setTimeout(() => {
    if (jobs.get(id) !== job) return;
    jobs.delete(id);
    job.child?.kill("SIGTERM");
    if (job.dir) void rm(job.dir, { recursive: true, force: true });
  }, 30 * 60 * 1000);
  job.cleanup.unref();
}

async function start(job: Job, input: string) {
  job.dir = await mkdtemp(join(tmpdir(), "kinema-hls-"));
  const source = await resolveSource(input);
  const playlist = join(job.dir, "index.m3u8");
  const child = spawn(
    "ffmpeg",
    [
      "-nostdin", "-y", "-i", source, "-map", "0:v:0", "-map", "0:a:0?",
      "-c:v", "libx264", "-preset", "ultrafast", "-threads", "2", "-crf", "23",
      "-c:a", "aac", "-b:a", "128k", "-ac", "2", "-progress", "pipe:1", "-nostats", "-f", "hls",
      "-hls_time", "6", "-hls_list_size", "0", "-hls_flags", "independent_segments",
      "-hls_segment_filename", join(job.dir, "segment_%05d.ts"), playlist,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  job.child = child;
  let progressBuffer = "";
  child.stdout?.setEncoding("utf8").on("data", (chunk: string) => {
    progressBuffer += chunk;
    const lines = progressBuffer.split("\n");
    progressBuffer = lines.pop() || "";
    for (const line of lines) {
      const [key, value] = line.trim().split("=");
      if (key === "out_time_us" && Number.isFinite(Number(value)))
        job.processedSeconds = Number(value) / 1_000_000;
    }
  });
  child.stderr?.setEncoding("utf8").on("data", (chunk: string) => {
    const match = chunk.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (match) job.durationSeconds = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
  });
  child.once("error", (error) => {
    job.error = error;
    job.finished = true;
  });
  child.once("close", (code) => {
    if (code) job.error = new Error(`ffmpeg exited with ${code}`);
    job.finished = true;
  });

  for (let attempt = 0; attempt < 240; attempt++) {
    if (job.error) throw job.error;
    try {
      const text = await readFile(playlist, "utf8");
      const firstSegment = text.match(/^(segment_\d+\.ts)$/m)?.[1];
      if (firstSegment) {
        await stat(join(job.dir, firstSegment));
        job.readyForPlayback = true;
        return;
      }
    } catch {}
    if (job.finished) throw job.error || new Error("No HLS segments were produced");
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("HLS conversion took too long to start");
}

async function getJob(input: string, waitForPlayback = true) {
  const id = createHash("sha256").update(input).digest("hex");
  let job = jobs.get(id);
  if (!job) {
    if ([...jobs.values()].filter((item) => !item.finished).length >= 2)
      throw new Error("Too many videos are converting");
    job = {
      dir: "",
      ready: Promise.resolve(),
      finished: false,
      readyForPlayback: false,
      startedAt: Date.now(),
      durationSeconds: 0,
      processedSeconds: 0,
    };
    jobs.set(id, job);
    job.ready = start(job, input).catch(async (error) => {
      job!.error = error as Error;
      job!.finished = true;
      job!.child?.kill("SIGTERM");
      if (job!.dir) await rm(job!.dir, { recursive: true, force: true });
    });
  }
  touch(id, job);
  if (waitForPlayback) {
    await job.ready;
    if (job.error) throw job.error;
  }
  return job;
}

async function serve(request: Request, asset: string) {
  if (!(await getUser())) return new Response(null, { status: 401 });
  const input = new URL(request.url).searchParams.get("url");
  if (!input || input.length > 4096) return new Response("Invalid media URL", { status: 400 });
  if (asset !== "index.m3u8" && asset !== "status.json" && !/^segment_\d+\.ts$/.test(asset))
    return new Response("Invalid media segment", { status: 404 });

  try {
    const job = await getJob(input, asset !== "status.json");
    if (asset === "status.json") {
      const percent = job.durationSeconds
        ? Math.min(100, Math.floor((job.processedSeconds / job.durationSeconds) * 100))
        : null;
      const elapsed = (Date.now() - job.startedAt) / 1000;
      const speed = elapsed ? job.processedSeconds / elapsed : 0;
      return Response.json({
        ready: job.readyForPlayback,
        finished: job.finished,
        error: Boolean(job.error),
        percent: job.finished && !job.error ? 100 : percent,
        etaSeconds: speed && job.durationSeconds
          ? Math.max(0, Math.ceil((job.durationSeconds - job.processedSeconds) / speed))
          : null,
      }, { headers: { "Cache-Control": "no-store" } });
    }
    const path = join(job.dir, asset);
    if (asset === "index.m3u8") {
      const playlist = (await readFile(path, "utf8")).replace(
        /^(segment_\d+\.ts)$/gm,
        (segment) => `/api/media/transcode/${segment}?url=${encodeURIComponent(input)}`,
      );
      return new Response(playlist, {
        headers: { "Content-Type": "application/vnd.apple.mpegurl", "Cache-Control": "no-store" },
      });
    }
    return new Response(await readFile(path), {
      headers: { "Content-Type": "video/mp2t", "Cache-Control": "private, max-age=3600" },
    });
  } catch (error) {
    console.error("Media transcode failed", error);
    return new Response("Video conversion failed or is busy", { status: 503 });
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ asset: string[] }> },
) {
  const { asset } = await context.params;
  return serve(request, asset.join("/"));
}
