// Build src/lib/data/sets.json — equipment set effects.
//
//   node scripts/build-sets.mjs [--cache-dir DIR] [--offline]
//
// TWO SOURCES, because neither is sufficient alone.
//
// 1. chablades/mapledoro manifests/v270/set.json — every set in the game, its
//    members, and its per-piece-count effects. BUT it carries only the simple
//    stat fields (incSTR/incAllStat/incPAD/incMHP/incPDD/...) and DROPS boss
//    damage, ignore-enemy-defence and the other special effects entirely.
//
//    That omission is not cosmetic: those are the only fields that matter for
//    damage. Verified against client screenshots (docs/capture/2026-09-06-
//    lutoren.md) — the Root Abyss (Warrior) 4-set gives Boss Damage +30% and
//    set.json has no 4-set entry at all; Boss Accessory 7/9 give Ignore Defense
//    +10% / Boss Damage +10% and set.json lists neither.
//
// 2. VERIFIED_EFFECTS below — read directly off in-game set panels. These are
//    ground truth and are MERGED OVER the manifest. Sets not listed here keep
//    whatever the manifest had, and are marked `partial: true` so nothing
//    downstream mistakes an incomplete set for a complete one.
//
// Extend VERIFIED_EFFECTS from a screenshot whenever a new set matters.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MAPLEDORO_SHA = '7329396ec11823d7816a1093308683c46b7a0ffc';
const GMS_VERSION = '270';
const SOURCE = `https://raw.githubusercontent.com/chablades/mapledoro/${MAPLEDORO_SHA}/manifests/v${GMS_VERSION}/set.json`;

/**
 * Effects read off in-game set panels. Keyed by set name, then by piece count.
 * Percent fields are whole percents. These REPLACE the manifest's entry for
 * that count, because the manifest's version is missing fields rather than
 * merely differing.
 *
 * Source: docs/capture/2026-09-06-lutoren.md (photographs of the client).
 */
const VERIFIED_EFFECTS = {
	'Root Abyss Set (Warrior)': {
		2: { str: 20, dex: 20, maxHp: 1000, maxMp: 1000 },
		3: { maxHpPct: 10, maxMpPct: 10, att: 50 },
		4: { bossDmgPct: 30 }
	},
	'AbsoLab Set (Warrior)': {
		2: { maxHp: 1500, maxMp: 1500, att: 20, matt: 20, bossDmgPct: 10 },
		3: { allStat: 30, att: 20, matt: 20, bossDmgPct: 10 },
		4: { att: 25, matt: 25, def: 200, iedPct: 10 },
		5: { att: 30, matt: 30, bossDmgPct: 10 },
		6: { maxHpPct: 20, maxMpPct: 20, att: 20, matt: 20 },
		7: { att: 20, matt: 20, iedPct: 10 }
	},
	'Boss Accessory Set': {
		3: { allStat: 10, maxHpPct: 5, maxMpPct: 5, att: 5, matt: 5 },
		5: { allStat: 10, maxHpPct: 5, maxMpPct: 5, att: 5, matt: 5 },
		7: { allStat: 10, att: 10, matt: 10, def: 80, iedPct: 10 },
		9: { allStat: 15, att: 10, matt: 10, def: 100, bossDmgPct: 10 }
	},
	'Dawn Boss Set': {
		2: { allStat: 10, maxHp: 250, att: 10, matt: 10, bossDmgPct: 10 },
		3: { allStat: 10, maxHp: 250, att: 10, matt: 10 },
		4: { allStat: 10, maxHp: 250, att: 10, matt: 10, def: 100, iedPct: 10 }
	},
	'Superior Gollux Set': {
		2: { allStat: 20, maxHp: 1500, maxMp: 1500 },
		3: { maxHpPct: 13, maxMpPct: 13, att: 35, matt: 35 },
		4: { bossDmgPct: 30, iedPct: 30 }
	}
};

/** mapledoro field name -> our StatBlock key. Anything unmapped is dropped. */
const FIELD_MAP = {
	incSTR: 'str',
	incDEX: 'dex',
	incINT: 'int',
	incLUK: 'luk',
	incAllStat: 'allStat',
	incMHP: 'maxHp',
	incMMP: 'maxMp',
	incMHPr: 'maxHpPct',
	incMMPr: 'maxMpPct',
	incPAD: 'att',
	incMAD: 'matt',
	incPDD: 'def',
	incCr: 'critRatePct',
	incBDR: 'bossDmgPct',
	incIgnoreTargetDEF: 'iedPct'
};

function args() {
	const a = process.argv.slice(2);
	const cacheIdx = a.indexOf('--cache-dir');
	return {
		cacheDir: cacheIdx >= 0 ? a[cacheIdx + 1] : join(ROOT, '.cache'),
		offline: a.includes('--offline')
	};
}

async function load(cacheDir, offline) {
	const path = join(cacheDir, 'set.json');
	if (offline || existsSync(path)) {
		if (!existsSync(path)) throw new Error(`--offline but no cache at ${path}`);
		return JSON.parse(readFileSync(path, 'utf8'));
	}
	const res = await fetch(SOURCE);
	if (!res.ok) throw new Error(`GET ${SOURCE} -> ${res.status}`);
	const text = await res.text();
	mkdirSync(cacheDir, { recursive: true });
	writeFileSync(path, text);
	return JSON.parse(text);
}

function mapEffects(raw) {
	const out = {};
	let dropped = 0;
	for (const [field, value] of Object.entries(raw ?? {})) {
		const key = FIELD_MAP[field];
		if (key === undefined) {
			dropped += 1;
			continue;
		}
		out[key] = value;
	}
	return { effects: out, dropped };
}

const { cacheDir, offline } = args();
const doc = await load(cacheDir, offline);

const sets = [];
let verifiedCount = 0;
let droppedFields = 0;

for (const [setItemId, entry] of Object.entries(doc.entries ?? {})) {
	const name = entry.name;
	if (!name) continue;

	const effects = {};
	for (const [count, raw] of Object.entries(entry.effects ?? {})) {
		const { effects: mapped, dropped } = mapEffects(raw);
		droppedFields += dropped;
		if (Object.keys(mapped).length > 0) effects[count] = mapped;
	}

	const verified = VERIFIED_EFFECTS[name];
	if (verified) {
		for (const [count, eff] of Object.entries(verified)) effects[count] = eff;
		verifiedCount += 1;
	}

	if (Object.keys(effects).length === 0) continue;

	sets.push({
		setItemId: Number(setItemId),
		name,
		completeCount: entry.completeCount,
		memberItemIds: (entry.members ?? []).flatMap((m) => (m.itemIds ?? []).map((id) => Number(id))),
		memberCount: (entry.members ?? []).length,
		effects,
		// TRUE when we only have the manifest, which omits boss damage and IED.
		partial: !verified
	});
}

sets.sort((a, b) => a.setItemId - b.setItemId);

const out = {
	$comment: 'GENERATED — do not edit by hand. Regenerate with `node scripts/build-sets.mjs`.',
	generatedAt: new Date().toISOString(),
	region: 'GMS',
	gameVersion: GMS_VERSION,
	sources: {
		manifest: SOURCE,
		verified: 'docs/capture/2026-09-06-lutoren.md (in-game set panels)'
	},
	warning:
		'The manifest omits boss damage, ignore-enemy-defence and other special set effects. ' +
		'Sets with `partial: true` therefore carry only simple stat bonuses and UNDERSTATE ' +
		'their real damage contribution. Only sets listed in VERIFIED_EFFECTS are complete.',
	counts: { sets: sets.length, verified: verifiedCount, partial: sets.length - verifiedCount },
	sets
};

const dest = join(ROOT, 'src/lib/data/sets.json');
writeFileSync(dest, JSON.stringify(out, null, '\t') + '\n');
console.log(
	`wrote ${dest}: ${sets.length} sets, ${verifiedCount} screenshot-verified, ` +
		`${sets.length - verifiedCount} partial. Dropped ${droppedFields} unmapped manifest fields.`
);
