// Generator for src/lib/data/items/catalogue.json.
//
// Run: node scripts/build-item-catalogue.mjs [--cache-dir <dir>] [--offline]
//
// WHAT THIS IS FOR
// ----------------
// The analysis engine used to trust whatever gear an agent PUT at it, so it
// happily proposed impossible upgrades (star forcing a Ring of Restraint, star
// forcing a Genesis weapon, a class holding a weapon it cannot equip). This
// script builds the ground-truth item catalogue that `src/lib/data/items/`
// resolves those questions against.
//
// SOURCES (all pinned, all re-fetchable; see docs/research/existing-tools.md §3)
// ------------------------------------------------------------------------------
//  1. maplestory.io  https://maplestory.io/api/GMS/270/item/list
//     The full GMS v270 item list: id, name, isCash, requiredLevel and a
//     typeInfo {overallCategory, category, subCategory}. ~40 MB, one request.
//     (Do NOT use /item?count=&startPosition= or /item/overall — both 502.)
//  2. chablades/mapledoro  manifests/v270/item-stats.json + set.json,
//     pinned to a commit SHA (the repo has no LICENSE, so never track HEAD).
//     This is the only bulk source that carries `setItemID` and `tuc`
//     (raw upgrade-slot count) — maplestory.io's metaInfo strips both.
//     Its own _meta warns: "tuc is RAW: in-game upgrade slots equal tuc plus 1."
//     We store the RAW tuc and only ever compare it against 0.
//  3. Item icons are referenced by URL, never downloaded:
//     https://maplestory.io/api/GMS/270/item/{id}/icon
//
// BASE STATS. mapledoro's _meta says "Values are clean base stats" — i.e. the
// item as it drops, before scrolls, star force, flames and potential. That is
// exactly what an ACQUISITION candidate needs and what a captured tooltip can
// never supply, because a tooltip only exists for gear you already own. Stored
// under `base` in the same shape as `schema.StatBlock` so it can be summed with
// captured blocks without a translation layer.
//
// The capability RULES themselves are documented in
// `src/lib/data/items/rules.ts` with their citations; this script only applies
// them so the flags can be shipped inside the JSON.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src', 'lib', 'data', 'items', 'catalogue.json');

export const GMS_VERSION = '270';
export const REGION = 'GMS';

/** Pinned mapledoro commit. Bump deliberately, then re-run and diff. */
const MAPLEDORO_SHA = '7329396ec11823d7816a1093308683c46b7a0ffc';

const SOURCES = {
	itemList: `https://maplestory.io/api/${REGION}/${GMS_VERSION}/item/list`,
	itemStats: `https://raw.githubusercontent.com/chablades/mapledoro/${MAPLEDORO_SHA}/manifests/v${GMS_VERSION}/item-stats.json`,
	sets: `https://raw.githubusercontent.com/chablades/mapledoro/${MAPLEDORO_SHA}/manifests/v${GMS_VERSION}/set.json`,
	iconTemplate: `https://maplestory.io/api/${REGION}/${GMS_VERSION}/item/{id}/icon`
};

/* -------------------------------------------------------------------------- */
/* Scope                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * An endgame Heroic character wears level-100+ gear, so that is the baseline.
 * 58,762 GMS equips is far too much to ship; ~5,000 is the useful slice.
 */
const MIN_ITEM_LEVEL = 100;

/**
 * Slot families that are included at EVERY level, because the whole point of
 * the catalogue is to answer "can this be star forced / flamed / cubed", and
 * for these families the answer is usually "no" — dropping them because they
 * are level 0 would push every android and totem down the permissive-unknown
 * path and reintroduce the bug this catalogue exists to fix.
 */
const ALWAYS_INCLUDED_SLOTS = new Set([
	'secondary',
	'emblem',
	'badge',
	'pocket',
	'totem',
	'android',
	'heart'
]);

/**
 * Superior (Tyrant / Nova / Elite Heliseum) gear, matched by exact family name.
 *
 * GMS Superior equipment is exactly 50 items: Tyrant belt/boots/cloak/gloves,
 * Nova belt/boots/cloak and Elite Heliseum belt/boots/cape, each in five
 * variants. Matching on a bare "Nova "/"Tyrant " prefix wrongly caught the
 * "Nova Bandana" and "Nova Training Shoes" cosmetics, so the family names are
 * spelled out. "Superior Gollux" accessories are NOT Superior equipment — they
 * use the ordinary 30★ table — and are correctly absent.
 *
 * Max stars: formulas.md §4A §1.2 "Exceptions" and §1.4 "Superior equipment".
 * Sources: https://maplestorywiki.net/w/Star_Force_Enhancement ·
 *          https://maplestorywiki.net/w/Category:Superior_Equipment
 */
const SUPERIOR_NAME_RULES = [
	{
		pattern: /^Tyrant (Altair|Charon|Hermes|Hyades|Lycaon) (Belt|Boots|Cloak|Gloves)$/,
		maxStars: 15
	},
	{ pattern: /^Nova (Altair|Charon|Hermes|Hyades|Lycaon) (Belt|Boots|Cloak)$/, maxStars: 8 },
	{
		pattern: /^Elite Heliseum (Warrior|Magician|Bowman|Thief|Pirate) (Belt|Cape|Boots)$/,
		maxStars: 3
	}
];

/**
 * typeInfo subCategories that are not wearable equipment for our purposes.
 * (Character/Hair, Character/Face and Character/Head are the avatar's own body
 * parts; Bits are Kain's; Test Armor / Test Weapon are dev leftovers.)
 */
const SKIP_SUBCATEGORIES = new Set([
	'Hair',
	'Face',
	'Head',
	'Test Armor',
	'Test Weapon',
	'Crusader Codex',
	'Bits',
	'Pet Equipment',
	'Pickaxe',
	'Shovel',
	'Mount',
	'Cash',
	'Dragon Equipment',
	'Mechanic Equipment'
]);

/* -------------------------------------------------------------------------- */
/* Slot / category mapping                                                     */
/* -------------------------------------------------------------------------- */

/**
 * WZ `islot` -> our canonical slot family.
 * `Si` and `Po` and `Tm` are ambiguous and are resolved by subCategory below.
 */
const ISLOT_TO_SLOT = {
	Wp: 'weapon',
	WpSi: 'weapon',
	Cp: 'hat',
	Ma: 'top',
	Pn: 'bottom',
	MaPn: 'overall',
	So: 'shoes',
	Gv: 'gloves',
	Sr: 'cape',
	Sh: 'shoulder',
	Be: 'belt',
	Pe: 'pendant',
	Ri: 'ring',
	Ae: 'earrings',
	Af: 'face',
	Ay: 'eye',
	Me: 'medal',
	Ba: 'badge'
};

/** Our canonical slot family -> the `ItemCategory` in src/lib/schema/item.ts. */
export const SLOT_TO_CATEGORY = {
	weapon: 'weapon',
	secondary: 'secondary',
	emblem: 'emblem',
	hat: 'armor',
	top: 'armor',
	bottom: 'armor',
	overall: 'armor',
	shoes: 'armor',
	gloves: 'armor',
	cape: 'armor',
	shoulder: 'armor',
	belt: 'accessory',
	pendant: 'accessory',
	ring: 'accessory',
	earrings: 'accessory',
	face: 'accessory',
	eye: 'accessory',
	pocket: 'pocket',
	badge: 'badge',
	medal: 'medal',
	heart: 'heart',
	android: 'android',
	totem: 'totem'
};

function resolveSlot(item, stat) {
	const sub = item.typeInfo?.subCategory ?? '';
	const islot = stat.islot;

	if (islot === 'Si') {
		if (sub === 'Emblem') return 'emblem';
		// Shields, Katara and every "Secondary Weapon / *" subCategory share islot Si.
		return 'secondary';
	}
	if (islot === 'Po') return sub === 'Totem' ? 'totem' : 'pocket';
	if (islot === 'Tm') {
		if (sub === 'Android') return 'android';
		if (sub === 'Mechanical Heart') return 'heart';
		return null;
	}
	return ISLOT_TO_SLOT[islot] ?? null;
}

/** Weapon-type label, taken verbatim from the maplestory.io subCategory. */
function resolveWeaponType(item, slot) {
	if (slot !== 'weapon' && slot !== 'secondary') return undefined;
	return item.typeInfo?.subCategory || undefined;
}

/** True for the two-handed weapons that occupy the secondary slot as well. */
function isTwoHanded(item, stat) {
	return stat.islot === 'WpSi' || item.typeInfo?.category === 'Two-Handed Weapon';
}

/* -------------------------------------------------------------------------- */
/* Base stats                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * mapledoro key -> `schema.StatBlock` key.
 *
 * Only the keys that reach the damage formula, plus `def`, which is free and
 * lets a tooltip be reconstructed. Deliberately absent: incACC / incEVA /
 * incSpeed / incJump / incMMP (no damage term reads them), and `charmEXP`.
 *
 * `bdR` and `imdR` are the WZ names for Boss Damage % and Ignore Enemy DEF % —
 * a handful of base items (Arcane/Genesis weapons, Dawn accessories) carry
 * these on the item itself, not only on potential, and dropping them would
 * understate every weapon acquisition by 30 percentage points of boss damage.
 */
const BASE_STAT_KEYS = {
	incSTR: 'str',
	incDEX: 'dex',
	incINT: 'int',
	incLUK: 'luk',
	incMHP: 'maxHp',
	incMHPr: 'maxHpPct',
	incPAD: 'att',
	incMAD: 'matt',
	incPDD: 'def',
	bdR: 'bossDmgPct',
	imdR: 'iedPct'
};

/** The item as it drops: no scrolls, no stars, no flames, no potential. */
function baseStats(stat) {
	const out = {};
	for (const [from, to] of Object.entries(BASE_STAT_KEYS)) {
		const value = stat[from];
		if (typeof value === 'number' && value !== 0) out[to] = value;
	}
	return Object.keys(out).length > 0 ? out : undefined;
}

/* -------------------------------------------------------------------------- */
/* Capability rules (applied here, DOCUMENTED in src/lib/data/items/rules.ts)   */
/* -------------------------------------------------------------------------- */

/**
 * Rule ids recorded per entry. `rules.ts` maps each id to the human-readable
 * reason and its citation; keeping only the id in JSON keeps the file small
 * and keeps the prose reviewable in one place.
 */
export const RULE_IDS = {
	liberatedFixedStar: 'liberated-weapon-fixed-star',
	destinyStageAmbiguous: 'destiny-stage-ambiguous',
	noUpgradeSlots: 'no-upgrade-slots',
	exclusiveScrollOnly: 'exclusive-scroll-only',
	superior: 'superior-equipment',
	flameIneligibleSlot: 'flame-ineligible-slot',
	flameIneligibleException: 'flame-eligible-exception',
	potentialIneligibleSlot: 'potential-ineligible-slot',
	potentialBadgeException: 'potential-badge-exception',
	bonusPotentialHeroic: 'bonus-potential-not-in-heroic'
};

/**
 * Flames. formulas.md §4A §2.1 "Cannot receive bonus stats at all":
 *   Secondary weapons & shields (incl. Katara), Emblems, Badges,
 *   Medals (except Immortal Legacy), Rings, Androids & Android/Mechanical
 *   Hearts, Shoulders (except Scarlet Shoulder), Totems (except Ancient
 *   Slate Replica).
 * Sources: https://maplestorywiki.net/w/Bonus_Stats ·
 *          https://www.whackybeanz.com/guides/flames ·
 *          https://strategywiki.org/wiki/MapleStory/Bonus_Stats
 */
// NOTE: `pocket` is deliberately ABSENT. Pocket items are not on the wiki's
// "cannot receive bonus stats" list and are not on formulas.md §4A §2.1's list
// either; the Pink Holy Cup is explicitly a Boss Reward item "granting it
// additional Bonus Stats". https://maplestorywiki.net/w/Bonus_Stats
const FLAME_INELIGIBLE_SLOTS = new Set([
	'secondary',
	'emblem',
	'badge',
	'medal',
	'ring',
	'android',
	'heart',
	'shoulder',
	'totem'
]);

/** The three named exceptions from that same list. Matched case-insensitively. */
const FLAME_ELIGIBLE_EXCEPTIONS = ['immortal legacy', 'scarlet shoulder', 'ancient slate replica'];

/**
 * Potential. formulas.md §4A §3.1 "Never gets potential":
 *   Medals; Badges (except Ghost Ship Exorcist, Sengoku Hakase Badge and
 *   Shackles of Resentment); Pocket Items; Androids (Android *Hearts* can);
 *   Totems; certain special rings.
 * Sources: https://maplestorywiki.net/w/Potential ·
 *          https://strategywiki.org/wiki/MapleStory/Potential_System
 */
const POTENTIAL_INELIGIBLE_SLOTS = new Set(['medal', 'badge', 'pocket', 'android', 'totem']);

const POTENTIAL_BADGE_EXCEPTIONS = [
	'ghost ship exorcist',
	'sengoku hakase',
	'shackles of resentment'
];

/**
 * Genesis / Destiny liberated weapons.
 * formulas.md §4A §1.2 "Fixed-star / non-star-forceable items" and §4B §5:
 *   "Liberated Genesis Weapon comes at: Star Force 22★ (not enhanceable) ...
 *    Destiny Stage 1: 22★ not enhanceable ... Destiny Stage 2: 22★
 *    enhanceable to 25★."
 * Sources: https://maplestorywiki.net/w/Genesis_Weapon ·
 *          https://maplestorywiki.net/w/Destiny_Weapon ·
 *          https://orangemushroom.net/2025/03/20/kms-ver-1-2-401-maplestory-next-destiny-weapon-star-force-reorganization/
 *
 * Only the WEAPON-slot items count. "Genesis Badge", "Genesis Bandana",
 * "Bond of Destiny" (a cape) and the Destiny medals are ordinary items that a
 * naive substring match on "genesis"/"destiny" would wrongly capture.
 * "Sealed Genesis <X>" is the pre-liberation quest weapon, which has zero
 * upgrade slots and is caught by the no-upgrade-slots rule instead.
 */
function liberatedWeapon(name, slot, itemLevel) {
	if (slot !== 'weapon') return null;
	if (/^Sealed Genesis /.test(name)) return null;
	if (/^Genesis /.test(name) && itemLevel === 200) return { line: 'genesis', fixedStarforce: 22 };
	if (/^Destiny /.test(name) && itemLevel === 250) return { line: 'destiny', fixedStarforce: 22 };
	return null;
}

/**
 * Items that HAVE upgrade slots but still take no star force, because those
 * slots are reserved for an item-exclusive enhancement currency.
 *
 * The `tuc === 0` screen catches almost everything ("cannot take a spell trace
 * -> cannot take star force" holds across all 184 level-100+ GMS rings), but it
 * is necessary, not sufficient: these event rings carry 3-20 slots that only
 * accept Vengeful Stones / Cosmos Atoms / the Awake Ring Exclusive Enhancement
 * Scroll, and are permanently 0★.
 *
 * Sources: https://maplestorywiki.net/w/Vengeful_Ring ·
 *          https://maplestorywiki.net/w/Cosmos_Ring ·
 *          https://maplestorywiki.net/w/Awake_Ring
 *
 * The inverse trap is Glona's Heart (Lv180), which is exclusive-scroll-only yet
 * DOES star force to 30★ — so this is a name list, not a "has exclusive
 * scrolls" heuristic.
 */
const EXCLUSIVE_SCROLL_NO_STAR_FORCE = [
	// Vengeful Stones. https://maplestorywiki.net/w/Vengeful_Ring
	/^(heroic )?vengeful ring$/,
	// Cosmos Atoms. https://maplestorywiki.net/w/Cosmos_Ring
	/^(heroic )?cosmos ring$/,
	// Awake Ring Exclusive Enhancement Scroll. https://maplestorywiki.net/w/Awake_Ring
	/^(heroic )?awake ring$/,
	// Tenebris Expedition Ring Enhancement Scroll. Wiki wikitext for
	// https://maplestorywiki.net/w/Tenebris_Expedition_Ring has
	// `starForceEnhancements=` EMPTY and `scrollEnhancements=3`.
	/^(heroic )?tenebris expedition ring/,
	// Hyperspace rings, upgraded with Ascension Modules. Wiki wikitext for
	// https://maplestorywiki.net/w/Krrr_Ring has `starForceEnhancements=` empty
	// and `scrollEnhancements=10` on every tier.
	/(krrr|rawr|ribbit|pew pew) ring$/
];

function exclusiveScrollOnly(name) {
	const lower = name
		.toLowerCase()
		.replace(/\s*\(lv\.?\s*\d+\)\s*$/, '')
		.replace(/\s*\((complete|stage \d+)\)\s*$/, '')
		.trim();
	return EXCLUSIVE_SCROLL_NO_STAR_FORCE.some((pattern) => pattern.test(lower));
}

function superiorRule(name) {
	return SUPERIOR_NAME_RULES.find((rule) => rule.pattern.test(name)) ?? null;
}

function computeCapabilities({ name, slot, itemLevel, upgradeSlots }) {
	const lower = name.toLowerCase();
	const rules = [];

	const superior = superiorRule(name);
	const liberated = liberatedWeapon(name, slot, itemLevel);

	/* --- star force ------------------------------------------------------- */
	let canStarforce;
	let fixedStarforce;
	if (liberated) {
		canStarforce = false;
		fixedStarforce = liberated.fixedStarforce;
		rules.push(RULE_IDS.liberatedFixedStar);
		if (liberated.line === 'destiny') rules.push(RULE_IDS.destinyStageAmbiguous);
	} else if (upgradeSlots === 0) {
		// formulas.md §4A §1.2: "Items with no upgrade slots cannot be star forced."
		canStarforce = false;
		rules.push(RULE_IDS.noUpgradeSlots);
	} else if (exclusiveScrollOnly(name)) {
		canStarforce = false;
		rules.push(RULE_IDS.exclusiveScrollOnly);
	} else {
		canStarforce = true;
	}
	if (superior) rules.push(RULE_IDS.superior);

	/* --- flames ----------------------------------------------------------- */
	let canFlame = !FLAME_INELIGIBLE_SLOTS.has(slot);
	if (!canFlame && FLAME_ELIGIBLE_EXCEPTIONS.some((x) => lower.includes(x))) {
		canFlame = true;
		rules.push(RULE_IDS.flameIneligibleException);
	} else if (!canFlame) {
		rules.push(RULE_IDS.flameIneligibleSlot);
	}

	/* --- potential -------------------------------------------------------- */
	let canPotential = !POTENTIAL_INELIGIBLE_SLOTS.has(slot);
	if (
		!canPotential &&
		slot === 'badge' &&
		POTENTIAL_BADGE_EXCEPTIONS.some((x) => lower.includes(x))
	) {
		canPotential = true;
		rules.push(RULE_IDS.potentialBadgeException);
	} else if (!canPotential) {
		rules.push(RULE_IDS.potentialIneligibleSlot);
	}

	/* --- bonus potential --------------------------------------------------- */
	// formulas.md §4A §3.1: bonus potential does not exist in Heroic/Reboot,
	// which is this tracker's only world scope (design §2). Kept as a separate
	// flag so the item-level truth ("would this take bonus pot in Interactive")
	// survives; `capabilities()` ANDs it with the world scope.
	const canBonusPotential = canPotential;

	return {
		canStarforce,
		...(fixedStarforce !== undefined ? { fixedStarforce } : {}),
		canFlame,
		canPotential,
		// canBonusPotential is always identical to canPotential (bonus potential
		// requires regular potential), so it is derived at load rather than stored.
		...(superior ? { superior: true, superiorMaxStars: superior.maxStars } : {}),
		...(rules.length > 0 ? { rules } : {})
	};
}

/* -------------------------------------------------------------------------- */
/* Fetch + cache                                                               */
/* -------------------------------------------------------------------------- */

function parseArgs(argv) {
	const out = { cacheDir: join(tmpdir(), 'maple-item-cache'), offline: false };
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--cache-dir') out.cacheDir = argv[++i];
		else if (argv[i] === '--offline') out.offline = true;
	}
	return out;
}

async function fetchJson(url, cacheFile, offline) {
	if (existsSync(cacheFile)) {
		process.stderr.write(`cache hit  ${cacheFile}\n`);
		return JSON.parse(readFileSync(cacheFile, 'utf8'));
	}
	if (offline) throw new Error(`--offline but no cache at ${cacheFile} (for ${url})`);
	process.stderr.write(`fetching   ${url}\n`);
	const res = await fetch(url, { signal: AbortSignal.timeout(600_000) });
	if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
	const text = await res.text();
	mkdirSync(dirname(cacheFile), { recursive: true });
	writeFileSync(cacheFile, text);
	return JSON.parse(text);
}

/* -------------------------------------------------------------------------- */
/* Build                                                                       */
/* -------------------------------------------------------------------------- */

export async function build(options = {}) {
	const { cacheDir, offline } = { ...parseArgs([]), ...options };

	const itemList = await fetchJson(SOURCES.itemList, join(cacheDir, 'item-list.json'), offline);
	const itemStatsDoc = await fetchJson(
		SOURCES.itemStats,
		join(cacheDir, 'item-stats.json'),
		offline
	);
	const setDoc = await fetchJson(SOURCES.sets, join(cacheDir, 'set.json'), offline);

	const stats = itemStatsDoc.entries ?? itemStatsDoc;
	const sets = setDoc.entries ?? setDoc;

	const setNameById = new Map();
	for (const [id, set] of Object.entries(sets)) {
		if (id === '_meta' || !set?.name) continue;
		setNameById.set(Number(id), set.name);
	}

	const pad = (id) => String(id).padStart(8, '0');
	const entries = [];
	const skipped = { notEquip: 0, cash: 0, noSlot: 0, subCategory: 0, belowLevel: 0 };

	for (const item of itemList) {
		const type = item.typeInfo;
		if (!type || type.overallCategory !== 'Equip') {
			skipped.notEquip++;
			continue;
		}
		if (SKIP_SUBCATEGORIES.has(type.subCategory)) {
			skipped.subCategory++;
			continue;
		}
		const stat = stats[pad(item.id)] ?? {};
		if (item.isCash || stat.cash) {
			skipped.cash++;
			continue;
		}

		const slot = resolveSlot(item, stat);
		if (!slot) {
			skipped.noSlot++;
			continue;
		}

		const name = (item.name ?? '').trim();
		if (!name) continue;

		const itemLevel = stat.reqLevel ?? item.requiredLevel ?? 0;
		const keep =
			itemLevel >= MIN_ITEM_LEVEL || ALWAYS_INCLUDED_SLOTS.has(slot) || superiorRule(name) !== null;
		if (!keep) {
			skipped.belowLevel++;
			continue;
		}

		const upgradeSlots = stat.tuc ?? 0;
		const capabilities = computeCapabilities({ name, slot, itemLevel, upgradeSlots });
		const setItemId = stat.setItemID && stat.setItemID > 0 ? stat.setItemID : undefined;

		// `category`, `canBonusPotential` and `iconUrl` are DERIVED, not stored:
		// `src/lib/data/items/index.ts` materialises them at load from `slot`,
		// `canPotential` and `sources.iconTemplate`. Storing them would add ~110
		// bytes x 5,700 entries (~640 KB) to a file that ships in the bundle.
		// An empty `rules` array is omitted for the same reason.
		entries.push({
			id: item.id,
			name,
			slot,
			itemLevel,
			...(resolveWeaponType(item, slot) ? { weaponType: resolveWeaponType(item, slot) } : {}),
			...(isTwoHanded(item, stat) && slot === 'weapon' ? { twoHanded: true } : {}),
			// WZ job bitmask: 1 warrior, 2 magician, 4 bowman, 8 thief, 16 pirate.
			// Absent means "any job". This is what picks the right branch out of a
			// per-branch armour family ("AbsoLab Set (Warrior)" vs "(Magician)").
			...(typeof stat.reqJob === 'number' && stat.reqJob > 0 ? { reqJob: stat.reqJob } : {}),
			...(baseStats(stat) ? { base: baseStats(stat) } : {}),
			...(setItemId ? { setItemId } : {}),
			...(setItemId && setNameById.has(setItemId) ? { setName: setNameById.get(setItemId) } : {}),
			// RAW WZ tuc. mapledoro's _meta: "in-game upgrade slots equal tuc plus 1."
			// Only ever compared against 0 ("has no upgrade slots at all").
			upgradeSlots,
			...capabilities
		});
	}

	entries.sort((a, b) => a.id - b.id);

	const doc = {
		$comment:
			'GENERATED FILE — do not edit by hand. Regenerate with `node scripts/build-item-catalogue.mjs`.',
		generatedAt: new Date().toISOString(),
		region: REGION,
		gameVersion: GMS_VERSION,
		minItemLevel: MIN_ITEM_LEVEL,
		coverage: {
			// maplestory.io serves GMS up to v270 and nothing newer: v271-v278 all
			// return 500/502/no-response, and there is no `latest` alias. So v270 is
			// the newest usable dump, and it PREDATES the Anima class Ren and the
			// Jianghu/Shine classes.
			note:
				`This catalogue is GMS v${GMS_VERSION}, the newest dump maplestory.io serves. Items ` +
				'and classes released after v270 are NOT in it — most notably Ren (Sword + Imugi ' +
				'Gem), Mo Xuan, Sia Astelle and Erel Light. A name that is absent means UNKNOWN, ' +
				'never INVALID: consumers must degrade to the permissive slot-level rules and flag ' +
				'the item, never suppress its upgrades or warn that it does not exist.',
			knownMissing: [
				'Imugi Gem (Ren secondary)',
				'Sword (Ren primary weapon type)',
				'Talisman (Kanna secondary, GMS v266)',
				'Martial Brace / Brace Band (Mo Xuan)',
				'Celestial Light / Compass (Sia Astelle)',
				'Gram / Keir (Erel Light)'
			],
			newerVersionsProbed: 'GMS 271-278 all return 500/502; /item/overall and paged /item 502'
		},
		sources: {
			itemList: SOURCES.itemList,
			itemStats: SOURCES.itemStats,
			sets: SOURCES.sets,
			iconTemplate: SOURCES.iconTemplate,
			mapledoroCommit: MAPLEDORO_SHA,
			rulesDocumentedIn: 'src/lib/data/items/rules.ts (each rule cites docs/research/formulas.md)'
		},
		counts: {
			entries: entries.length,
			starforceable: entries.filter((e) => e.canStarforce).length,
			flameable: entries.filter((e) => e.canFlame).length,
			potentialable: entries.filter((e) => e.canPotential).length,
			bonusPotentialable: entries.filter((e) => e.canPotential).length,
			fixedStar: entries.filter((e) => e.fixedStarforce !== undefined).length,
			superior: entries.filter((e) => e.superior).length
		},
		entries
	};

	return { doc, skipped };
}

async function main() {
	const opts = parseArgs(process.argv.slice(2));
	const { doc, skipped } = await build(opts);
	mkdirSync(dirname(OUT), { recursive: true });
	writeFileSync(OUT, JSON.stringify(doc) + '\n');
	const bytes = readFileSync(OUT).length;
	process.stderr.write(
		`wrote ${OUT}\n  ${doc.entries.length} entries, ${(bytes / 1024 / 1024).toFixed(2)} MB\n` +
			`  counts ${JSON.stringify(doc.counts)}\n  skipped ${JSON.stringify(skipped)}\n`
	);
}

if (process.argv[1] && process.argv[1].endsWith('build-item-catalogue.mjs')) {
	await main();
}
