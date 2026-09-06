import { z } from 'zod';

/**
 * A stat as the GMS hover tooltip decomposes it.
 *
 * `total = floor(base * (1 + percent / 100)) + flat`
 *
 * - `base`  — the "% applied" flat pool (AP + gear + flames + scrolls + stars)
 * - `percent` — whole percent (`40` means 40%)
 * - `flat`  — the "% not applied" pool (hyper stats, symbols, legion, inner ability)
 *
 * `percent` and `flat` are optional so an agent can honour the "omit zero fields
 * entirely, never emit 0" extraction rule; absent means zero for the identity above.
 */
export const StatTripleSchema = z
	.strictObject({
		base: z.number(),
		percent: z.number().optional(),
		flat: z.number().optional()
	})
	.describe('base / % / %-not-applied split from a stat-window hover tooltip');

export type StatTriple = z.infer<typeof StatTripleSchema>;

/**
 * A bag of flat and percent stats. Every field is optional and absent means
 * "not captured" — never write a 0 to mean "none".
 */
export const StatBlockSchema = z
	.strictObject({
		str: z.number().optional(),
		dex: z.number().optional(),
		int: z.number().optional(),
		luk: z.number().optional(),
		maxHp: z.number().optional(),
		maxMp: z.number().optional(),
		att: z.number().optional(),
		matt: z.number().optional(),
		def: z.number().optional(),
		speed: z.number().optional(),
		jump: z.number().optional(),
		allStatPct: z.number().optional(),
		bossDmgPct: z.number().optional(),
		iedPct: z.number().optional(),
		dmgPct: z.number().optional(),
		maxHpPct: z.number().optional(),
		maxMpPct: z.number().optional()
	})
	.describe('flat + percent stats as printed on an item tooltip');

export type StatBlock = z.infer<typeof StatBlockSchema>;

/** Stat keys that decompose additively across base/flame/scroll/star. */
export const ADDITIVE_STAT_KEYS = [
	'str',
	'dex',
	'int',
	'luk',
	'maxHp',
	'maxMp',
	'att',
	'matt',
	'def',
	'speed',
	'jump'
] as const satisfies readonly (keyof StatBlock)[];

export type AdditiveStatKey = (typeof ADDITIVE_STAT_KEYS)[number];

const isoDateTime = z
	.string()
	.regex(
		/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/,
		'must be an ISO-8601 UTC timestamp, e.g. 2026-09-06T12:34:56.789Z'
	);

/** Reusable ISO-8601 UTC timestamp string. */
export const IsoTimestampSchema = isoDateTime;

/**
 * The Character Info window plus the three hover tooltips (main stat, secondary
 * stat, ATT) that expose the base / % / %-not-applied split.
 *
 * This is the source of truth for totals: class passives and buffs contribute
 * FD/IED/BD/CD that cannot be reconstructed from equipment.
 */
export const StatWindowSchema = z
	.strictObject({
		capturedAt: isoDateTime.default(() => new Date().toISOString()),

		str: StatTripleSchema,
		dex: StatTripleSchema,
		int: StatTripleSchema,
		luk: StatTripleSchema,
		/** Demon Avenger scales off HP. */
		hp: StatTripleSchema.optional(),

		attack: StatTripleSchema,
		magicAttack: StatTripleSchema.optional(),

		damagePercent: z.number().optional(),
		bossDamagePercent: z.number().optional(),
		finalDamagePercent: z.number().optional(),
		ignoreDefensePercent: z.number().optional(),
		normalEnemyDamagePercent: z.number().optional(),
		criticalRatePercent: z.number().optional(),
		criticalDamagePercent: z.number().optional(),

		arcaneForce: z.number().optional(),
		sacredForce: z.number().optional(),

		/** IED sources outside gear (skills etc.) when individually known. */
		iedSources: z.array(z.number()).optional(),

		/** Displayed numbers, used as checksums only — never as calc inputs. */
		displayed: z
			.strictObject({
				rangeMax: z.number().optional(),
				rangeMin: z.number().optional(),
				combatPower: z.number().optional()
			})
			.optional()
	})
	.describe('Character Info stat window capture');

export type StatWindow = z.infer<typeof StatWindowSchema>;
