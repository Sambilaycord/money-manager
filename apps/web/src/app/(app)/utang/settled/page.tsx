import type { Metadata } from "next";
import { UtangListPage } from "../utang-list-page";

export const metadata: Metadata = { title: "Settled utang" };

export default function SettledUtangPage({ searchParams }: PageProps<"/utang/settled">) {
  return <UtangListPage view="settled" searchParams={searchParams} />;
}
