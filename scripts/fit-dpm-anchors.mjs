// Fit `DPM_dummy = k_class * combatPower ** alpha` from the KMS 연무장 dataset.
//
// Input:  docs/research/data/yeonmujang-2026-08.csv (933 records, 2026-08 KMS)
// Output: a TypeScript literal for CLASS_DPM_FITS in src/lib/data/dpm-anchors.ts,
//         printed to stdout. Run: node scripts/fit-dpm-anchors.mjs [--emit]
//
// Method: ordinary least squares on log(dpm) vs log(combat_power) over the
// `maplescouter_trusted` records of one class. Two fits per class:
//   * free alpha, when the class has >= MIN_FREE_ALPHA_SAMPLES records;
//   * alpha pinned to the SHARED_ALPHA median, always.
// See docs/research/dpm-anchors.md §3, §4.2.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CSV = join(ROOT, 'docs', 'research', 'data', 'yeonmujang-2026-08.csv');

/** dpm-anchors.md TL;DR: median alpha over the 41 classes with >= 8 samples. */
const SHARED_ALPHA = 1.14;
const MIN_FREE_ALPHA_SAMPLES = 8;

/* ---------------------------------------------------------------- CSV ---- */

function parseCsv(text) {
	const rows = [];
	let row = [];
	let field = '';
	let quoted = false;
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (quoted) {
			if (c === '"') {
				if (text[i + 1] === '"') {
					field += '"';
					i++;
				} else quoted = false;
			} else field += c;
			continue;
		}
		if (c === '"') quoted = true;
		else if (c === ',') {
			row.push(field);
			field = '';
		} else if (c === '\n') {
			row.push(field);
			rows.push(row);
			row = [];
			field = '';
		} else if (c !== '\r') field += c;
	}
	if (field !== '' || row.length) {
		row.push(field);
		rows.push(row);
	}
	const header = rows.shift();
	return rows
		.filter((r) => r.length === header.length)
		.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

/* ---------------------------------------------- csv class -> our classId -- */

const CLASS_ID_BY_CSV_NAME = {
	Hero: 'hero',
	Paladin: 'paladin',
	'Dark Knight': 'dark-knight',
	'Arch Mage (Fire, Poison)': 'arch-mage-fp',
	'Arch Mage (Ice, Lightning)': 'arch-mage-il',
	Bishop: 'bishop',
	Bowmaster: 'bow-master',
	Marksman: 'marksman',
	Pathfinder: 'pathfinder',
	'Night Lord': 'night-lord',
	Shadower: 'shadower',
	'Dual Blade': 'dual-blade',
	Buccaneer: 'buccaneer',
	Corsair: 'corsair',
	Cannoneer: 'cannoneer',
	'Dawn Warrior': 'dawn-warrior',
	Mihile: 'mihile',
	'Blaze Wizard': 'blaze-wizard',
	'Wind Archer': 'wind-archer',
	'Night Walker': 'night-walker',
	'Thunder Breaker': 'thunder-breaker',
	Aran: 'aran',
	Evan: 'evan',
	Luminous: 'luminous',
	Mercedes: 'mercedes',
	Phantom: 'phantom',
	Shade: 'shade',
	Blaster: 'blaster',
	'Battle Mage': 'battle-mage',
	'Wild Hunter': 'wild-hunter',
	Mechanic: 'mechanic',
	Xenon: 'xenon',
	'Demon Slayer': 'demon-slayer',
	'Demon Avenger': 'demon-avenger',
	Kaiser: 'kaiser',
	Kain: 'kain',
	Cadena: 'cadena',
	'Angelic Buster': 'angelic-buster',
	Zero: 'zero',
	Kinesis: 'kinesis',
	Adele: 'adele',
	Illium: 'illium',
	Khali: 'khali',
	Ark: 'ark',
	Lara: 'lara',
	Hoyoung: 'hoyoung',
	Ren: 'ren',
	// Lethe is KMS-only and has no entry in src/lib/data/classes.ts; dropped.
	Lethe: null
};

/* ---------------------------------------------------------------- fit ---- */

/** OLS of y on x. Returns { slope, intercept, r2 }. */
function ols(xs, ys) {
	const n = xs.length;
	const mx = xs.reduce((a, b) => a + b, 0) / n;
	const my = ys.reduce((a, b) => a + b, 0) / n;
	let sxy = 0;
	let sxx = 0;
	let syy = 0;
	for (let i = 0; i < n; i++) {
		sxy += (xs[i] - mx) * (ys[i] - my);
		sxx += (xs[i] - mx) ** 2;
		syy += (ys[i] - my) ** 2;
	}
	const slope = sxx === 0 ? 0 : sxy / sxx;
	const intercept = my - slope * mx;
	const r2 = syy === 0 ? 1 : (sxy * sxy) / (sxx * syy);
	return { slope, intercept, r2 };
}

function median(values) {
	const s = [...values].sort((a, b) => a - b);
	const m = s.length >> 1;
	return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Median |predicted/actual - 1| as a percent. */
function spreadPercent(records, k, alpha) {
	return median(records.map((r) => Math.abs((k * r.cp ** alpha) / r.dpm - 1))) * 100;
}

/* --------------------------------------------------------------- main ---- */

const rows = parseCsv(readFileSync(CSV, 'utf8'));

// Unit check (dpm-anchors.md §2): `dps` is raw damage/second and `dpm` is
// damage/minute, i.e. dpm === dps * 60. Fail loudly if that stops holding.
for (const r of rows) {
	const dps = Number(r.dps);
	const dpm = Number(r.dpm);
	if (Math.abs(dpm / (dps * 60) - 1) > 1e-9) {
		throw new Error(`dpm !== dps*60 for ${r.nickname}: ${dpm} vs ${dps * 60}`);
	}
}

const byClass = new Map();
let skipped = 0;
for (const r of rows) {
	if (r.maplescouter_trusted !== 'True') continue;
	const classId = CLASS_ID_BY_CSV_NAME[r.class_gms];
	if (classId === undefined) throw new Error(`unmapped class: ${r.class_gms}`);
	if (classId === null) {
		skipped++;
		continue;
	}
	const cp = Number(r.combat_power);
	const dpm = Number(r.dpm);
	if (!(cp > 0) || !(dpm > 0)) continue;
	if (!byClass.has(classId)) byClass.set(classId, []);
	byClass.get(classId).push({ cp, dpm, nickname: r.nickname, level: Number(r.level) });
}

const fits = [];
for (const [classId, records] of byClass) {
	const xs = records.map((r) => Math.log(r.cp));
	const ys = records.map((r) => Math.log(r.dpm));
	const n = records.length;

	const free = n >= MIN_FREE_ALPHA_SAMPLES ? ols(xs, ys) : null;
	const freeAlpha = free ? free.slope : null;
	const freeK = free ? Math.exp(free.intercept) : null;

	// alpha pinned: k = geometric mean of dpm / cp^alpha.
	const pinnedK = Math.exp(ys.reduce((a, y, i) => a + y - SHARED_ALPHA * xs[i], 0) / n);
	// r2 of the pinned model, against the same total sum of squares.
	const my = ys.reduce((a, b) => a + b, 0) / n;
	const ssTot = ys.reduce((a, y) => a + (y - my) ** 2, 0);
	const ssRes = ys.reduce(
		(a, y, i) => a + (y - (Math.log(pinnedK) + SHARED_ALPHA * xs[i])) ** 2,
		0
	);
	const pinnedR2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

	const useFree = free !== null;
	const k = useFree ? freeK : pinnedK;
	const alpha = useFree ? freeAlpha : SHARED_ALPHA;
	const r2 = useFree ? free.r2 : pinnedR2;

	fits.push({
		classId,
		n,
		k,
		alpha,
		r2,
		spread: spreadPercent(records, k, alpha),
		pinnedK,
		pinnedR2,
		pinnedSpread: spreadPercent(records, pinnedK, SHARED_ALPHA),
		freeAlpha,
		cpMin: Math.min(...records.map((r) => r.cp)),
		cpMax: Math.max(...records.map((r) => r.cp)),
		fittedAlpha: useFree
	});
}

fits.sort((a, b) => a.classId.localeCompare(b.classId));

const alphas = fits.filter((f) => f.fittedAlpha).map((f) => f.freeAlpha);
console.error(
	`# ${rows.length} rows, ${skipped} dropped (Lethe: not a GMS class), ` +
		`${fits.length} classes, median free alpha ${median(alphas).toFixed(3)} ` +
		`(range ${Math.min(...alphas).toFixed(2)}-${Math.max(...alphas).toFixed(2)}), ` +
		`${fits.filter((f) => f.fittedAlpha).length} with >= ${MIN_FREE_ALPHA_SAMPLES} samples`
);

if (process.argv.includes('--table')) {
	console.error('\nclassId          n   alpha    k(free)     r2   spread%   k@1.14   spread@1.14%');
	for (const f of fits) {
		console.error(
			[
				f.classId.padEnd(16),
				String(f.n).padStart(3),
				f.alpha.toFixed(3).padStart(7),
				f.k.toExponential(4).padStart(11),
				f.r2.toFixed(3).padStart(6),
				f.spread.toFixed(1).padStart(8),
				f.pinnedK.toExponential(4).padStart(11),
				f.pinnedSpread.toFixed(1).padStart(9)
			].join(' ')
		);
	}
	console.error(
		`\nCP range over all trusted records: ` +
			`${Math.min(...fits.map((f) => f.cpMin)).toExponential(3)} - ` +
			`${Math.max(...fits.map((f) => f.cpMax)).toExponential(3)}`
	);
}

/* ------------------------------------------------------------- emit ------ */

const lines = fits.map((f) => {
	const parts = [
		`k: ${f.k.toExponential(6)}`,
		`alpha: ${f.alpha.toFixed(4)}`,
		`sampleSize: ${f.n}`,
		`r2: ${f.r2.toFixed(4)}`,
		`spreadPercent: ${f.spread.toFixed(1)}`,
		`kAtSharedAlpha: ${f.pinnedK.toExponential(6)}`,
		`spreadAtSharedAlphaPercent: ${f.pinnedSpread.toFixed(1)}`,
		`cpRange: [${f.cpMin}, ${f.cpMax}]`,
		`alphaFitted: ${f.fittedAlpha}`
	];
	const key = /^[a-z][a-z0-9]*$/.test(f.classId) ? f.classId : `'${f.classId}'`;
	return `\t${key}: { ${parts.join(', ')} },`;
});
console.log(lines.join('\n'));
