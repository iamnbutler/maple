// Deterministic parser for raw GMS potential / bonus-potential tooltip lines.
//
// The design doc (§3) stores potential lines verbatim and parses them here into
// `{ kind, stat?, value, raw }`. Parsing is total: an unrecognised line becomes
// `other` and is NEVER dropped, so nothing a screenshot produced is lost.
//
// The KINDS map onto the damage formula as follows:
//   stat_pct / stat_flat / all_stat_pct -> formulas.md §1.2 stat multiplier
//   att / att_pct / matt / matt_pct     -> §1.4 attack term
//   boss / dmg                          -> §1.6 damage multiplier (additive)
//   ied                                 -> §1.8 (composes multiplicatively!)
//   crit_rate / crit_dmg                -> §1.7
//   hp_pct                              -> §1.2 (Demon Avenger main stat)
//   cooldown / drop / meso / other      -> no damage contribution

import type { StatKey } from './types';

export type PotentialKind =
	| 'stat_pct'
	| 'stat_flat'
	| 'all_stat_pct'
	| 'att'
	| 'att_pct'
	| 'matt'
	| 'matt_pct'
	| 'boss'
	| 'ied'
	| 'dmg'
	| 'crit_rate'
	| 'crit_dmg'
	| 'hp_pct'
	| 'cooldown'
	| 'drop'
	| 'meso'
	| 'other';

export interface PotentialLine {
	kind: PotentialKind;
	/** Set for `stat_pct` / `stat_flat` (including flat Max HP, which uses `hp`). */
	stat?: StatKey;
	/**
	 * The magnitude, signed. Percent lines carry whole percents (`12` for +12%);
	 * `cooldown` carries seconds and is negative for a reduction. `other` is 0.
	 */
	value: number;
	/** The original line, untouched. */
	raw: string;
}

/** Lower-case, collapse runs of whitespace, and normalise the fancy characters GMS uses. */
function normalize(raw: string): string {
	return raw
		.normalize('NFKC')
		.replace(/[‐-―−]/g, '-') // en/em dashes and the minus sign
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase();
}

/** `+12%` / `: 12` / `-2 sec` -> a signed number. Returns `undefined` when absent. */
function firstNumber(text: string): number | undefined {
	const match = /([+-]?)\s*(\d+(?:\.\d+)?)/.exec(text);
	if (!match) return undefined;
	const value = Number(match[2]);
	return match[1] === '-' ? -value : value;
}

const STAT_WORDS: Record<string, StatKey> = {
	str: 'str',
	dex: 'dex',
	int: 'int',
	luk: 'luk'
};

interface Rule {
	kind: PotentialKind;
	/** Must match the normalised line. */
	test: RegExp;
	/** Extra guard: the presence/absence of a `%` sign. */
	percent?: boolean;
	stat?: StatKey | 'capture';
}

// Ordered — the FIRST match wins, so more specific patterns come first.
// ("Magic ATT" before "ATT"; "All Stats" before a bare stat; "Boss Monster
// Damage" before "Damage"; "Max HP" before "HP".)
const RULES: Rule[] = [
	// --- Cooldown / utility (checked early: they contain no % but do contain numbers) ---
	{ kind: 'cooldown', test: /\bskill cool ?(down|time)\b/ },
	{ kind: 'drop', test: /\bitem drop rate\b/ },
	{ kind: 'meso', test: /\bmesos? (obtained|acquired)\b/ },

	// --- All Stats ---
	{ kind: 'all_stat_pct', test: /^all ?stats?\b.*%/, percent: true },
	// Flat "All Stats : +12" is a real bonus-potential line; treat as all-stat-ish
	// but with no percent, so it is reported as `other` rather than silently
	// mis-applied. (Flat all-stat is not one of the design's kinds.)

	// --- Attack / Magic ATT ---
	{ kind: 'matt_pct', test: /\b(magic att(ack)?( power)?|matt)\b.*%/, percent: true },
	{ kind: 'matt', test: /\b(magic att(ack)?( power)?|matt)\b/, percent: false },
	{
		kind: 'att_pct',
		test: /\b(attack power|weapon att(ack)?( power)?|att)\b.*%/,
		percent: true
	},
	{ kind: 'att', test: /\b(attack power|weapon att(ack)?( power)?|att)\b/, percent: false },

	// --- Damage family ---
	{ kind: 'boss', test: /\bboss\b.*\bdamage\b|\bdamage\b.*\bboss\b/ },
	{ kind: 'ied', test: /\bignor(e|ed|ing)\b.*\bdef(ense|ence)?\b/ },
	{ kind: 'dmg', test: /^(total )?damage\b/ },

	// --- Crit ---
	{ kind: 'crit_rate', test: /\bcrit(ical)? ?rate\b/ },
	{ kind: 'crit_dmg', test: /\bcrit(ical)? ?damage\b/ },

	// --- HP ---
	{ kind: 'hp_pct', test: /\bmax ?hp\b.*%/, percent: true },
	{ kind: 'stat_flat', test: /\bmax ?hp\b/, percent: false, stat: 'hp' },

	// --- Plain stats ---
	{ kind: 'stat_pct', test: /^(str|dex|int|luk)\b.*%/, percent: true, stat: 'capture' },
	{ kind: 'stat_flat', test: /^(str|dex|int|luk)\b/, percent: false, stat: 'capture' }
];

/**
 * Parse one raw tooltip line.
 *
 * Tolerant of case, of `STR : +12%` vs `STR: +12%` vs `STR:+12%`, of the
 * "Ignore Enemy DEF" / "Ignored Enemy DEF" spelling split, and of GMS's
 * occasional full-width punctuation. Anything unrecognised — "Decent Sharp
 * Eyes", "Chance to ignore 20% damage when hit", set-effect noise — comes back
 * as `other` with `value: 0`, never dropped.
 */
export function parsePotentialLine(raw: string): PotentialLine {
	const text = normalize(raw);
	if (!text) return { kind: 'other', value: 0, raw };

	const hasPercent = text.includes('%');

	for (const rule of RULES) {
		if (rule.percent !== undefined && rule.percent !== hasPercent) continue;
		const match = rule.test.exec(text);
		if (!match) continue;

		// Take the number from the right of the label, so "Max HP : +12%" does
		// not pick up a digit inside the label itself.
		const colon = text.lastIndexOf(':');
		const numberSource = colon >= 0 ? text.slice(colon + 1) : text;
		const value = firstNumber(numberSource) ?? firstNumber(text);
		if (value === undefined) return { kind: 'other', value: 0, raw };

		let stat: StatKey | undefined;
		if (rule.stat === 'capture') stat = STAT_WORDS[match[1]];
		else if (rule.stat) stat = rule.stat;

		return stat ? { kind: rule.kind, stat, value, raw } : { kind: rule.kind, value, raw };
	}

	return { kind: 'other', value: 0, raw };
}

/** Parse a list of lines, preserving order and count. */
export function parsePotentialLines(raws: readonly string[]): PotentialLine[] {
	return raws.map(parsePotentialLine);
}
