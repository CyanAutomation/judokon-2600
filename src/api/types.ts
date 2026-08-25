export const STAT_KEYS = ["power", "speed", "technique", "kumikata", "newaza"] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export interface Stats {
  power: number;
  speed: number;
  technique: number;
  kumikata: number;
  newaza: number;
}

export interface Judoka {
  id: string;
  slug: string;
  firstname: string;
  surname: string;
  country: string;
  countryCode: string;
  weightClass: string;
  stats: Stats;
}
