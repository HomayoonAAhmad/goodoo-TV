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
