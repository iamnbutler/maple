import { z } from 'zod';

import { ItemSchema, SlotSchema } from './item';
import { IsoTimestampSchema, StatWindowSchema } from './stats';

/** Character ids are slugs: lowercase, digits and dashes, 2–41 characters. */
export const CHARACTER_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,40}$/;

export const CharacterIdSchema = z
	.string()
	.regex(CHARACTER_ID_PATTERN, 'id must match ^[a-z0-9][a-z0-9-]{1,40}$');

export const ARCANE_REGIONS = [
	'vanishingJourney',
	'chuchu',
	'lachelein',
	'arcana',
	'morass',
	'esfera'
] as const;
export const ArcaneRegionSchema = z.enum(ARCANE_REGIONS);
export type ArcaneRegion = z.infer<typeof ArcaneRegionSchema>;

export const SACRED_REGIONS = [
	'cernium',
	'hotelArcus',
	'odium',
	'shangrila',
	'arteria',
	'carcion',
	'tallahart'
] as const;
export const SacredRegionSchema = z.enum(SACRED_REGIONS);
export type SacredRegion = z.infer<typeof SacredRegionSchema>;

export const HYPER_STAT_KEYS = [
	'str',
	'dex',
	'int',
	'luk',
	'maxHp',
	'maxMp',
	'dfTfPp',
	'criticalRate',
	'criticalDamage',
	'ignoreDefense',
	'damage',
	'bossDamage',
	'normalMonsterDamage',
	'statusResistance',
	'knockbackResistance',
	'defense',
	'speedJump',
	'attMatt',
	'expGain',
	'arcaneForce'
] as const;
export const HyperStatKeySchema = z.enum(HYPER_STAT_KEYS);
export type HyperStatKey = z.infer<typeof HyperStatKeySchema>;

const symbolLevel = z.number().int().min(0);

export const SymbolsSchema = z.strictObject({
	arcane: z.partialRecord(ArcaneRegionSchema, symbolLevel).optional(),
	sacred: z.partialRecord(SacredRegionSchema, symbolLevel).optional(),
	grandis: z.record(z.string(), symbolLevel).optional()
});

export type Symbols = z.infer<typeof SymbolsSchema>;

/* -------------------------------------------------------------------------- */
/* Legion                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The 16 Legion board areas — 8 inner, 8 outer. Mirrors
 * `LegionAreaKey` in src/lib/data/legion.ts; kept spelled out here so the
 * schema layer does not import the data layer.
 */
export const LEGION_AREA_KEYS = [
	'str',
	'dex',
	'int',
	'luk',
	'maxHp',
	'maxMp',
	'att',
	'matt',
	'statusResistance',
	'expObtained',
	'criticalRate',
	'bossDamage',
	'normalDamage',
	'buffDuration',
	'ignoreDefense',
	'criticalDamage'
] as const;
export const LegionAreaKeySchema = z.enum(LEGION_AREA_KEYS);
export type LegionAreaKey = z.infer<typeof LegionAreaKeySchema>;

/** One character placed on the Legion board. Its rank derives from its level. */
export const LegionMemberSchema = z.strictObject({
	/** Key into src/lib/data/classes.ts. */
	classId: z.string().min(1),
	level: z.number().int().min(1).max(300),
	/** The mule's IGN, when it is worth recording which character this is. */
	name: z.string().min(1).optional()
});

export type LegionMember = z.infer<typeof LegionMemberSchema>;

/**
 * Legion Artifact effect levels, 0–10 each. The effect KEYS are open because the
 * per-level value table is still being sourced; validating the level range is
 * the useful half.
 */
export const LegionArtifactSchema = z.strictObject({
	/** Artifact Level, 1–60. */
	level: z.number().int().min(0).max(60).optional(),
	/** Effect id -> level 0–10. */
	effects: z.record(z.string(), z.number().int().min(0).max(10)).optional()
});

export const LegionSchema = z.strictObject({
	/** Total Legion Level — the sum of the top 42 eligible characters. */
	level: z.number().int().min(0).optional(),
	/** The placed attackers. Member effects dedupe by job, higher rank winning. */
	members: z.array(LegionMemberSchema).optional(),
	/** Squares filled per board area. Capped by board size at analysis time. */
	board: z.partialRecord(LegionAreaKeySchema, z.number().int().min(0).max(40)).optional(),
	artifact: LegionArtifactSchema.optional(),
	notes: z.string().optional()
});

export type Legion = z.infer<typeof LegionSchema>;

/* -------------------------------------------------------------------------- */
/* Link skills                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * One equipped link skill. `id` keys into `LINK_SKILLS` in
 * src/lib/data/links.ts; `level` is the stacked faction level, not the level of
 * any one contributing character.
 */
export const LinkSkillSchema = z.strictObject({
	id: z.string().min(1),
	level: z.number().int().min(0).max(15)
});

export type LinkSkill = z.infer<typeof LinkSkillSchema>;

/**
 * The stored shape of the `links` field. Deliberately free of transforms:
 * `CharacterSchema` is published as JSON Schema from `GET /api/schema`, and
 * `z.toJSONSchema` cannot represent one.
 */
export const LinksSchema = z.array(LinkSkillSchema);

/**
 * What a CLIENT may send for `links` — either the structured form or the legacy
 * `string[]` of raw names, which is what the field used to be ("raw link-skill
 * names; informational only").
 *
 * Coercing rather than versioning the file format is safe because no stored
 * character ever set it — see docs/plans/2026-09-06-progression-systems.md §5.
 * A legacy name is kept as an id at level 0, which reads as "known but
 * unquantified" and so contributes to nothing until someone supplies a level.
 */
export const LinksInputSchema = z.union([
	LinksSchema,
	z.array(z.string()).transform((names) => names.map((id) => ({ id, level: 0 })))
]);

/* -------------------------------------------------------------------------- */
/* V Matrix                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * One V Matrix node. `boost` nodes cap at 60, everything else at 30 — the range
 * is validated per node in `analysis`, not here, because the schema layer does
 * not import the data layer.
 */
export const VMatrixNodeSchema = z.strictObject({
	/** Node name as the game spells it, or a `COMMON_NODES` id for a common node. */
	id: z.string().min(1),
	level: z.number().int().min(0).max(60)
});

export type VMatrixNode = z.infer<typeof VMatrixNodeSchema>;

export const VMatrixSchema = z.strictObject({
	/** Unspent V Points. They come only from Nodestones, never from level. */
	points: z.number().int().min(0).optional(),
	/** The four job nodes, max level 30. */
	job: z.array(VMatrixNodeSchema).optional(),
	/** The six boost nodes, max level 60. */
	boost: z.array(VMatrixNodeSchema).optional(),
	/** The ~19 common nodes, max level 30. */
	common: z.array(VMatrixNodeSchema).optional(),
	/** Expiry of the equipped Special Node, as shown on the node itself. */
	specialNodeExpires: z.string().min(1).optional(),
	notes: z.string().optional()
});

export type VMatrix = z.infer<typeof VMatrixSchema>;

/* -------------------------------------------------------------------------- */
/* HEXA Matrix                                                                 */
/* -------------------------------------------------------------------------- */

export const HEXA_NODE_TYPES = ['origin', 'ascent', 'mastery', 'enhancement', 'common'] as const;
export const HexaNodeTypeSchema = z.enum(HEXA_NODE_TYPES);
export type HexaNodeType = z.infer<typeof HexaNodeTypeSchema>;

export const HexaSkillNodeSchema = z.strictObject({
	id: z.string().min(1),
	type: HexaNodeTypeSchema,
	level: z.number().int().min(0).max(30)
});

export type HexaSkillNode = z.infer<typeof HexaSkillNodeSchema>;

export const HEXA_STAT_KEYS = [
	'mainStat',
	'attack',
	'damage',
	'bossDamage',
	'ignoreDefense',
	'criticalDamage'
] as const;
export const HexaStatKeySchema = z.enum(HEXA_STAT_KEYS);
export type HexaStatKey = z.infer<typeof HexaStatKeySchema>;

const hexaStatLine = z.strictObject({
	key: HexaStatKeySchema,
	level: z.number().int().min(0).max(10)
});

/**
 * One HEXA Stat core: a Main line and exactly two Additional lines.
 *
 * The core's displayed level is the SUM of the three line levels and caps at 20
 * — so it is derived, never stored. `validateHexaStatCore` in
 * src/lib/data/hexa.ts enforces the sum and the distinctness rule.
 *
 * ⚠️ Do NOT store the `NN / 20` counter from the HEXA Stat panel. It belongs to
 * the saved node in the left tile of the two-tile picker, not necessarily to the
 * core whose lines are displayed. See docs/research/hexa.md §7.7.
 */
export const HexaStatCoreSchema = z.strictObject({
	main: hexaStatLine,
	additional: z.tuple([hexaStatLine, hexaStatLine])
});

export type HexaStatCore = z.infer<typeof HexaStatCoreSchema>;

export const HexaSchema = z.strictObject({
	/** Sol Erda held. Caps at 20. */
	solErda: z.number().int().min(0).optional(),
	/** Sol Erda Fragments held. Uncapped. */
	solErdaFragments: z.number().int().min(0).optional(),
	skills: z.array(HexaSkillNodeSchema).optional(),
	stat: z.array(HexaStatCoreSchema).max(3).optional(),
	notes: z.string().optional()
});

export type Hexa = z.infer<typeof HexaSchema>;

/**
 * The character document. `createdAt` / `updatedAt` are maintained by the
 * store, not by clients — use {@link CharacterInputSchema} to validate a
 * request body.
 */
export const CharacterSchema = z
	.strictObject({
		id: CharacterIdSchema,
		/** In-game name. */
		name: z.string().min(1),
		world: z.string().min(1),
		/** Key into src/lib/data/classes.ts, e.g. "shadower". */
		classId: z.string().min(1),
		level: z.number().int().min(1).max(300),

		statWindow: StatWindowSchema.optional(),
		equipment: z.partialRecord(SlotSchema, ItemSchema).default({}),

		symbols: SymbolsSchema.optional(),
		/** Hyper stat levels, 0–15. */
		hyperStats: z.partialRecord(HyperStatKeySchema, z.number().int().min(0).max(15)).optional(),
		legion: LegionSchema.optional(),
		/** Raw inner-ability lines. */
		innerAbility: z.array(z.string()).optional(),
		/** Equipped link skills, at their stacked level. Accepts a legacy `string[]`. */
		links: LinksSchema.optional(),
		vMatrix: VMatrixSchema.optional(),
		hexa: HexaSchema.optional(),
		notes: z.string().optional(),

		createdAt: IsoTimestampSchema,
		updatedAt: IsoTimestampSchema
	})
	.describe('a tracked MapleStory character');

export type Character = z.infer<typeof CharacterSchema>;

/**
 * What a client may PUT: the full document minus the store-managed timestamps
 * (which are accepted but ignored for `updatedAt`, and used as a floor for
 * `createdAt`).
 */
export const CharacterInputSchema = CharacterSchema.extend({
	createdAt: IsoTimestampSchema.optional(),
	updatedAt: IsoTimestampSchema.optional(),
	/** Also accepts the legacy `string[]` of raw names — see {@link LinksInputSchema}. */
	links: LinksInputSchema.optional()
});

export type CharacterInput = z.infer<typeof CharacterInputSchema>;

/** `POST /api/characters` body. */
export const CharacterCreateSchema = z
	.strictObject({
		id: CharacterIdSchema.optional(),
		name: z.string().min(1),
		classId: z.string().min(1),
		level: z.number().int().min(1).max(300),
		world: z.string().min(1),
		notes: z.string().optional()
	})
	.describe('minimal payload to create a character');

export type CharacterCreate = z.infer<typeof CharacterCreateSchema>;

/** Derive a character id from an IGN. Returns `null` when nothing usable is left. */
export function slugify(name: string): string | null {
	const slug = name
		.normalize('NFKD')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 41)
		.replace(/-+$/g, '');
	return CHARACTER_ID_PATTERN.test(slug) ? slug : null;
}
