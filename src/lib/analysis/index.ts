// The analysis layer: `Character` -> `Analysis`.
//
// See types.ts for the contract and docs/plans/2026-09-06-maple-design.md §4-§5
// for the design. Server-safe and SvelteKit-free apart from the `$lib` aliases.

export * from './types';

export { AnalysisError, type AnalysisErrorCode } from './errors';
export { UPGRADE_KINDS, optionsFromSearchParams } from './http';
export { toCalcInput, type AdapterResult } from './adapter';
export {
	residuals,
	summarizeGear,
	type GearItemSummary,
	type GearSummary,
	type GearTotals
} from './gear';
export { buildChecksums, combatPowerFor, bowBaseAttFor } from './checksums';
export {
	generateCandidates,
	STAR_BREAKPOINTS,
	weakest,
	type CandidateOptions,
	type CandidateResult,
	type UpgradeCandidate
} from './candidates';
export { DEFAULT_TOP_N, rankCandidates, type RankOptions } from './rank';
export { mainStatEquivalent, statWorth, IED_LINE_VALUES } from './stat-worth';
export { DEFAULT_TARGET_ID, PRESET_TARGETS, listTargets, resolveTarget } from './targets';
export {
	analyze,
	analyzeAsync,
	loadBossBoardBuilder,
	whatIf,
	type AnalyzeDeps,
	type BossBoardBuilder,
	type BossBoardBuildOptions
} from './analyze';
