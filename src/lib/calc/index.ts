// Pure TypeScript game-math library for Maple.
//
// Functions here are side-effect free and dependency free (no SvelteKit
// imports) so they are trivially testable and reusable from both the UI and the
// API routes. Every formula and table cites its section of
// docs/research/formulas.md.

export type { CalcInput, Delta, GainResult, StatKey, StatTriple, Target } from './types';
export { emptyStats, emptyTriple } from './types';

export {
	applyTriple,
	attackTerm,
	criticalFactor,
	demonAvengerPureHp,
	demonAvengerStatValue,
	floorGuarded,
	statMultiplier,
	statTotal,
	statTotals
} from './stats';

export * as ied from './ied';

export {
	ARCANE_BANDS,
	LEVEL_MULTIPLIER_TABLE,
	SACRED_MAX_BONUS,
	SACRED_MAX_PENALTY,
	arcaneMultiplier,
	levelMultiplier,
	sacredMultiplier
} from './force';

export type { DamageBreakdown, DamageOptions, DisplayedRange } from './damage';
export { damageBreakdown, damageIndex, displayedRange, forceMultiplier } from './damage';

export type { BowNormalizeArgs, BowTier, CombatPowerArgs, CombatPowerResult } from './combat-power';
export { BOW_BASE_ATT, bowNormalizeAtt, computeCombatPower } from './combat-power';

export { applyDelta, applyDeltas, measureGain, measureGainBatch } from './gain';

export type { PotentialKind, PotentialLine } from './potential-parse';
export { parsePotentialLine, parsePotentialLines } from './potential-parse';
