import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p className="rounded-full bg-cloud px-3 py-1 font-mono text-xs font-medium text-cloud-ink">
        404
      </p>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-muted">That page doesn&apos;t exist or has moved.</p>
      <Link href="/" className={buttonClassName("secondary", "mt-8")}>
        Back to home
      </Link>
    </main>
  );
}
