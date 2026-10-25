import Link from "next/link";
import { WalletIcon } from "@/components/icons";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-lg font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-sky to-cloud text-sky-ink ring-1 ring-sky-ink/10">
        <WalletIcon width={18} height={18} />
      </span>
      Money Manager
    </Link>
  );
}
