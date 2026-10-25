import type { Metadata } from "next";
import { UtangListPage } from "../utang-list-page";

export const metadata: Metadata = { title: "You owe" };

export default function YouOwePage({ searchParams }: PageProps<"/utang/you-owe">) {
  return <UtangListPage view="you-owe" searchParams={searchParams} />;
}
