import Link from "next/link";

interface AuthHeadingProps {
  title: string;
  description: string;
}

/**
 * The top of every sign-in page, so all four share one clear hierarchy: a
 * large title, then a full-size line under it, both well above field labels.
 */
export function AuthHeading({ title, description }: AuthHeadingProps) {
  return (
    <header className="mb-8">
      <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h1>
      <p className="mt-3 text-base text-pretty text-muted">{description}</p>
    </header>
  );
}

/** The "New here? Create an account" line, set apart from the form it follows. */
export function AuthSwitch({ prompt, href, label }: { prompt: string; href: string; label: string }) {
  return (
    <p className="mt-8 border-t border-border pt-6 text-center text-sm text-muted">
      {prompt}{" "}
      <Link
        href={href}
        className="rounded font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
      >
        {label}
      </Link>
    </p>
  );
}
