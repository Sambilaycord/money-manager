// Turns a session's User-Agent string into a short name a person recognises,
// like "Chrome on Windows". Only the common browsers and systems are named;
// anything else falls back to a generic label rather than a raw UA string.

// Order matters: Edge and Opera also say "Chrome", and Chrome also says "Safari".
const BROWSERS: readonly [RegExp, string][] = [
  [/Edg(e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
];

const SYSTEMS: readonly [RegExp, string][] = [
  [/iPhone/, "iPhone"],
  [/iPad/, "iPad"],
  [/Android/, "Android"],
  [/Windows/, "Windows"],
  [/Mac OS X|Macintosh/, "Mac"],
  [/CrOS/, "ChromeOS"],
  [/Linux/, "Linux"],
];

function firstMatch(text: string, table: readonly [RegExp, string][]): string | null {
  return table.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

/**
 * A readable name for the device behind a session. The mobile app talks to
 * Supabase through the platform's HTTP stack, which identifies itself as
 * okhttp on Android and CFNetwork on iOS, so those read as the app.
 */
export function describeUserAgent(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  if (/okhttp/i.test(userAgent)) return "Mobile app on Android";
  if (/CFNetwork|Darwin/.test(userAgent) && !/Mozilla/.test(userAgent)) return "Mobile app on iPhone";

  const browser = firstMatch(userAgent, BROWSERS);
  const system = firstMatch(userAgent, SYSTEMS);
  if (browser && system) return `${browser} on ${system}`;
  if (browser) return browser;
  if (system) return system;
  // Sessions signed in before the website passed the browser's details along
  // were recorded as the server itself ("node").
  return "Web browser";
}
