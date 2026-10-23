const STAR_COUNT = 70;

/**
 * Fixed pseudo-random positions (a small LCG with a constant seed), so the
 * server and the browser draw the same sky and nothing reshuffles on reload.
 */
function starField(count: number) {
  let seed = 7;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    x: next() * 100,
    // Denser near the top, as a night sky looks above a horizon.
    y: next() ** 1.6 * 85,
    radius: next() < 0.15 ? 1.6 : 0.9,
    twinkles: next() < 0.35,
    delay: next() * 4,
  }));
}

const STARS = starField(STAR_COUNT);

const CLOUD_PATH =
  "M30 80A22 22 0 0 1 34 37A32 32 0 0 1 92 22A40 40 0 0 1 160 40A22 22 0 0 1 172 80Z";

const CLOUDS = [
  { className: "top-[6%] -left-16 w-80", delay: "0s" },
  { className: "top-[28%] -right-24 w-[26rem]", delay: "-30s" },
  { className: "top-[62%] left-[18%] w-64 opacity-70", delay: "-55s" },
  { className: "bottom-[4%] -right-10 w-72 opacity-80", delay: "-12s" },
];

/**
 * Clouds by day, stars and a crescent moon by night, behind every page. Each
 * layer is painted with a theme colour that is transparent in the scheme it
 * doesn't belong to, so switching themes needs no script.
 */
export function SkyBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-linear-to-b from-(--sky-top) to-(--sky-bottom)"
    >
      <svg className="absolute inset-0 size-full" preserveAspectRatio="none">
        {STARS.map((star) => (
          <circle
            key={star.id}
            cx={`${star.x}%`}
            cy={`${star.y}%`}
            r={star.radius}
            className={`fill-star-fill ${star.twinkles ? "motion-safe:animate-twinkle" : ""}`}
            style={{ animationDelay: `${star.delay}s` }}
          />
        ))}
      </svg>

      {/* Tucked into the corner, outside the content column, so it never sits
          behind a page's header actions. */}
      <div className="absolute top-4 right-4 size-10 overflow-hidden rounded-full bg-(--moon) shadow-[0_0_70px_30px_var(--glow)]">
        <div className="absolute -top-1 -right-2 size-9 rounded-full bg-(--moon-shadow)" />
      </div>

      {CLOUDS.map((cloud) => (
        <svg
          key={cloud.className}
          viewBox="0 0 200 90"
          className={`absolute fill-cloud-fill motion-safe:animate-drift ${cloud.className}`}
          style={{ animationDelay: cloud.delay }}
        >
          <path d={CLOUD_PATH} />
        </svg>
      ))}
    </div>
  );
}
