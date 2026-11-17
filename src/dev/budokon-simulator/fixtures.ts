import type { Judoka, Stats } from "../../api/types";

interface FixtureProfile {
  firstname: string;
  surname: string;
  country: string;
  countryCode: string;
  slug: string;
  stats: Stats;
}

const WEIGHT_CLASSES = [
  "-48", "-52", "-57", "-60", "-63", "-66", "-70", "-73", "-78", "-81", "-90", "-100", "+78", "+100"
] as const;

const PROFILES = [
  { firstname: "Nova", surname: "Circuit", country: "Japan", countryCode: "JP", slug: "nova-circuit", stats: { power: 10, speed: 6, technique: 8, kumikata: 3, newaza: 5 } },
  { firstname: "Kiri", surname: "Pixel", country: "Canada", countryCode: "CA", slug: "kiri-pixel", stats: { power: 5, speed: 6, technique: 4, kumikata: 10, newaza: 8 } },
  { firstname: "Juno", surname: "Byte", country: "Brazil", countryCode: "BR", slug: "juno-byte", stats: { power: 7, speed: 6, technique: 10, kumikata: 5, newaza: 2 } },
  { firstname: "Miko", surname: "Orbit", country: "France", countryCode: "FR", slug: "miko-orbit", stats: { power: 3, speed: 6, technique: 6, kumikata: 8, newaza: 10 } },
  { firstname: "Taro", surname: "Vector", country: "Mongolia", countryCode: "MN", slug: "taro-vector", stats: { power: 8, speed: 6, technique: 3, kumikata: 6, newaza: 7 } },
  { firstname: "Yuki", surname: "Comet", country: "New Zealand", countryCode: "NZ", slug: "yuki-comet", stats: { power: 6, speed: 6, technique: 9, kumikata: 4, newaza: 6 } }
] satisfies readonly FixtureProfile[];

function classSlug(weightClass: string): string {
  return weightClass.startsWith("+") ? `over-${weightClass.slice(1)}` : `under-${weightClass.slice(1)}`;
}

function createFixtures(): Judoka[] {
  return WEIGHT_CLASSES.flatMap(weightClass => PROFILES.map((profile, index) => {
    const identity = `${classSlug(weightClass)}-${profile.slug}`;
    return Object.freeze({
      id: `sim-${classSlug(weightClass)}-${index + 1}`,
      slug: `sim-${identity}`,
      firstname: profile.firstname,
      surname: profile.surname,
      country: profile.country,
      countryCode: profile.countryCode,
      weightClass,
      stats: Object.freeze({ ...profile.stats })
    });
  }));
}

/** Fictional, deterministic catalogue entries used only by simulator mode and tests. */
export const SIMULATED_JUDOKA: readonly Judoka[] = Object.freeze(createFixtures());
