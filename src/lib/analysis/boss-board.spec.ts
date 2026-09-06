import { describe, expect, it } from 'vitest';

import { damageIndex } from '../calc/damage';
import { BOSSES, BOSS_ORDER, getBoss } from '../data/bosses';
import { DUMMY_TARGET, anchorFrameFor, getAnchorDpm, getDpmFit } from '../data/dpm-anchors';
import type { CalcInput } from '../calc/types';
import type { Character } from '../schema/character';
import {
	ARCANE_BLOCK_RATIO_PERCENT,
	DEFAULT_CARRIED_UPTIME,
	DEFAULT_UPTIME,
	LEVEL_RELEVANCE_WINDOW,
	SACRED_BLOCK_DEFICIT,
	type BossBoardCharacter,
	type BossBoardOptions,
	bossTarget,
	bossTier,
	buildBossBoard,
	resolveAnchorCombatPower,
	verdictFor
} from './boss-board';

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                    */
/* -------------------------------------------------------------------------- */

function character(overrides: Partial<CalcInput> = {}): CalcInput {
	return {
		level: 285,
		classId: 'wind-archer',
		stats: {
			str: { base: 1500, percent: 130, flat: 300 },
			dex: { base: 15000, percent: 130, flat: 3000 },
			int: { base: 4, percent: 0, flat: 0 },
			luk: { base: 4, percent: 0, flat: 0 },
			hp: { base: 0, percent: 0, flat: 0 }
		},
		attack: { base: 1400, percent: 25, flat: 0 },
		magicAttack: { base: 0, percent: 0, flat: 0 },
		damagePercent: 60,
		bossDamagePercent: 300,
		finalDamagePercent: 40,
		ignoreDefensePercent: 92,
		criticalRatePercent: 100,
		criticalDamagePercent: 85,
		arcaneForce: 1450,
		sacredForce: 900,
		...overrides
	};
}

/** A synthetic anchor. Not a real 8.8 figure — see dpm-anchors.ts. */
const TEST_ANCHOR = 2.4e13;

/** Everything, unfiltered, so a spec can address any entry by id. */
const ALL: BossBoardOptions = { relevantOnly: false, includeEarlyBosses: true };

function board(input: CalcInput, char: BossBoardCharacter = {}, options: BossBoardOptions = ALL) {
	return buildBossBoard(input, { level: input.level, ...char }, options);
}

function row(
	input: CalcInput,
	bossId: string,
	char?: BossBoardCharacter,
	options?: BossBoardOptions
) {
	const found = board(input, char, options ?? ALL).rows.find((r) => r.bossId === bossId);
	if (!found) throw new Error(`no row for ${bossId}`);
	return found;
}

/** The ratio the model should produce, computed from the public helpers. */
function expectedRatio(input: CalcInput, bossId: string, requiredDamage: number, dpmScale = 1) {
	const boss = getBoss(bossId)!;
	const target = bossTarget(boss);
	const dpm =
		(TEST_ANCHOR * damageIndex(input, target)) / damageIndex(anchorFrameFor(input.classId), target);
	return (dpm * dpmScale * boss.timeLimitMin!) / requiredDamage;
}

/* -------------------------------------------------------------------------- */
/* Roster tiering                                                              */
/* -------------------------------------------------------------------------- */

describe('roster tiering', () => {
	it.each([
		['chaos-zakum', 'early'],
		['normal-zakum', 'trivial'],
		['easy-zakum', 'trivial'],
		['normal-lotus', 'current'],
		['hard-lotus', 'current'],
		['normal-cygnus', 'early'],
		['easy-cygnus', 'trivial'],
		['normal-ursus', 'trivial'],
		['normal-princess-no', 'trivial'],
		['hard-jupiter', 'current']
	])('%s is %s', (id, tier) => {
		expect(bossTier(getBoss(id)!)).toBe(tier);
	});

	it('classifies every entry exactly once and reports the counts', () => {
		const b = board(character());
		const total = b.tierCounts.trivial + b.tierCounts.early + b.tierCounts.current;
		expect(total).toBe(BOSSES.length);
		expect(b.tierCounts.trivial).toBeGreaterThan(0);
		expect(b.tierCounts.early).toBeGreaterThan(0);
	});

	it('never emits a trivial row, under any option', () => {
		for (const options of [
			{},
			{ relevantOnly: false },
			{ includeEarlyBosses: true },
			{ relevantOnly: false, includeEarlyBosses: true }
		] satisfies BossBoardOptions[]) {
			const b = buildBossBoard(character({ level: 200 }), { level: 200 }, options);
			expect(b.rows.every((r) => r.tier !== 'trivial')).toBe(true);
		}
	});

	it('hides early rows by default and shows them on request', () => {
		const input = character({ level: 200 });
		const hidden = buildBossBoard(input, { level: 200 }, { relevantOnly: false });
		expect(hidden.rows.some((r) => r.bossId === 'chaos-zakum')).toBe(false);

		const shown = buildBossBoard(
			input,
			{ level: 200 },
			{ relevantOnly: false, includeEarlyBosses: true }
		);
		expect(shown.rows.some((r) => r.bossId === 'chaos-zakum')).toBe(true);
	});
});

/* -------------------------------------------------------------------------- */
/* Uncalibrated behaviour — the shipped default                                */
/* -------------------------------------------------------------------------- */

describe('with no DPM anchor for the class', () => {
	const b = board(character());

	it('reports calibrated: false and says why', () => {
		expect(b.calibrated).toBe(false);
		expect(b.note).toMatch(/[Uu]ncalibrated/);
	});

	it('gives every unblocked axis an uncalibrated verdict with no ratio', () => {
		for (const r of b.rows) {
			for (const a of [r.solo, r.party, r.carried]) {
				expect(['uncalibrated', 'blocked']).toContain(a.verdict);
				expect(a.ratio).toBeUndefined();
				expect(a.clearMinutes).toBeUndefined();
			}
		}
	});

	it('still computes the deterministic half of the board', () => {
		const gloom = b.rows.find((r) => r.bossId === 'chaos-gloom')!;
		expect(gloom.carryDamageRequired).toBeGreaterThan(0);
		expect(gloom.gates.levelOk).toBe(true);
		expect(gloom.gates.forceType).toBe('arcane');
		expect(gloom.gates.forceRequired).toBe(730);
		expect(gloom.crystalMesos).toBeGreaterThan(0);
	});
});

/* -------------------------------------------------------------------------- */
/* The 5% carry rule (bosses.md §2.2)                                          */
/* -------------------------------------------------------------------------- */

describe('carry requirement = 5% of TOTAL HP', () => {
	// Spot-checks transcribed from the bosses.md §2.2 table. Kaling deliberately
	// uses the post-nerf 12.091Q, not the stale published 17.775Q.
	it.each([
		['chaos-zakum', 8.4e9],
		['hard-magnus', 6e9],
		['normal-lotus', 78.75e9],
		['hard-lotus', 1.664e12],
		['hard-lucid', 5.88e12],
		['hard-will', 6.3e12],
		['chaos-gloom', 6.35e12],
		['hard-verus-hilla', 8.925e12],
		['hard-darknell', 7.875e12],
		['hard-black-mage', 23.625e12],
		['normal-chosen-seren', 10.4e12],
		['hard-chosen-seren', 24.15e12],
		['easy-kalos', 17.85e12],
		['easy-kaling', 46.05e12],
		['hard-kaling', 604.6e12],
		['normal-limbo', 325.25e12],
		['hard-limbo', 625e12],
		['normal-baldrix', 452.8e12],
		['hard-baldrix', 1.017e15],
		['normal-jupiter', 513.3e12],
		['hard-jupiter', 2.47e15]
	])('%s needs ~%d damage', (id, expected) => {
		const r = row(character({ level: 300 }), id, { level: 300 });
		// The published table rounds to 3-4 significant figures.
		expect(r.carryDamageRequired! / expected).toBeCloseTo(1, 2);
		expect(r.carryDamageRequired).toBe(r.totalHp! * 0.05);
	});
});

/* -------------------------------------------------------------------------- */
/* Force gates at their exact breakpoints                                      */
/* -------------------------------------------------------------------------- */

describe('Arcane Power gate (bosses.md §4.1, design §9: block below 70% ratio)', () => {
	// Chaos Gloom requires 730 Arcane. ceil(730 * 0.70) = 511.
	const at = (arcaneForce: number) =>
		row(character({ level: 255, arcaneForce }), 'chaos-gloom', { level: 255 });

	it('passes at exactly 70% of the requirement', () => {
		expect(ARCANE_BLOCK_RATIO_PERCENT).toBe(70);
		const r = at(511);
		expect(r.gates.forceMultiplier).toBe(0.8);
		expect(r.carried.verdict).not.toBe('blocked');
	});

	it('blocks one point below 70%', () => {
		const r = at(510);
		expect(r.gates.forceMultiplier).toBe(0.7);
		expect(r.solo.verdict).toBe('blocked');
		expect(r.party.verdict).toBe('blocked');
		expect(r.carried.verdict).toBe('blocked');
		expect(r.carried.reason).toMatch(/Arcane Power 510\/730/);
	});

	it('records the banded multiplier at each published breakpoint', () => {
		expect(at(730).gates.forceMultiplier).toBe(1);
		expect(at(802).gates.forceMultiplier).toBe(1); // ceil(730 * 1.10) = 803
		expect(at(803).gates.forceMultiplier).toBe(1.1);
		expect(at(948).gates.forceMultiplier).toBe(1.1); // ceil(730 * 1.30) = 949
		expect(at(949).gates.forceMultiplier).toBe(1.3);
		expect(at(1095).gates.forceMultiplier).toBe(1.5);
	});
});

describe('Sacred Power gate (bosses.md §4.2, design §9: block below -20)', () => {
	// Normal Limbo requires 500 Sacred.
	const at = (sacredForce: number) =>
		row(character({ level: 285, sacredForce }), 'normal-limbo', { level: 285 });

	it('passes at exactly 20 short', () => {
		expect(SACRED_BLOCK_DEFICIT).toBe(-20);
		const r = at(480);
		expect(r.gates.forceMultiplier).toBe(0.8);
		expect(r.carried.verdict).not.toBe('blocked');
	});

	it('blocks at 21 short', () => {
		const r = at(479);
		expect(r.gates.forceMultiplier).toBe(0.79);
		expect(r.carried.verdict).toBe('blocked');
		expect(r.carried.reason).toMatch(/Sacred Power 479\/500, 21 short/);
	});

	it('records the linear multiplier above the requirement, capped at +25%', () => {
		expect(at(500).gates.forceMultiplier).toBe(1);
		expect(at(510).gates.forceMultiplier).toBe(1.05);
		expect(at(550).gates.forceMultiplier).toBe(1.25);
		expect(at(700).gates.forceMultiplier).toBe(1.25);
	});

	it('reports forceType none and a neutral multiplier for pre-Grandis bosses', () => {
		const r = row(character({ level: 285 }), 'hard-lotus', { level: 285 });
		expect(r.gates.forceType).toBe('none');
		expect(r.gates.forceMultiplier).toBe(1);
		expect(r.gates.forceRequired).toBeUndefined();
	});
});

/* -------------------------------------------------------------------------- */
/* Level gate                                                                  */
/* -------------------------------------------------------------------------- */

describe('entry level gate', () => {
	it('blocks every axis for an under-level character', () => {
		const r = row(character({ level: 219 }), 'hard-lucid', { level: 219 });
		expect(r.entryLevel).toBe(220);
		expect(r.gates.levelOk).toBe(false);
		expect(r.solo.verdict).toBe('blocked');
		expect(r.party.verdict).toBe('blocked');
		expect(r.carried.verdict).toBe('blocked');
		expect(r.solo.reason).toBe('Entry level 220; you are 219.');
	});

	it('opens at exactly the entry level', () => {
		const r = row(character({ level: 220 }), 'hard-lucid', { level: 220 });
		expect(r.gates.levelOk).toBe(true);
		expect(r.solo.verdict).not.toBe('blocked');
	});

	it('prefers the character document level over the calc input level', () => {
		const r = row(character({ level: 285 }), 'hard-lucid', { level: 219 });
		expect(r.gates.levelOk).toBe(false);
	});
});

/* -------------------------------------------------------------------------- */
/* Verdict bands                                                               */
/* -------------------------------------------------------------------------- */

describe('verdict bands (kms-tools.md §2.3, with the 120% realistic-minimum floor)', () => {
	it.each([
		[10, 'comfortable'],
		[2.0, 'comfortable'],
		[1.9999, 'possible'],
		[1.2, 'possible'],
		[1.1999, 'minimum'],
		// MapleScouter prints 1.10 for "가능"; its own guidance says 120-130% is
		// the realistic minimum, so 1.10 lands in `minimum` here, not `possible`.
		[1.1, 'minimum'],
		[0.9, 'minimum'],
		[0.8999, 'out-of-reach'],
		[0, 'out-of-reach']
	])('ratio %s -> %s', (ratio, verdict) => {
		expect(verdictFor(ratio)).toBe(verdict);
	});

	it('bands every calibrated axis consistently with verdictFor', () => {
		const b = board(character(), {}, { ...ALL, anchorDpm: TEST_ANCHOR });
		let checked = 0;
		for (const r of b.rows) {
			for (const a of [r.solo, r.party, r.carried]) {
				if (a.ratio == null) continue;
				expect(a.verdict).toBe(verdictFor(a.ratio));
				checked++;
			}
		}
		expect(checked).toBeGreaterThan(50);
	});
});

/* -------------------------------------------------------------------------- */
/* The DPM model                                                               */
/* -------------------------------------------------------------------------- */

describe('clear-time model', () => {
	const input = character();
	const opts = { ...ALL, anchorDpm: TEST_ANCHOR };

	it('scales the anchor DPM by damageIndex(you, boss) / damageIndex(frame, boss)', () => {
		const boss = getBoss('normal-chosen-seren')!;
		const r = row(input, 'normal-chosen-seren', {}, opts);
		expect(r.solo.ratio).toBeCloseTo(
			expectedRatio(input, 'normal-chosen-seren', boss.hp!.total),
			8
		);
		// ratio = timeLimit / clearMinutes, by construction.
		expect(r.solo.clearMinutes!).toBeCloseTo(boss.timeLimitMin! / r.solo.ratio!, 6);
	});

	it('accepts a Sourced anchor and reports it in the board note', () => {
		const b = buildBossBoard(
			input,
			{ level: 285 },
			{ ...opts, anchorDpm: { value: TEST_ANCHOR, confidence: 'estimated', note: 'synthetic' } }
		);
		expect(b.calibrated).toBe(true);
		expect(b.note).toMatch(/estimated/);
	});

	it('divides the bar by the party size, defaulting to min(partyMax, 3)', () => {
		const r = row(input, 'hard-lucid', {}, opts);
		expect(getBoss('hard-lucid')!.partyMax).toBe(6);
		expect(r.party.ratio!).toBeCloseTo(r.solo.ratio! * 3, 6);
		expect(r.party.reason).toBe('Your share at 3 players.');

		const six = row(input, 'hard-lucid', {}, { ...opts, partySize: 6 });
		expect(six.party.ratio!).toBeCloseTo(six.solo.ratio! * 6, 6);
	});

	it('never exceeds the boss’s own party cap', () => {
		// Extreme Lotus is a 2-player fight, so the default 3 clamps to 2.
		const r = row(input, 'extreme-lotus', {}, opts);
		expect(getBoss('extreme-lotus')!.partyMax).toBe(2);
		expect(r.party.ratio!).toBeCloseTo(r.solo.ratio! * 2, 6);
	});

	it('makes the carry axis exactly 20x the solo axis (5% of the bar)', () => {
		const r = row(input, 'hard-lucid', {}, opts);
		expect(r.carried.ratio!).toBeCloseTo(r.solo.ratio! * 20, 6);
		expect(r.carried.clearMinutes!).toBeCloseTo(r.solo.clearMinutes! / 20, 6);
	});

	it('scales linearly with the uptime factor', () => {
		const full = row(input, 'hard-lucid', {}, opts);
		const half = row(input, 'hard-lucid', {}, { ...opts, uptimeFactor: 0.5 });
		expect(half.solo.ratio!).toBeCloseTo(full.solo.ratio! * 0.5, 8);
	});
});

/* -------------------------------------------------------------------------- */
/* Effective-HP corrections (bosses.md §5.5)                                   */
/* -------------------------------------------------------------------------- */

describe('effective-HP corrections', () => {
	const input = character();
	const opts = { ...ALL, anchorDpm: TEST_ANCHOR };

	it('applies Chaos GAS’s permanent 15% damage reduction and says so', () => {
		const boss = getBoss('chaos-guardian-angel-slime')!;
		const r = row(input, 'chaos-guardian-angel-slime', {}, opts);
		expect(r.solo.ratio).toBeCloseTo(
			expectedRatio(input, 'chaos-guardian-angel-slime', boss.hp!.total, 0.85),
			8
		);
		expect(r.notes!.join(' ')).toMatch(/APPLIED: permanent 15% damage reduction/);
		expect(r.notes!.join(' ')).toMatch(/1% HP every 30 s/);
	});

	it('applies Malefic Star’s near-permanent +30% final damage', () => {
		const boss = getBoss('hard-malefic-star')!;
		const r = row(input, 'hard-malefic-star', {}, opts);
		expect(r.solo.ratio).toBeCloseTo(
			expectedRatio(input, 'hard-malefic-star', boss.hp!.total, 1.3),
			8
		);
		expect(r.notes!.join(' ')).toMatch(/APPLIED: \+30% final damage/);
	});

	it('records Chaos Gloom’s eye WITHOUT baking it into the ratio', () => {
		const boss = getBoss('chaos-gloom')!;
		const r = row(input, 'chaos-gloom', {}, opts);
		expect(r.solo.ratio).toBeCloseTo(expectedRatio(input, 'chaos-gloom', boss.hp!.total), 8);
		expect(r.notes!.join(' ')).toMatch(/90% reduced damage while its eye is closed/);
		expect(r.notes!.join(' ')).toMatch(/NOT applied/);
	});

	it.each([
		['hard-chosen-seren', /heals by the remaining shield/i],
		['extreme-lotus', /\+20% gimmick final damage/],
		['hard-black-mage', /\+750B per shield/],
		['extreme-black-mage', /150% is unreachable/],
		['normal-first-adversary', /Order gauge/]
	])('surfaces the %s caveat as a note', (id, pattern) => {
		const r = row(character({ level: 300, sacredForce: 900 }), id, { level: 300 }, opts);
		expect(r.notes!.join(' ')).toMatch(pattern);
	});

	it('checks Hard Lucid’s phase 3 DPS gate when calibrated', () => {
		const r = row(input, 'hard-lucid', {}, opts);
		expect(r.notes!.join(' ')).toMatch(/Phase 3 check: .* against the required 12\.80T/);
	});
});

describe('First Adversary’s +20% Order-gauge bonus', () => {
	it('is recorded but not applied, so the ratio stays conservative', () => {
		const input = character({ level: 300 });
		const boss = getBoss('normal-first-adversary')!;
		const r = row(
			input,
			'normal-first-adversary',
			{ level: 300 },
			{
				...ALL,
				anchorDpm: TEST_ANCHOR
			}
		);
		expect(r.solo.ratio).toBeCloseTo(
			expectedRatio(input, 'normal-first-adversary', boss.hp!.total),
			8
		);
	});
});

/* -------------------------------------------------------------------------- */
/* Maxed Sacred Symbol regional bonus                                          */
/* -------------------------------------------------------------------------- */

describe('maxed Sacred Symbol +20% regional boss bonus (bosses.md §5.5)', () => {
	const input = character({ level: 300 });
	const opts = { ...ALL, anchorDpm: TEST_ANCHOR };

	it('applies at symbol level 11 and not before', () => {
		const boss = getBoss('normal-chosen-seren')!;
		const bare = row(input, 'normal-chosen-seren', { level: 300 }, opts);
		const ten = row(
			input,
			'normal-chosen-seren',
			{ level: 300, symbols: { sacred: { cernium: 10 } } },
			opts
		);
		const maxed = row(
			input,
			'normal-chosen-seren',
			{ level: 300, symbols: { sacred: { cernium: 11 } } },
			opts
		);
		expect(ten.solo.ratio).toBeCloseTo(bare.solo.ratio!, 8);
		expect(maxed.solo.ratio).toBeCloseTo(
			expectedRatio(input, 'normal-chosen-seren', boss.hp!.total, 1.2),
			8
		);
		expect(maxed.notes!.join(' ')).toMatch(/maxed Sacred Symbol/);
	});

	it('only matches the boss’s own region', () => {
		const symbols = { sacred: { cernium: 11 } };
		const kalos = row(input, 'chaos-kalos', { level: 300, symbols }, opts);
		expect(kalos.notes?.join(' ') ?? '').not.toMatch(/maxed Sacred Symbol/);
	});

	it.each([
		['chaos-kalos', { sacred: { hotelArcus: 11 } }],
		['chaos-kalos', { sacred: { arcus: 11 } }],
		['hard-kaling', { sacred: { shangrila: 11 } }],
		['hard-first-adversary', { sacred: { odium: 11 } }],
		['hard-malefic-star', { sacred: { arteria: 11 } }],
		['hard-limbo', { sacred: { carcion: 11 } }],
		['hard-baldrix', { grandis: { tallahart: 11 } }],
		['hard-jupiter', { grandis: { geardock: 11 } }]
	])('matches %s from its region symbol', (id, symbols) => {
		const r = row(input, id, { level: 300, symbols }, opts);
		expect(r.notes!.join(' ')).toMatch(/maxed Sacred Symbol/);
	});
});

/* -------------------------------------------------------------------------- */
/* Combat Power — advisory only                                                */
/* -------------------------------------------------------------------------- */

describe('Combat Power gate (bosses.md §3.1 — advisory, never blocking)', () => {
	it('never turns a verdict into blocked, however low the CP', () => {
		const b = board(character(), {}, { ...ALL, anchorDpm: TEST_ANCHOR, combatPower: 1 });
		const blockedRows = b.rows.filter((r) => r.solo.verdict === 'blocked');
		for (const r of blockedRows) {
			// Any block must be explained by level or force, never by CP.
			expect(r.solo.reason).toMatch(/Entry level|Arcane Power|Sacred Power/);
		}
		const gas = b.rows.find((r) => r.bossId === 'chaos-guardian-angel-slime')!;
		expect(gas.gates.combatPowerOk).toBe(false);
		expect(gas.solo.verdict).not.toBe('blocked');
		expect(gas.notes!.join(' ')).toMatch(/Advisory/);
	});

	it('is undefined when no Combat Power was supplied', () => {
		const r = row(character(), 'hard-lucid');
		expect(r.gates.combatPowerOk).toBeUndefined();
	});

	it('passes when the CP clears the loosest published floor', () => {
		const r = row(character(), 'hard-lucid', {}, { ...ALL, combatPower: 50_000_000 });
		expect(r.gates.combatPowerOk).toBe(true);
	});
});

/* -------------------------------------------------------------------------- */
/* Call-site compatibility                                                     */
/* -------------------------------------------------------------------------- */

describe('argument-order shim', () => {
	// analyze.ts declares BossBoardBuilder as (character, input, target) and
	// imports this module dynamically, so TypeScript cannot catch the mismatch.
	it('produces the same board when called (character, input, target)', () => {
		const input = character();
		const char = { level: 285, classId: 'wind-archer' };
		const canonical = buildBossBoard(input, char);
		const swapped = (buildBossBoard as unknown as (...args: unknown[]) => typeof canonical)(
			char,
			input,
			{ id: 'grandis', label: 'Grandis', kind: 'preset', pdr: 3.8, level: 285 }
		);
		expect(swapped.rows.map((r) => r.bossId)).toEqual(canonical.rows.map((r) => r.bossId));
		expect(swapped.calibrated).toBe(canonical.calibrated);
	});

	it('accepts a full Character document structurally', () => {
		const doc: Character = {
			id: 'nate-wa',
			name: 'Nate',
			world: 'Kronos',
			classId: 'wind-archer',
			level: 275,
			equipment: {},
			symbols: { sacred: { cernium: 11 } },
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-01-01T00:00:00.000Z'
		};
		const b = buildBossBoard(character({ level: 275 }), doc, { anchorDpm: TEST_ANCHOR });
		expect(b.rows.length).toBeGreaterThan(0);
	});
});

/* -------------------------------------------------------------------------- */
/* Relevance filter and ordering                                               */
/* -------------------------------------------------------------------------- */

describe('a realistic level-275 Wind Archer', () => {
	const input = character({ level: 275, arcaneForce: 1320, sacredForce: 300 });
	const char: BossBoardCharacter = { level: 275, classId: 'wind-archer' };
	const b = buildBossBoard(input, char, { anchorDpm: TEST_ANCHOR });
	const ids = b.rows.map((r) => r.bossId);

	it('orders rows hardest-first, following BOSS_ORDER', () => {
		const positions = ids.map((id) => BOSS_ORDER.indexOf(id));
		expect(positions).toEqual([...positions].sort((x, y) => x - y));
		expect(positions[0]).toBeGreaterThanOrEqual(0);
	});

	it('leads with the fights it cannot do yet and trails with the ones it can', () => {
		const gloom = ids.indexOf('chaos-gloom');
		const chaosKalos = ids.indexOf('chaos-kalos');
		const hardLucid = ids.indexOf('hard-lucid');
		expect(chaosKalos).toBeGreaterThanOrEqual(0);
		expect(chaosKalos).toBeLessThan(gloom);
		expect(gloom).toBeLessThan(hardLucid);

		// 300 Sacred is 30 short of Chaos Kalos's 330 — a hard block.
		expect(b.rows[chaosKalos].carried.verdict).toBe('blocked');
		// Arcane is capped, so the Arcane River tier is comfortably soloable.
		expect(b.rows[hardLucid].solo.verdict).toBe('comfortable');
	});

	it('drops bosses whose entry level is far above the character', () => {
		expect(LEVEL_RELEVANCE_WINDOW).toBe(10);
		// Baldrix 290 and Jupiter 295 are out of the window; Limbo 285 is not.
		expect(ids).not.toContain('hard-baldrix');
		expect(ids).not.toContain('hard-jupiter');
		expect(ids).toContain('hard-limbo');
	});

	it('drops fights it has outgrown (solo ratio > 10)', () => {
		expect(ids).not.toContain('easy-lucid');
		expect(ids).not.toContain('normal-lotus');
		const unfiltered = buildBossBoard(input, char, {
			anchorDpm: TEST_ANCHOR,
			relevantOnly: false
		});
		const easyLucid = unfiltered.rows.find((r) => r.bossId === 'easy-lucid')!;
		expect(easyLucid.solo.ratio).toBeGreaterThan(10);
	});

	it('drops entries with no HP data (the Destiny / Champion stubs)', () => {
		expect(ids.some((id) => id.startsWith('destiny-') || id.startsWith('champion-'))).toBe(false);
	});

	it('shows no trivial or early rows', () => {
		expect(b.rows.every((r) => r.tier === 'current')).toBe(true);
	});

	it('keeps the board a readable length', () => {
		expect(b.rows.length).toBeGreaterThan(10);
		expect(b.rows.length).toBeLessThan(40);
	});
});

/* -------------------------------------------------------------------------- */
/* The fitted KMS 연무장 anchor (dpm-anchors.md §3, §4)                         */
/* -------------------------------------------------------------------------- */

describe('the fitted per-class DPM anchor', () => {
	/** In the middle of Wind Archer's fitted CP band (305M-914M). */
	const CP = 500_000_000;
	const withCp = (combatPower = CP): BossBoardCharacter => ({
		level: 283,
		classId: 'wind-archer',
		statWindow: { displayed: { combatPower } }
	});
	const lv283 = character({ level: 283 });

	it('calibrates a class the dataset covers, and refuses one it does not', () => {
		const wa = buildBossBoard(lv283, withCp(), ALL);
		expect(wa.calibrated).toBe(true);
		expect(wa.note).toMatch(/연무장/);
		expect(wa.note).toMatch(/2026-08/);

		// Kanna is a real class with no 연무장 records — it must stay uncalibrated
		// rather than borrow another class's curve.
		expect(getDpmFit('kanna')).toBeNull();
		const kanna = buildBossBoard(
			character({ level: 283, classId: 'kanna' }),
			{ ...withCp(), classId: 'kanna' },
			ALL
		);
		expect(kanna.calibrated).toBe(false);
		expect(kanna.note).toMatch(/[Uu]ncalibrated/);
		expect(kanna.note).toMatch(/no records for "kanna"/);
		for (const r of kanna.rows) {
			expect(['uncalibrated', 'blocked']).toContain(r.solo.verdict);
			expect(r.solo.ratio).toBeUndefined();
		}
	});

	it('stays uncalibrated when no Combat Power is available, and says which is missing', () => {
		const b = buildBossBoard(lv283, { level: 283, classId: 'wind-archer' }, ALL);
		expect(b.calibrated).toBe(false);
		expect(b.note).toMatch(/[Uu]ncalibrated/);
		expect(b.note).toMatch(/Combat Power/);
		const r = b.rows.find((x) => x.bossId === 'hard-lucid')!;
		expect(r.solo.reason).toMatch(/curve in Combat Power/);
	});

	it('transfers the dummy DPM by damageIndex(you, boss) / damageIndex(you, dummy)', () => {
		const boss = getBoss('hard-lucid')!;
		const target = bossTarget(boss);
		const anchor = getAnchorDpm('wind-archer', CP)!;
		const expected = (anchor.value * damageIndex(lv283, target)) / damageIndex(lv283, DUMMY_TARGET);

		const r = row(lv283, 'hard-lucid', withCp(), ALL);
		// clearMinutes = HP / (transferred DPM * uptime).
		expect(r.solo.clearMinutes!).toBeCloseTo(boss.hp!.total / (expected * DEFAULT_UPTIME), 6);
	});

	it('never multiplies the force coefficient in twice', () => {
		// damageIndex already applies it through `bossTarget`, and the dummy has
		// no force requirement, so the ratio carries the whole deficit exactly
		// once. Halving the DPM by hand from the reported gate multiplier would
		// double-count; check the two disagree the way they should.
		// Normal Limbo needs 500 Sacred and level 285; 480 is exactly the 20-short
		// boundary the gate still lets through.
		const at = (sacredForce: number) =>
			row(character({ level: 290, sacredForce }), 'normal-limbo', { ...withCp(), level: 290 }, ALL);
		const shortRow = at(480);
		const fullRow = at(500);
		expect(shortRow.gates.forceMultiplier).toBe(0.8);
		expect(fullRow.gates.forceMultiplier).toBe(1);
		// DPM ratio is exactly the force ratio — applied once, not squared.
		expect(shortRow.solo.ratio! / fullRow.solo.ratio!).toBeCloseTo(0.8, 10);
	});

	it('produces sane clear times for a level-283 character on real bosses', () => {
		const b = buildBossBoard(lv283, withCp(), ALL);
		for (const id of ['hard-lucid', 'chaos-gloom', 'hard-chosen-seren', 'chaos-kalos']) {
			const r = b.rows.find((x) => x.bossId === id)!;
			expect(r.solo.clearMinutes, id).toBeGreaterThan(0.05); // not milliseconds
			expect(r.solo.clearMinutes, id).toBeLessThan(60 * 24); // not centuries
		}
		// Ordering sanity: the harder fight takes longer than the easier one.
		const lucid = b.rows.find((x) => x.bossId === 'hard-lucid')!;
		const seren = b.rows.find((x) => x.bossId === 'hard-chosen-seren')!;
		const kalos = b.rows.find((x) => x.bossId === 'chaos-kalos')!;
		expect(seren.solo.clearMinutes!).toBeGreaterThan(lucid.solo.clearMinutes!);
		expect(kalos.solo.clearMinutes!).toBeGreaterThan(seren.solo.clearMinutes!);
	});
});

/* -------------------------------------------------------------------------- */
/* Which Combat Power the anchor is evaluated at                               */
/* -------------------------------------------------------------------------- */

describe('Combat Power source for the DPM anchor', () => {
	const lv283 = character({ level: 283 });
	const displayedCp = 500_000_000;
	const computedCp = 120_000_000;

	it('prefers the displayed Combat Power over the computed one', () => {
		const char: BossBoardCharacter = {
			level: 283,
			classId: 'wind-archer',
			statWindow: { displayed: { combatPower: displayedCp } }
		};
		expect(resolveAnchorCombatPower(char, { combatPower: computedCp })).toEqual({
			value: displayedCp,
			source: 'displayed'
		});

		const b = buildBossBoard(lv283, char, { ...ALL, combatPower: computedCp });
		expect(b.note).toMatch(/as displayed in-game/);
		expect(b.note).toContain(displayedCp.toLocaleString('en-US'));
	});

	it('falls back to the computed Combat Power, degraded and labelled', () => {
		const char: BossBoardCharacter = { level: 283, classId: 'wind-archer' };
		expect(resolveAnchorCombatPower(char, { combatPower: computedCp })).toEqual({
			value: computedCp,
			source: 'computed'
		});

		const b = buildBossBoard(lv283, char, { ...ALL, combatPower: computedCp });
		expect(b.calibrated).toBe(true);
		expect(b.note).toMatch(/computed by this tool \(approximate/);
		// The whole point of preferring displayed: the two disagree by a lot, and
		// CP is raised to ~1.14, so the computed board is materially weaker.
		const displayedBoard = buildBossBoard(
			lv283,
			{ ...char, statWindow: { displayed: { combatPower: displayedCp } } },
			{ ...ALL, combatPower: computedCp }
		);
		const cheap = b.rows.find((r) => r.bossId === 'hard-lucid')!;
		const rich = displayedBoard.rows.find((r) => r.bossId === 'hard-lucid')!;
		expect(cheap.solo.ratio!).toBeLessThan(rich.solo.ratio!);
	});

	it('takes an explicit displayedCombatPower option when the document has none', () => {
		const b = buildBossBoard(
			lv283,
			{ level: 283, classId: 'wind-archer' },
			{ ...ALL, displayedCombatPower: displayedCp }
		);
		expect(b.calibrated).toBe(true);
		expect(b.note).toMatch(/as displayed in-game/);
	});

	it('ignores a non-positive or non-finite Combat Power', () => {
		for (const bad of [0, -1, Number.NaN]) {
			expect(
				resolveAnchorCombatPower(
					{ statWindow: { displayed: { combatPower: bad } } },
					{ combatPower: bad }
				)
			).toBeNull();
		}
	});
});

/* -------------------------------------------------------------------------- */
/* Uptime — the honest fudge factor (dpm-anchors.md §7.3)                      */
/* -------------------------------------------------------------------------- */

describe('uptime', () => {
	const lv283 = character({ level: 283 });
	const char: BossBoardCharacter = {
		level: 283,
		classId: 'wind-archer',
		statWindow: { displayed: { combatPower: 500_000_000 } }
	};

	it('defaults to 65% on solo/party and 90% on the carried axis', () => {
		expect(DEFAULT_UPTIME).toBe(0.65);
		expect(DEFAULT_CARRIED_UPTIME).toBe(0.9);
		const r = row(lv283, 'hard-lucid', char, ALL);
		// Carried is 5% of the bar, so it is 20x the solo axis at equal uptime —
		// and 20 * (0.9 / 0.65) once the carried axis gets its own.
		expect(r.carried.ratio!).toBeCloseTo(
			r.solo.ratio! * 20 * (DEFAULT_CARRIED_UPTIME / DEFAULT_UPTIME),
			6
		);
		expect(r.party.ratio!).toBeCloseTo(r.solo.ratio! * 3, 6);
	});

	it('never hides the number it used', () => {
		const b = buildBossBoard(lv283, char, ALL);
		expect(b.note).toMatch(/uptime 65% solo and party, 90% carried/i);
		const r = b.rows.find((x) => x.bossId === 'hard-lucid')!;
		expect(r.carried.reason).toMatch(/90% uptime/);

		const tuned = buildBossBoard(lv283, char, { ...ALL, uptimeFactor: 0.4 });
		expect(tuned.note).toMatch(/uptime 40%/i);
	});

	it('is overridable, together or separately', () => {
		const base = row(lv283, 'hard-lucid', char, ALL);

		// One override moves both axes, so the 20x carry relation is restored.
		const both = row(lv283, 'hard-lucid', char, { ...ALL, uptimeFactor: 0.5 });
		expect(both.solo.ratio!).toBeCloseTo((base.solo.ratio! * 0.5) / DEFAULT_UPTIME, 8);
		expect(both.carried.ratio!).toBeCloseTo(both.solo.ratio! * 20, 6);
		expect(both.carried.reason).toBeUndefined();

		const split = row(lv283, 'hard-lucid', char, {
			...ALL,
			uptimeFactor: 0.5,
			carriedUptimeFactor: 1
		});
		expect(split.carried.ratio!).toBeCloseTo(split.solo.ratio! * 20 * 2, 6);
	});

	it('leaves a caller-supplied anchor DPM at face value (uptime 1.0)', () => {
		// The legacy self-measurement path: the caller already measured the DPM
		// they want used, so it must not be silently haircut.
		const r = row(character(), 'hard-lucid', {}, { ...ALL, anchorDpm: TEST_ANCHOR });
		const boss = getBoss('hard-lucid')!;
		expect(r.solo.ratio).toBeCloseTo(expectedRatio(character(), 'hard-lucid', boss.hp!.total), 8);
	});
});

/* -------------------------------------------------------------------------- */
/* The deterministic half is untouched by calibration                          */
/* -------------------------------------------------------------------------- */

describe('calibration does not disturb the hard gates', () => {
	const lv283 = character({ level: 283, sacredForce: 400 });
	const char: BossBoardCharacter = {
		level: 283,
		classId: 'wind-archer',
		statWindow: { displayed: { combatPower: 500_000_000 } }
	};

	it('reports identical gates, carry numbers and crystal values with and without an anchor', () => {
		const withAnchor = buildBossBoard(lv283, char, ALL);
		const without = buildBossBoard(lv283, { ...char, statWindow: undefined }, ALL);
		expect(withAnchor.rows.length).toBe(without.rows.length);
		for (let i = 0; i < withAnchor.rows.length; i++) {
			const a = withAnchor.rows[i];
			const b = without.rows[i];
			expect(a.bossId).toBe(b.bossId);
			expect(a.gates).toEqual(b.gates);
			expect(a.carryDamageRequired).toBe(b.carryDamageRequired);
			expect(a.entryLevel).toBe(b.entryLevel);
			expect(a.crystalMesos).toBe(b.crystalMesos);
		}
	});

	it('still blocks on level and force ahead of any DPM verdict', () => {
		const underLevel = row(character({ level: 219 }), 'hard-lucid', { ...char, level: 219 }, ALL);
		expect(underLevel.solo.verdict).toBe('blocked');
		expect(underLevel.solo.reason).toBe('Entry level 220; you are 219.');

		const forceShort = row(character({ level: 283, sacredForce: 200 }), 'chaos-kalos', char, ALL);
		expect(forceShort.carried.verdict).toBe('blocked');
		expect(forceShort.carried.reason).toMatch(/Sacred Power 200\/330/);
	});
});
