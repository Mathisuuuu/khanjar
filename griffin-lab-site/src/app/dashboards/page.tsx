import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { loadDashboard } from "@/components/dashboard/load";

export const metadata: Metadata = { title: "Dashboards", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ book?: string | string[] }> };

export default async function DashboardsPage({ searchParams }: Props) {
  const requested = (await searchParams).book;
  const data = await loadDashboard(typeof requested === "string" ? requested : undefined);
  return <Dashboard {...data} />;
}
