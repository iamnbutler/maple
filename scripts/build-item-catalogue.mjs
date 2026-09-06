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

/** Name prefixes for Superior (Tyrant / Nova / Elite Heliseum) gear, included at every level. */
const SUPERIOR_NAME_RULES = [
	// formulas.md §4A §1.2 "Exceptions" and §1.4 "Superior equipment".
	// Nova/Tyrant secondaries ("Nova Truth Essence") are NOT superior armour —
	// they are secondary weapons, so they are excluded by the slot check below.
	{ prefix: 'Tyrant ', maxStars: 15 },
	{ prefix: 'Nova ', maxStars: 8 },
	{ prefix: 'Elite Heliseum ', maxStars: 3 }
];

const SUPERIOR_SLOTS = new Set(['belt', 'shoes', 'cape', 'gloves', 'hat', 'shoulder']);

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
const FLAME_INELIGIBLE_SLOTS = new Set([
	'secondary',
	'emblem',
	'badge',
	'medal',
	'ring',
	'android',
	'heart',
	'shoulder',
	'totem',
	'pocket'
]);

/** The three named exceptions from that same list. Matched case-insensitively. */
const FLAME_ELIGIBLE_EXCEPTIONS = [
	'immortal legacy',
	'scarlet shoulder',
	'ancient slate replica'
];

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

function superiorRule(name, slot) {
	if (!SUPERIOR_SLOTS.has(slot)) return null;
	for (const rule of SUPERIOR_NAME_RULES) {
		if (name.startsWith(rule.prefix)) return rule;
	}
	return null;
}

function computeCapabilities({ name, slot, itemLevel, upgradeSlots }) {
	const lower = name.toLowerCase();
	const rules = [];

	const superior = superiorRule(name, slot);
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
	if (!canPotential && slot === 'badge' && POTENTIAL_BADGE_EXCEPTIONS.some((x) => lower.includes(x))) {
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
		canBonusPotential,
		...(superior ? { superior: true, superiorMaxStars: superior.maxStars } : {}),
		rules
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
			itemLevel >= MIN_ITEM_LEVEL ||
			ALWAYS_INCLUDED_SLOTS.has(slot) ||
			superiorRule(name, slot) !== null;
		if (!keep) {
			skipped.belowLevel++;
			continue;
		}

		const upgradeSlots = stat.tuc ?? 0;
		const capabilities = computeCapabilities({ name, slot, itemLevel, upgradeSlots });
		const setItemId = stat.setItemID && stat.setItemID > 0 ? stat.setItemID : undefined;

		entries.push({
			id: item.id,
			name,
			slot,
			category: SLOT_TO_CATEGORY[slot],
			itemLevel,
			...(resolveWeaponType(item, slot) ? { weaponType: resolveWeaponType(item, slot) } : {}),
			...(isTwoHanded(item, stat) && slot === 'weapon' ? { twoHanded: true } : {}),
			...(setItemId ? { setItemId } : {}),
			...(setItemId && setNameById.has(setItemId) ? { setName: setNameById.get(setItemId) } : {}),
			// RAW WZ tuc. mapledoro's _meta: "in-game upgrade slots equal tuc plus 1."
			// Only ever compared against 0 ("has no upgrade slots at all").
			upgradeSlots,
			iconUrl: SOURCES.iconTemplate.replace('{id}', String(item.id)),
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
