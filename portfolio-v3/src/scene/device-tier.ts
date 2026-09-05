/**
 * A coarse read on how much work this client can absorb, used to size the
 * planet-atlas budget.
 *
 * The sprite sheets are served at full fidelity now that nothing is downscaled
 * at upload time. That is the right picture on a capable machine and too much
 * on a weak one: sixty atlases is both a first-visit download and a large
 * resident texture allocation, and a device that cannot hold it pays in
 * eviction and re-upload churn rather than in a single visible hitch.
 *
 * Every signal here is a hint, not a measurement. `deviceMemory` is rounded to
 * a power of two and capped at 8 for fingerprinting reasons, and
 * `hardwareConcurrency` counts cores without saying how fast they are. Neither
 * is trustworthy alone, so the tier is the *worst* verdict any single signal
 * reaches: a machine is only treated as capable when nothing about it looks
 * constrained.
 *
 * A GPU's `MAX_TEXTURE_SIZE` was tried here and deliberately dropped. Reading
 * it means creating a WebGL context purely to ask a question, on the startup
 * path, on the weak devices this exists to protect — and it answers with a
 * driver cap rather than with throughput, so a fast integrated GPU and a slow
 * one report the same number. The renderer's real limit still matters, but it
 * is enforced where it belongs: every sheet is built to fit inside it.
 */

import { PLANET_ATLASES } from "./starfield/starfield.constants";

export const DEVICE_TIERS = ["low", "medium", "high"] as const;

export type DeviceTier = (typeof DEVICE_TIERS)[number];

export const DEVICE_TIER_TUNING = {
  /* RAM in GB at or below which a device is treated as the matching tier.
     `deviceMemory` saturates at 8, so "high" is simply everything above. */
  memoryGb: { low: 2, medium: 4 },
  /* Logical cores at or below which a device is treated as the matching tier. */
  cores: { low: 4, medium: 8 },
  /* Planet variants per type to download and keep resident. Fewer variants
     costs visual variety, not sharpness: each sprite a reader does see is the
     full-fidelity one. That trade is deliberately preferred over shipping a
     blurrier sheet, because chunky planets beside crisp ones is the exact
     inconsistency this codebase already went out of its way to avoid. */
  variantsPerType: { high: 5, low: 2, medium: 3 },
} as const;

interface NetworkInformation {
  effectiveType?: string;
  saveData?: boolean;
}

function readSignals() {
  const nav = navigator as Navigator & {
    connection?: NetworkInformation;
    deviceMemory?: number;
  };

  return {
    connection: nav.connection,
    cores:
      typeof nav.hardwareConcurrency === "number"
        ? nav.hardwareConcurrency
        : undefined,
    memoryGb:
      typeof nav.deviceMemory === "number" ? nav.deviceMemory : undefined,
  };
}

function rank(tier: DeviceTier) {
  return DEVICE_TIERS.indexOf(tier);
}

function lowest(tiers: DeviceTier[]): DeviceTier {
  return tiers.reduce(
    (worst, tier) => (rank(tier) < rank(worst) ? tier : worst),
    "high" as DeviceTier,
  );
}

function classify(
  value: number | undefined,
  thresholds: { low: number; medium: number },
): DeviceTier | null {
  if (value === undefined) {
    return null;
  }

  if (value <= thresholds.low) {
    return "low";
  }

  return value <= thresholds.medium ? "medium" : "high";
}

function detectDeviceTier(): DeviceTier {
  if (typeof navigator === "undefined") {
    return "high";
  }

  const { connection, cores, memoryGb } = readSignals();

  /* An explicit request to conserve data outranks any hardware reading. */
  if (connection?.saveData === true) {
    return "low";
  }

  const verdicts = [
    classify(memoryGb, DEVICE_TIER_TUNING.memoryGb),
    classify(cores, DEVICE_TIER_TUNING.cores),
  ].filter((verdict): verdict is DeviceTier => verdict !== null);

  if (
    connection?.effectiveType === "slow-2g" ||
    connection?.effectiveType === "2g"
  ) {
    verdicts.push("low");
  } else if (connection?.effectiveType === "3g") {
    verdicts.push("medium");
  }

  /* No signal at all means an older browser, which says nothing about the
     hardware. Assume it can cope rather than degrading every such visitor. */
  return verdicts.length === 0 ? "high" : lowest(verdicts);
}

let cachedTier: DeviceTier | null = null;

/**
 * The tier for this session. Held constant once read: the atlas key list is
 * derived from it, and a list that changed mid-session would leave planets
 * pointing at sheets that were never downloaded.
 */
export function getDeviceTier(): DeviceTier {
  cachedTier ??= detectDeviceTier();
  return cachedTier;
}

/* Clamped to what actually exists on disk, so raising a tier's budget past the
   generated variant count can never ask for a sheet that was never built. */
export function getPlanetVariantsPerType() {
  return Math.max(
    1,
    Math.min(
      PLANET_ATLASES.variantsPerType,
      DEVICE_TIER_TUNING.variantsPerType[getDeviceTier()],
    ),
  );
}

/** Test seam: forces a tier so the budget can be exercised deterministically. */
export function setDeviceTierForTesting(tier: DeviceTier | null) {
  cachedTier = tier;
}
