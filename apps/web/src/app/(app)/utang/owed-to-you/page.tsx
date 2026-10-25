import type { Metadata } from "next";
import { UtangListPage } from "../utang-list-page";

export const metadata: Metadata = { title: "Owed to you" };

export default function OwedToYouPage({ searchParams }: PageProps<"/utang/owed-to-you">) {
  return <UtangListPage view="owed-to-you" searchParams={searchParams} />;
}
