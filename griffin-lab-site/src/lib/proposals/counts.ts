import "server-only";
import { strategyStats, type StrategyStat } from "@/content/home";
import { getDb } from "@/lib/db";
import { makeT } from "@/lib/i18n/core";
import type { ProposalStatus } from "./types";

/**
 * Compteurs de stratégies (accueil et Discord) : les chiffres de départ de
 * content/home.ts, auxquels s'ajoutent les propositions réelles de la base.
 * « En attente » regroupe la file et les tests en cours.
 */

export type StrategyCounts = Record<StrategyStat["status"], { total: number; week: number }>;

const groups: Record<StrategyStat["status"], ProposalStatus[]> = {
  pending: ["pending", "testing"],
  validated: ["validated"],
  rejected: ["rejected"],
};

export async function getStrategyCounts(): Promise<StrategyCounts> {
  const base = strategyStats(makeT("en"));
  let rows: { status: ProposalStatus; total: string; week: string }[] = [];
  try {
    const db = await getDb();
    rows = await db.query(
      `SELECT status, count(*) AS total, count(*) FILTER (WHERE updated_at > now() - interval '7 days') AS week
       FROM proposals GROUP BY status`,
    );
  } catch (error) {
    console.error("Compteurs des propositions indisponibles :", error);
  }
  const counts = {} as StrategyCounts;
  for (const stat of base) {
    const mine = rows.filter((r) => groups[stat.status].includes(r.status));
    counts[stat.status] = {
      total: stat.total + mine.reduce((sum, r) => sum + Number(r.total), 0),
      week: stat.thisWeek + mine.reduce((sum, r) => sum + Number(r.week), 0),
    };
  }
  return counts;
}
