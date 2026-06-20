export type WeaponId = "sword" | "flameStick" | "forceBlast" | "shock" | "ringFire" | "spikeBall";

export interface WeaponDef { id: WeaponId; name: string; desc: string; tier: 1 | 2; cooldown: number; }

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  sword:      { id: "sword",      name: "Phantom Blade",     desc: "Auto-slashes nearby objects every 2.5s",         tier: 1, cooldown: 2.5 },
  flameStick: { id: "flameStick", name: "Ember Staff",       desc: "Strikes & ignites objects ahead every 4s",        tier: 1, cooldown: 4 },
  forceBlast: { id: "forceBlast", name: "Force Blast",       desc: "Fires an energy blast clearing a lane every 7s",  tier: 1, cooldown: 7 },
  shock:      { id: "shock",      name: "Shock Therapy",     desc: "3 bolts to random targets every 3s",              tier: 2, cooldown: 3 },
  ringFire:   { id: "ringFire",   name: "Ring of Fire",      desc: "Orbs circle you, destroying what they touch",     tier: 2, cooldown: 0.4 },
  spikeBall:  { id: "spikeBall",  name: "Spike Ball of Doom",desc: "Whips a spiked ball far ahead & back every 7s",   tier: 2, cooldown: 7 },
};

export const TIER1: WeaponId[] = ["sword", "flameStick", "forceBlast"];
export const TIER2: WeaponId[] = ["shock", "ringFire", "spikeBall"];

/** Returns the 3 options when the count reaches a milestone, else null. */
export function upgradeOptionsAt(blueDiamonds: number): WeaponId[] | null {
  if (blueDiamonds === 10) return TIER1;
  if (blueDiamonds === 20) return TIER2;
  return null;
}

/** Pure targeting: given active obstacles (worldZ negative = ahead), which ids a weapon destroys this fire. */
export function weaponTargets(
  weapon: WeaponId,
  obstacles: { id: number; worldZ: number; x: number }[],
  rng: () => number,
): number[] {
  const inRange = (lo: number, hi: number) => obstacles.filter((o) => o.worldZ >= lo && o.worldZ <= hi);
  switch (weapon) {
    case "sword": return inRange(-10, 3).map((o) => o.id);
    case "flameStick": return inRange(-18, 3).map((o) => o.id);
    case "forceBlast": return inRange(-70, 3).filter((o) => Math.abs(o.x) < 1.6).map((o) => o.id);
    case "ringFire": return inRange(-5, 3).map((o) => o.id);
    case "spikeBall": return inRange(-130, 3).filter((o) => Math.abs(o.x) < 1.6).map((o) => o.id);
    case "shock": {
      const pool = inRange(-60, 3);
      const out: number[] = [];
      for (let i = 0; i < 3 && pool.length; i++) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0].id);
      return out;
    }
  }
}
