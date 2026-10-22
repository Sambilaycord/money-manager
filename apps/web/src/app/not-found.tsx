import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="font-mono text-sm text-muted">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-sm text-muted">That page doesn&apos;t exist or has moved.</p>
      <Link href="/" className={buttonClassName("secondary", "mt-2")}>
        Back to home
      </Link>
    </main>
  );
}
