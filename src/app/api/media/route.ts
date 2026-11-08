import { getUser } from "@/lib/auth";

const allowedHost = (hostname: string) =>
  hostname === "fj-ios.com" || hostname === "tdmm2.ir" || hostname.endsWith(".tdmm2.ir");
// shortcut: proxy only fj-ios.com and tdmm2.ir links; add providers after reviewing their redirects.

async function forwardMedia(request: Request, method: "GET" | "HEAD") {
  if (!(await getUser())) return new Response(null, { status: 401 });

  const input = new URL(request.url).searchParams.get("url");
  if (!input || input.length > 4096) return new Response("Invalid media URL", { status: 400 });

  let target: URL;
  try {
    target = new URL(input);
  } catch {
    return new Response("Invalid media URL", { status: 400 });
  }
  if (
    !allowedHost(target.hostname) ||
    !["http:", "https:"].includes(target.protocol) ||
    target.port ||
    target.username ||
    target.password
  )
    return new Response("Media host is not allowed", { status: 403 });

  const headers = new Headers();
  for (const name of ["range", "if-range", "if-modified-since", "if-none-match"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  let upstream: Response | undefined;
  try {
    for (let redirects = 0; redirects <= 5; redirects++) {
      upstream = await fetch(target, {
        method,
        headers,
        redirect: "manual",
        cache: "no-store",
        signal: request.signal,
      });
      if (![301, 302, 303, 307, 308].includes(upstream.status)) break;
      const location = upstream.headers.get("location");
      if (!location || redirects === 5) return new Response("Too many redirects", { status: 502 });
      target = new URL(location, target);
      if (
        !allowedHost(target.hostname) ||
        !["http:", "https:"].includes(target.protocol) ||
        target.port ||
        target.username ||
        target.password
      )
        return new Response("Media redirect is not allowed", { status: 502 });
    }
  } catch {
    return new Response("Media source unavailable", { status: 502 });
  }

  if (!upstream) return new Response("Media unavailable", { status: 502 });
  const responseHeaders = new Headers({ "Cache-Control": "private, no-store" });
  for (const name of ["accept-ranges", "content-length", "content-range", "content-type", "etag", "last-modified"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  if (responseHeaders.get("content-type") === "application/octet-stream" && /\.mkv(?:$|\?)/i.test(target.pathname))
    responseHeaders.set("content-type", "video/x-matroska");
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export const GET = (request: Request) => forwardMedia(request, "GET");
export const HEAD = (request: Request) => forwardMedia(request, "HEAD");
