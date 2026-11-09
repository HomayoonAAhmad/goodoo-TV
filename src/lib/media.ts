export function getYoutubeId(input: string) {
  try {
    const url = new URL(input);
    if (url.hostname === "youtu.be") return url.pathname.slice(1).split("/")[0] || null;
    if (!/(^|\.)youtube\.com$/.test(url.hostname)) return null;
    return (
      url.searchParams.get("v") ||
      url.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] ||
      null
    );
  } catch {
    return null;
  }
}

export function isHlsUrl(url: string) {
  return /\.m3u8(?:$|\?)/i.test(url);
}

export function getPlayableSource(input: string) {
  try {
    const url = new URL(input);
    const provider =
      url.hostname === "fj-ios.com" ||
      url.hostname === "tdmm2.ir" ||
      url.hostname.endsWith(".tdmm2.ir");
    const filename = `${url.pathname}?${url.searchParams.get("f") || ""}`;
    return provider && /\.mkv(?:$|[?&])/i.test(filename)
      ? `/api/media/transcode/index.m3u8?url=${encodeURIComponent(input)}`
      : input;
  } catch {
    return input;
  }
}
