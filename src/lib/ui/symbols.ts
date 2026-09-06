// View model for the symbol panel beside the equipment grid.
//
// `Character.symbols` stores one level per region. Everything else on screen —
// force, main stat, the cost of the next level — is derived from the tables in
// `$lib/data/symbols`, which use their own region ids (`chu_chu_island`,
// `arcus`, `shangri_la`); the two vocabularies are reconciled here.
//
// Note the naming: the schema and the research call the Grandis pool "Sacred",
// the in-game window calls it "Authentic". The tab label follows the game.

import {
	ARCANE_MAX_LEVEL,
	ARCANE_REGIONS as ARCANE_REGION_DATA,
	GRAND_SACRED_REGIONS,
	SACRED_MAX_LEVEL,
	SACRED_REGIONS as SACRED_REGION_DATA,
	arcaneForce,
	arcaneMainStat,
	arcaneSymbolsToNextLevel,
	sacredForce,
	sacredMainStat,
	sacredSymbolsToNextLevel,
	type ArcaneRegion as DataArcaneRegion,
	type GrandSacredRegion,
	type SacredRegion as DataSacredRegion
} from '$lib/data/symbols';
import {
	ARCANE_REGIONS as ARCANE_SLOTS,
	SACRED_REGIONS as SACRED_SLOTS,
	type ArcaneRegion,
	type SacredRegion,
	type Symbols
	// Leaf module, NOT the `$lib/schema` barrel: the barrel re-exports
	// `validate.ts`, which pulls the 1.15 MB item catalogue into the bundle.
} from '$lib/schema/character';
import { humanize } from '$lib/ui/format';

/** One symbol as drawn: a hexagon plus a level and a bar. */
export interface SymbolTile {
	key: string;
	name: string;
	/** `null` when the character document has no level for this region. */
	level: number | null;
	maxLevel: number;
	maxed: boolean;
	/** Arcane / Authentic force this symbol contributes at its current level. */
	force: number;
	/** Main stat contributed. Grand Sacred symbols give none. */
	stat: number;
	/** Symbols needed for the next level, or `null` at max / unrecorded. */
	nextCost: number | null;
	/** Fraction of the way to max level, 0–1, for the progress bar. */
	progress: number;
	grand: boolean;
}

export interface SymbolPool {
	id: 'arcane' | 'authentic';
	label: string;
	forceLabel: string;
	tiles: SymbolTile[];
	/** How many tiles actually have a recorded level. */
	recorded: number;
	totalForce: number;
	totalStat: number;
	maxedCount: number;
}

/** Schema region id → the id the data tables use. */
const ARCANE_KEYS: Record<ArcaneRegion, DataArcaneRegion> = {
	vanishingJourney: 'vanishing_journey',
	chuchu: 'chu_chu_island',
	lachelein: 'lachelein',
	arcana: 'arcana',
	morass: 'morass',
	esfera: 'esfera'
};

/**
 * `SacredRegion` in the schema includes Tallahart, which the data module models
 * as a *Grand* Sacred region — same force pool, no main stat.
 */
const SACRED_KEYS: Record<SacredRegion, DataSacredRegion | GrandSacredRegion> = {
	cernium: 'cernium',
	hotelArcus: 'arcus',
	odium: 'odium',
	shangrila: 'shangri_la',
	arteria: 'arteria',
	carcion: 'carcion',
	tallahart: 'tallahart'
};

function clamp01(value: number): number {
	if (!Number.isFinite(value) || value <= 0) return 0;
	return value > 1 ? 1 : value;
}

function arcaneTile(region: ArcaneRegion, level: number | null): SymbolTile {
	const key = ARCANE_KEYS[region];
	const lv = level ?? 0;
	const maxed = lv >= ARCANE_MAX_LEVEL;
	return {
		key: region,
		name: ARCANE_REGION_DATA[key].name,
		level,
		maxLevel: ARCANE_MAX_LEVEL,
		maxed: level !== null && maxed,
		force: level === null ? 0 : arcaneForce(lv),
		stat: level === null ? 0 : arcaneMainStat(lv),
		nextCost: level === null || maxed ? null : arcaneSymbolsToNextLevel(lv),
		progress: level === null ? 0 : clamp01(lv / ARCANE_MAX_LEVEL),
		grand: false
	};
}

function sacredTile(key: string, name: string, level: number | null, grand: boolean): SymbolTile {
	const lv = level ?? 0;
	const maxed = lv >= SACRED_MAX_LEVEL;
	return {
		key,
		name,
		level,
		maxLevel: SACRED_MAX_LEVEL,
		maxed: level !== null && maxed,
		force: level === null ? 0 : sacredForce(lv),
		stat: level === null || grand ? 0 : sacredMainStat(lv),
		nextCost: level === null || maxed ? null : sacredSymbolsToNextLevel(lv),
		progress: level === null ? 0 : clamp01(lv / SACRED_MAX_LEVEL),
		grand
	};
}

function summarize(
	id: SymbolPool['id'],
	label: string,
	forceLabel: string,
	tiles: SymbolTile[]
): SymbolPool {
	return {
		id,
		label,
		forceLabel,
		tiles,
		recorded: tiles.filter((t) => t.level !== null).length,
		totalForce: tiles.reduce((sum, t) => sum + t.force, 0),
		totalStat: tiles.reduce((sum, t) => sum + t.stat, 0),
		maxedCount: tiles.filter((t) => t.maxed).length
	};
}

/**
 * The Arcane pool. All six regions are always listed — an unrecorded one shows
 * as a blank tile, which is the useful state ("you never captured Esfera").
 */
export function arcanePool(symbols: Symbols | undefined): SymbolPool {
	const levels = symbols?.arcane ?? {};
	const tiles = ARCANE_SLOTS.map((region) => arcaneTile(region, levels[region] ?? null));
	return summarize('arcane', 'Arcane', 'Arcane Force', tiles);
}

/**
 * The Authentic pool: the six Sacred regions, plus Tallahart and anything in
 * `symbols.grandis`, which feed the same force pool but grant no main stat.
 */
export function authenticPool(symbols: Symbols | undefined): SymbolPool {
	const levels = symbols?.sacred ?? {};
	const tiles: SymbolTile[] = [];

	for (const region of SACRED_SLOTS) {
		const key = SACRED_KEYS[region];
		const grand = key in GRAND_SACRED_REGIONS;
		const level = levels[region] ?? null;
		// Grand Sacred is late-game content; only show it once it is recorded.
		if (grand && level === null) continue;
		const name = grand
			? GRAND_SACRED_REGIONS[key as GrandSacredRegion].name
			: SACRED_REGION_DATA[key as DataSacredRegion].name;
		tiles.push(sacredTile(region, name, level, grand));
	}

	for (const [key, level] of Object.entries(symbols?.grandis ?? {})) {
		if (tiles.some((t) => t.key === key)) continue;
		const name =
			key in GRAND_SACRED_REGIONS
				? GRAND_SACRED_REGIONS[key as GrandSacredRegion].name
				: humanize(key);
		tiles.push(sacredTile(key, name, level, true));
	}

	return summarize('authentic', 'Authentic', 'Authentic Force', tiles);
}
