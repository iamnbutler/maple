/**
 * V Matrix (5th job) — GMS 2026, POST-REWORK.
 *
 * Transcribed from `docs/research/vmatrix.md`. Primary sources cited there:
 *   - https://maplestorywiki.net/w/V_Matrix                                    (taxonomy, milestones, V Points)
 *   - https://maplestorywiki.net/index.php?title=Module:VMatrixCostTable/costData&action=raw
 *                                                                             (the cost curves, straight from the wiki's Lua source)
 *   - https://maplestorywiki.net/w/<Class>/Skills "V Enhancements"             (per-skill boost coefficients)
 *   - one page per node under https://maplestorywiki.net/w/<Node_Name>        (common node values)
 *
 * ═══ READ THIS BEFORE TRUSTING ANY OTHER SOURCE ═══
 *
 * The V Matrix was **completely reworked** and the rework is **already live in
 * GMS** — v269 "Ride the Lightning", 2026-06-17, porting KMS CROWN ver. 1.2.410.
 * Almost everything written about the V Matrix on the open web describes the
 * dead system. See {@link REMOVED_MECHANICS} for what no longer exists.
 *
 * What the rework means for a calculator:
 *   * Nodes never compete for slots. There are no slots, no Matrix Points and no
 *     node RNG. Levelling is a deterministic V Point purchase.
 *   * Every character has a FIXED roster: 4 job nodes, 6 boost nodes, ~19 common
 *     nodes, 1 special node slot.
 *   * **V Points do not come from character level.** Past 200, level buys
 *     nothing here — V Points come only from consuming Nodestones.
 */

/* -------------------------------------------------------------------------- */
/* Taxonomy                                                                   */
/* -------------------------------------------------------------------------- */

export type VNodeType = 'job' | 'boost' | 'common' | 'special';

export interface VNodeTypeSpec {
	type: VNodeType;
	label: string;
	/** Nodes of this type a character holds. `special` is 1 EQUIPPED at a time. */
	count: number | 'varies';
	maxLevel: number;
	/** Level a node sits at before any V Points are spent. */
	startLevel: number;
	note?: string;
}

/** V Matrix unlocks at the 5th Job Advancement. Nothing in it is level-gated past that. */
export const V_MATRIX_UNLOCK_LEVEL = 200;

export const V_NODE_TYPES: Record<VNodeType, VNodeTypeSpec> = {
	job: {
		type: 'job',
		label: 'Job Node',
		count: 4,
		maxLevel: 30,
		startLevel: 1,
		note: 'granted at 5th job; must be Lv25 to unlock the matching HEXA Boost Node'
	},
	boost: {
		type: 'boost',
		label: 'Boost Node',
		count: 6,
		maxLevel: 60,
		startLevel: 0,
		note: 'each covers 1-4 skills; must be Lv40 to unlock the matching HEXA Mastery Node'
	},
	common: {
		type: 'common',
		label: 'Common Node',
		count: 'varies',
		maxLevel: 30,
		startLevel: 0,
		note: '~19 for the five priority classes; must be unlocked for 7 V Points before levelling'
	},
	special: {
		type: 'special',
		label: 'Special Node',
		count: 1,
		maxLevel: 0,
		startLevel: 0,
		note: 'not levelled — a time-limited conditional buff, one equipped at a time'
	}
};

/** HEXA gates that make a V Matrix level worth more than its own damage. */
export const HEXA_BOOST_NODE_GATE = { nodeType: 'job' as const, level: 25 };
export const HEXA_MASTERY_NODE_GATE = { nodeType: 'boost' as const, level: 40 };

/* -------------------------------------------------------------------------- */
/* Cost curves                                                                */
/* -------------------------------------------------------------------------- */

/**
 * V Points to go from level N-1 to N, for job / common nodes. Index 0 is the
 * 7-point unlock (level 0 → 1); after that 4 through Lv10, 6 through Lv20, 9
 * through Lv30. Totals 193.
 *
 * Straight from `Module:VMatrixCostTable/costData` `['skillCore']['vPointCost']`,
 * corroborated by https://www.inven.co.kr/board/maple/5974/5993140.
 */
export const SKILL_NODE_LEVEL_COST = [
	7, 4, 4, 4, 4, 4, 4, 4, 4, 4, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9
] as const;

/**
 * V Points to go from level N-1 to N for a boost node: 1 through Lv40, then 2
 * through Lv60. Totals 80.
 *
 * From `['enforceCore']['vPointCost']` in the same module.
 */
export const BOOST_NODE_LEVEL_COST = [
	...Array.from({ length: 40 }, () => 1),
	...Array.from({ length: 20 }, () => 2)
] as const;

/** Total V Points to take one node of each type from its starting level to max. */
export const V_POINT_COST_TO_MAX = {
	/** Job nodes start at level 1, so the 7-point unlock is pre-paid. */
	job: 186,
	boost: 80,
	/** Common nodes start locked, so the 7-point unlock is on the player. */
	common: 193
} as const;

function costTable(type: VNodeType): readonly number[] {
	if (type === 'boost') return BOOST_NODE_LEVEL_COST;
	if (type === 'job' || type === 'common') return SKILL_NODE_LEVEL_COST;
	throw new Error(`Special Nodes are not levelled; they have no V Point cost curve.`);
}

/**
 * V Points to raise one node from `from` to `to`.
 *
 * Note job and common nodes share a curve but not a starting level: a job node
 * arrives at level 1 with the 7-point unlock already paid, a common node starts
 * locked at 0 and the player pays it.
 */
export function vPointCost(type: VNodeType, from: number, to: number): number {
	const spec = V_NODE_TYPES[type];
	if (!spec) throw new Error(`Unknown V Matrix node type "${type}".`);
	// Check this before the level range, so a Special Node gets the useful error
	// rather than "levels run 0-0".
	const table = costTable(type);
	if (to <= from) return 0;
	if (from < 0 || to > spec.maxLevel) {
		throw new Error(`${spec.label} levels run 0-${spec.maxLevel} (got ${from} → ${to}).`);
	}
	let total = 0;
	for (let level = from; level < to; level += 1) total += table[level];
	return total;
}

/**
 * V Points to fully max a character's V Matrix, given how many common nodes it
 * has. ~19 for all five priority classes, giving ≈4,800.
 *
 * Because a plain Nodestone is worth 1 V Point, this is also roughly the
 * Nodestone count. Common nodes are ~65% of the bill and by far the worst value
 * per point — see {@link LEVELLING_ORDER}.
 */
export function vPointsToMaxAll(commonNodeCount = 19): number {
	return (
		4 * V_POINT_COST_TO_MAX.job +
		6 * V_POINT_COST_TO_MAX.boost +
		commonNodeCount * V_POINT_COST_TO_MAX.common
	);
}

/**
 * The community-consensus levelling order, which the research derives from the
 * marginal value of a V Point rather than from taste.
 *
 * Boost nodes are the cheapest damage in the entire system: below Lv40, **one V
 * Point buys 2% Final Damage** on a bossing skill. Nothing else is close.
 */
export const LEVELLING_ORDER = [
	'Bossing boost nodes → Lv40 (40 VP each; unlocks the HEXA Mastery gate and the +20% IED)',
	'Job nodes → Lv25 (141 VP each; unlocks the HEXA Boost gate)',
	'Bossing boost nodes → Lv60 (40 more VP each, at 2 VP per level)',
	'Job nodes 25 → 30, then common nodes by damage value, then the non-bossing boost nodes'
] as const;

/* -------------------------------------------------------------------------- */
/* Boost nodes                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Final Damage a boost node grants at a level, as a WHOLE percent.
 *
 * `fdPerLevel` is a **per-skill** coefficient, not a constant. `formulas.md`
 * line 249's `(1 + 0.02 * 60) = 2.2` is right only for 4th-job and Hyper skills.
 * Always read the coefficient off {@link BOOST_NODE_FD_PER_LEVEL}, never from
 * the job tier — see {@link UNVERIFIED_FD_BY_JOB_TIER}.
 */
export function boostNodeFinalDamage(fdPerLevel: number, level: number): number {
	if (level < 0 || level > V_NODE_TYPES.boost.maxLevel) {
		throw new Error(`Boost Node levels run 0-60 (got ${level}).`);
	}
	return fdPerLevel * level;
}

/**
 * Boost node FD is ordinary Final Damage: it multiplies with every other FD
 * source (`formulas.md` §1.6), and it is **skill-scoped**. A DPM model has to
 * apply it per skill in the rotation; a skill no boost node covers gets nothing.
 */
export function composeBoostNodeFd(existingFdPercent: number, boostFdPercent: number): number {
	return ((1 + existingFdPercent / 100) * (1 + boostFdPercent / 100) - 1) * 100;
}

/**
 * The apparent FD-per-level ladder by the boosted skill's job tier.
 *
 * ⚠️ **UNVERIFIED, and there are confirmed exceptions.** No source states this
 * rule; it is inferred from five classes' tables. Several lower-tier skills are
 * priced at 2% anyway — Ren's Spirit Strike (2nd job, listed at 2%), Wind
 * Archer's Trifling Wind, Battle Mage's Condemnation / Dark Chain / Battle
 * Burst / Dark Shock, Night Walker's Shadow Bat. Hero has no 7% row at all.
 *
 * Exported only so a consumer can sanity-check a per-skill value it just read.
 * Never compute a coefficient from it.
 */
export const UNVERIFIED_FD_BY_JOB_TIER = { 1: 7, 2: 5, 3: 3, 4: 2, hyper: 2 } as const;

/** What a boost node grants at its two milestone levels. */
export type BoostMilestone20 = 'maxTargets' | 'criticalRate' | 'normalDamage' | 'none';

/**
 * Every boost node grants **Ignored Enemy DEF +20% at Lv40**, in all five
 * priority classes' tables without exception.
 *
 * ⚠️ It is PER BOOSTED SKILL, not a global stat, and like all IED it composes
 * multiplicatively on the complement (`formulas.md` §1.8):
 * `1 - (1 - totalIED) * (1 - 0.20)`. In practice a character with every bossing
 * boost node at Lv40+ has this active throughout the rotation.
 *
 * ⚠️ That every single row reads the same value is either true or a wiki
 * template artefact. Flagged in the research as worth an in-game check.
 */
export const BOOST_NODE_LV40_IED_PERCENT = 20;

/** Lv20 grants one of Max Targets +1, Critical Rate +5%, or Normal Monster Damage +10%. */
export const BOOST_NODE_LV20_CRIT_RATE_PERCENT = 5;
export const BOOST_NODE_LV20_NORMAL_DAMAGE_PERCENT = 10;

export interface BoostNodeSkill {
	skill: string;
	/** Final Damage percentage points per node level, read per-skill from the wiki. */
	fdPerLevel: number;
}

export interface BoostNodeSpec {
	/** 1-6, matching the in-game ordering. */
	index: number;
	skills: readonly BoostNodeSkill[];
	milestone20: BoostMilestone20;
	/** `primary` nodes cover the bossing rotation; `other` cover levelling/mobility. */
	priority: 'primary' | 'other';
	note?: string;
}

/**
 * Boost node rosters for the five classes this project prioritises. Read from
 * each class's "V Enhancements" wiki table (pages last edited Aug 2026, i.e.
 * post-v269).
 *
 * Only these five are transcribed. `boostNodeFinalDamage` works for any class
 * once a caller supplies the coefficient.
 */
export const BOOST_NODES: Record<string, readonly BoostNodeSpec[]> = {
	ren: [
		{
			index: 1,
			skills: [{ skill: 'Plum Blossom Sword: Storm', fdPerLevel: 2 }],
			milestone20: 'maxTargets',
			priority: 'primary'
		},
		{
			index: 2,
			skills: [
				// The wiki prices Spirit Strike at 2%, not the 5% its 2nd-job tier
				// would predict. The per-skill value wins.
				{ skill: 'Imugi Spirit Sword: Spirit Strike', fdPerLevel: 2 },
				{ skill: "Second Imugi Spirit Sword: Serpent's Fang", fdPerLevel: 2 }
			],
			milestone20: 'normalDamage',
			priority: 'primary'
		},
		{
			index: 3,
			skills: [
				{ skill: 'Final Imugi Spirit Sword: Burrowing Earth', fdPerLevel: 2 },
				{ skill: 'Final Imugi Spirit Sword: Ravenous Spirit', fdPerLevel: 2 },
				{ skill: 'Final Imugi Spirit Sword: Years Uncounted', fdPerLevel: 2 }
			],
			milestone20: 'maxTargets',
			priority: 'primary',
			note: 'one boost covering three techniques spanning 3rd job, 4th job and Hyper'
		},
		{
			index: 4,
			skills: [
				{ skill: 'Second Plum Blossom Sword: Raining Blossoms', fdPerLevel: 3 },
				{ skill: 'Third Plum Blossom Sword: Riotous Heart', fdPerLevel: 2 },
				{ skill: 'Fourth Plum Blossom Sword: Unbowed Blade', fdPerLevel: 2 }
			],
			milestone20: 'normalDamage',
			priority: 'primary',
			note: 'Riotous Heart Boost also boosts Hearts United'
		},
		{
			index: 5,
			skills: [{ skill: 'Plum Blossom Sword: Slash', fdPerLevel: 3 }],
			milestone20: 'maxTargets',
			priority: 'other'
		},
		{
			index: 6,
			skills: [
				{ skill: 'Plum Blossom Sword: Slice', fdPerLevel: 7 },
				{ skill: 'Plum Blossom Sword: Strike', fdPerLevel: 5 }
			],
			milestone20: 'maxTargets',
			priority: 'other'
		}
	]
};

/** Job nodes a class holds. All max level 30. */
export const JOB_NODES: Record<string, readonly string[]> = {
	ren: [
		'Final Plum Blossom Sword: Thousand Blossom Flurry',
		'Soul Immeasurable',
		'Final Plum Blossom Sword: Dancing Annihilation',
		'Final Imugi Spirit Sword: Blade of the Unbound Heart'
	]
};

/* -------------------------------------------------------------------------- */
/* Common nodes                                                               */
/* -------------------------------------------------------------------------- */

/**
 * How a common node's passive scales with node level. Both shapes are verified
 * level-by-level against the wiki tables.
 *
 *   `linear`    — `value = level`. Rope Lift, Blink, Impenetrable Skin, Last Resort.
 *   `stepped5`  — `value = ceil(level / 5)`, so 1 at Lv1-5 … 6 at Lv26-30. Every
 *                 Decent skill's passive.
 *   `anchors`   — only the Lv1 and Lv30 values are published. The module refuses
 *                 to interpolate rather than invent a curve.
 */
export type CommonNodeScaling = 'linear' | 'stepped5' | 'anchors';

export interface CommonNodeSpec {
	id: string;
	label: string;
	/** `all` | a branch | a sub-branch | a faction. */
	tier: 'all' | 'all-gated' | 'branch' | 'sub-branch' | 'faction';
	maxLevel: 30;
	scaling: CommonNodeScaling;
	/** What the node's damage-relevant passive/buff actually gives. */
	effect: string;
	valueAtLv1?: number;
	valueAtLv30?: number;
	/** Multiplier applied to the scaling result, e.g. Impenetrable Skin's HP is 50x. */
	perLevel?: number;
	damageRelevant: boolean;
	note?: string;
}

/**
 * The damage-relevant common nodes for the five priority classes.
 *
 * This is deliberately NOT the full ~19-node roster. The rest (Erda Nova, Will
 * of Erda, Lotus Flower, Ethereal Form, the utility Decents) are survivability
 * or convenience and contribute nothing a damage model can read.
 */
export const COMMON_NODES: Record<string, CommonNodeSpec> = {
	'rope-lift': {
		id: 'rope-lift',
		label: 'Rope Lift',
		tier: 'all',
		maxLevel: 30,
		scaling: 'linear',
		effect: 'passive All Stats',
		valueAtLv1: 1,
		valueAtLv30: 30,
		damageRelevant: true
	},
	blink: {
		id: 'blink',
		label: 'Blink',
		tier: 'all',
		maxLevel: 30,
		scaling: 'linear',
		effect: 'passive ATT and Magic ATT',
		valueAtLv1: 1,
		valueAtLv30: 30,
		damageRelevant: true
	},
	'decent-sharp-eyes': {
		id: 'decent-sharp-eyes',
		label: 'Decent Sharp Eyes',
		tier: 'all',
		maxLevel: 30,
		scaling: 'stepped5',
		effect: 'passive All Stats; active Critical Rate +10% and Critical Damage +8%',
		valueAtLv1: 1,
		valueAtLv30: 6,
		damageRelevant: true,
		note: 'the ACTIVE crit values do not scale with node level — only the duration and the passive do'
	},
	'decent-advanced-blessing': {
		id: 'decent-advanced-blessing',
		label: 'Decent Advanced Blessing',
		tier: 'all',
		maxLevel: 30,
		scaling: 'stepped5',
		effect: 'passive All Stats; active ATT +20, MATT +20, DEF +425, Max HP/MP +475',
		valueAtLv1: 1,
		valueAtLv30: 6,
		damageRelevant: true,
		note: '⚠️ the wiki shows IDENTICAL active values at Lv1 and Lv30, which may be a template artefact — verify in-game before relying on it'
	},
	'decent-speed-infusion': {
		id: 'decent-speed-infusion',
		label: 'Decent Speed Infusion',
		tier: 'all',
		maxLevel: 30,
		scaling: 'stepped5',
		effect: 'passive All Stats; active Attack Speed +1 level',
		valueAtLv1: 1,
		valueAtLv30: 6,
		damageRelevant: true,
		note: 'attack speed is not in the damage formula but is real DPM'
	},
	'weapon-aura': {
		id: 'weapon-aura',
		label: 'Weapon Aura',
		tier: 'branch',
		maxLevel: 30,
		scaling: 'anchors',
		effect: 'Final Damage % and Ignored Enemy DEF % for 72-130s on a 120s cooldown',
		valueAtLv1: 1,
		valueAtLv30: 6,
		damageRelevant: true,
		note: 'Warrior branch (Ren, Hero). Lv30 also raises IED from 10% to 16%.'
	},
	'impenetrable-skin': {
		id: 'impenetrable-skin',
		label: 'Impenetrable Skin',
		tier: 'branch',
		maxLevel: 30,
		scaling: 'linear',
		effect: 'passive STR (and Max HP at 50x)',
		valueAtLv1: 1,
		valueAtLv30: 30,
		damageRelevant: true,
		note: 'Warrior branch. Max HP is 50 x node level, reaching +1500 at Lv30.'
	},
	'mana-overload': {
		id: 'mana-overload',
		label: 'Mana Overload',
		tier: 'branch',
		maxLevel: 30,
		scaling: 'anchors',
		effect: 'Final Damage % toggle, costing 2% Max MP',
		valueAtLv1: 5,
		valueAtLv30: 8,
		damageRelevant: true,
		note: 'Magician branch (Battle Mage). Cooldown falls 59s → 30s.'
	},
	'vicious-shot': {
		id: 'vicious-shot',
		label: 'Vicious Shot',
		tier: 'branch',
		maxLevel: 30,
		scaling: 'anchors',
		effect: 'Critical Damage gains a percentage OF Critical Rate for 30s on a 120s cooldown',
		valueAtLv1: 21,
		valueAtLv30: 50,
		damageRelevant: true,
		note: 'Bowman branch (Wind Archer). Also lets Critical Rate exceed 100%. Model it as a BUFF WINDOW, not a permanent stat: at Lv30 a 130% nominal crit rate becomes +65% Critical Damage for 30 of every 120 seconds.'
	},
	'last-resort': {
		id: 'last-resort',
		label: 'Last Resort',
		tier: 'branch',
		maxLevel: 30,
		scaling: 'linear',
		effect: 'passive ATT; active Final Damage % in two stages',
		valueAtLv1: 1,
		valueAtLv30: 30,
		damageRelevant: true,
		note: 'Thief branch (Night Walker). The ACTIVE is FD +7%/+18% at Lv1 rising to +10%/+24% at Lv30; the linear scaling here is the passive ATT.'
	},
	'maple-world-goddesss-blessing': {
		id: 'maple-world-goddesss-blessing',
		label: "Maple World Goddess's Blessing",
		tier: 'faction',
		maxLevel: 30,
		scaling: 'anchors',
		effect: 'Damage % for 60s on a 120s cooldown, plus a Maple Warrior bonus',
		valueAtLv1: 5,
		valueAtLv30: 20,
		damageRelevant: true,
		note: 'Hero, Battle Mage and every Explorer / Hero of Maple / non-Demon Resistance / Jianghu / Sia Astelle. The Maple Warrior bonus runs +110% → +400%.'
	},
	'transcendent-cygnuss-blessing': {
		id: 'transcendent-cygnuss-blessing',
		label: "Transcendent Cygnus's Blessing",
		tier: 'faction',
		maxLevel: 30,
		scaling: 'anchors',
		effect: 'Damage % and Damage Taken −5% for 45s on a 120s cooldown',
		valueAtLv1: 33,
		valueAtLv30: 72,
		damageRelevant: true,
		note: "Cygnus (Wind Archer, Night Walker) after the [Moonbridge] Cygnus Awakens quest. REPLACES Empress Cygnus's Blessing, which runs +22% → +61%."
	},
	'empress-cygnuss-blessing': {
		id: 'empress-cygnuss-blessing',
		label: "Empress Cygnus's Blessing",
		tier: 'faction',
		maxLevel: 30,
		scaling: 'anchors',
		effect: 'Damage % for 45s on a 120s cooldown',
		valueAtLv1: 22,
		valueAtLv30: 61,
		damageRelevant: true,
		note: 'Cygnus, before the Awakens quest. Replaced by the Transcendent version, never stacked with it.'
	},
	'grandis-goddesss-blessing': {
		id: 'grandis-goddesss-blessing',
		label: "Grandis Goddess's Blessing",
		tier: 'faction',
		maxLevel: 30,
		scaling: 'anchors',
		effect: 'Damage % for 40s on a 120s cooldown',
		valueAtLv1: 11,
		valueAtLv30: 40,
		damageRelevant: true,
		note: 'Ren and every Nova / Flora / Anima. ⚠️ The %Damage is PER FACTION SUB-GROUP — the Anima column (11 → 40) applies to Ren; Nova reads 6 → 35. Ren additionally gets a FLAT +15% Final Damage on Final Plum Blossom Swords, Final Imugi Spirit Swords and Rising Azure Dragon, which does NOT scale with node level.'
	}
};

export const COMMON_NODE_IDS = Object.keys(COMMON_NODES);

/**
 * Ren-only: Grandis Goddess's Blessing grants a flat Final Damage bonus on three
 * of Ren's skills at EVERY node level. It never scales, so levelling the node
 * past unlock buys only the %Damage half.
 */
export const REN_GRANDIS_BLESSING_FD_PERCENT = 15;

/**
 * The value of a common node's scaling passive at a level.
 *
 * Throws for an `anchors` node — the research publishes only its Lv1 and Lv30
 * values, and guessing the shape between them would be inventing data. Read
 * `valueAtLv1` / `valueAtLv30` directly for those.
 */
export function commonNodeValue(id: string, level: number): number {
	const spec = COMMON_NODES[id];
	if (!spec) throw new Error(`Unknown common node "${id}".`);
	if (level < 0 || level > spec.maxLevel) {
		throw new Error(`${spec.label} levels run 0-${spec.maxLevel} (got ${level}).`);
	}
	if (level === 0) return 0;

	switch (spec.scaling) {
		case 'linear':
			return level * (spec.perLevel ?? 1);
		case 'stepped5':
			return Math.ceil(level / 5) * (spec.perLevel ?? 1);
		case 'anchors':
			throw new Error(
				`${spec.label} publishes only its Lv1 (${spec.valueAtLv1}) and Lv30 ` +
					`(${spec.valueAtLv30}) values; the curve between them is not sourced. ` +
					'Read valueAtLv1 / valueAtLv30 instead of interpolating.'
			);
	}
}

/** Like {@link commonNodeValue} but returns `undefined` instead of throwing on `anchors`. */
export function tryCommonNodeValue(id: string, level: number): number | undefined {
	const spec = COMMON_NODES[id];
	if (!spec || spec.scaling === 'anchors') return undefined;
	return commonNodeValue(id, level);
}

/* -------------------------------------------------------------------------- */
/* Special nodes                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Special Nodes are conditional combat buffs, not levelled nodes: one equipped
 * at a time, bought with V Points, and **time-limited**. The `09.14.26` on the
 * node in the captured Ren screenshot is its EXPIRY DATE — that is exactly how
 * the panel reads it.
 */
export const SPECIAL_NODE_SLOTS = 1;

/** 14 V Points buys 7 days. */
export const SPECIAL_NODE_7_DAY_COST = 14;

/**
 * V Points to extend a Special Node by 30 days.
 *
 * ⚠️ **CONFLICT.** maplestorywiki says 48; Inven says 27. 48 is internally
 * consistent with the stated 1.6 V Points per day (48 / 30 = 1.6) and with the
 * 7-day price (14 / 7 = 2.0, a small-bundle premium), so it is the one encoded.
 */
export const SPECIAL_NODE_30_DAY_COST = 48;
export const UNVERIFIED_SPECIAL_NODE_30_DAY_COST_ALT = 27;

/* -------------------------------------------------------------------------- */
/* Stale-source guard                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Mechanics the v269 rework DELETED. Almost every guide, video and calculator
 * on the open web still describes them, so this list exists to be checked
 * against before trusting a source about the V Matrix.
 *
 * KMS notes, verbatim: *"The slot enhancement and slot expansion based on
 * character level features have been removed."*
 */
export const REMOVED_MECHANICS = [
	'Node slots and slot enhancement',
	'Matrix Points',
	'Node Shards / Node Fragments (converted one-time at 17.62 shards → 1 V Point)',
	'Node crafting (70 shards for a boost node, 500 for a custom trio, 35 for a Nodestone)',
	'Node disassembly',
	'Node feeding / node EXP — levelling is now a flat, deterministic V Point purchase',
	'Boost node "trios" — a boost node now covers 1 to 4 skills, not 3',
	'V Points from character level — they come only from Nodestones'
] as const;

/**
 * Names with no source in GMS or KMS patch notes, current or archived wiki.
 * Probably MSEA-only, event-only, or misremembered. Do not encode them.
 */
export const UNSOURCED_ITEM_NAMES = [
	'Powerful Nodestone',
	'Perfect Node Stone',
	'Selective Node Stone'
] as const;

/**
 * The GMS v271 "HEXA common nodes" announcement is a **6th job** system paid for
 * with Sol Erda and Sol Erda Fragments. It is not this module's Common Nodes,
 * which have existed since GMS v179 (2016) and merely gained a tab in the
 * rework. Model HEXA common nodes in `hexa.ts`.
 */
export const V_COMMON_NODES_ARE_NOT_HEXA_COMMON_NODES = true;
