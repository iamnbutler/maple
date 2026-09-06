import { describe, expect, it } from 'vitest';

import {
	BOSSES,
	BOSS_ORDER,
	CP_PARTY_SIZE_RATIOS,
	EXCLUDED,
	bossesByBoss,
	fivePercentHp,
	forceRequirement,
	getBoss,
	type Boss,
	type Difficulty
} from './bosses';

const DIFFICULTIES: Difficulty[] = [
	'easy',
	'normal',
	'hard',
	'chaos',
	'extreme',
	'destiny',
	'champion'
];

const boss = (id: string): Boss => {
	const b = getBoss(id);
	if (!b) throw new Error(`no boss entry ${id}`);
	return b;
};

/** HP totals run past Number.MAX_SAFE_INTEGER, so compare with a relative epsilon. */
const closeTo = (a: number, b: number) => Math.abs(a - b) <= Math.max(1, Math.abs(b) * 1e-12);

describe('bosses.json — structure', () => {
	it('has entries and unique ids', () => {
		expect(BOSSES.length).toBeGreaterThan(80);
		const ids = BOSSES.map((b) => b.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('ids are `${difficulty}-${boss}`', () => {
		for (const b of BOSSES) expect(b.id).toBe(`${b.difficulty}-${b.boss}`);
	});

	it('every entry validates', () => {
		for (const b of BOSSES) {
			expect(typeof b.boss, b.id).toBe('string');
			expect(b.boss, b.id).toMatch(/^[a-z0-9-]+$/);
			expect(b.bossName.length, b.id).toBeGreaterThan(0);
			expect(DIFFICULTIES, b.id).toContain(b.difficulty);
			expect(['arcane-river', 'grandis', 'legacy'], b.id).toContain(b.region);
			expect(Array.isArray(b.sources) && b.sources.length > 0, b.id).toBe(true);

			if (b.level !== undefined) expect(b.level, b.id).toBeGreaterThan(0);
			if (b.entryLevel !== undefined) expect(b.entryLevel, b.id).toBeGreaterThan(0);
			if (b.pdr !== undefined) expect(b.pdr, b.id).toBeGreaterThanOrEqual(0);
			if (b.timeLimitMin !== undefined) expect(b.timeLimitMin, b.id).toBeGreaterThan(0);
			if (b.deathCount !== undefined) expect(b.deathCount, b.id).toBeGreaterThan(0);
			if (b.partyMax !== undefined) expect(b.partyMax, b.id).toBeGreaterThanOrEqual(1);
			if (b.reset !== undefined) expect(['daily', 'weekly', 'monthly'], b.id).toContain(b.reset);
			if (b.hp) {
				expect(b.hp.total, b.id).toBeGreaterThan(0);
				if (b.hp.phases) {
					expect(b.hp.phases.length, b.id).toBeGreaterThan(1);
					for (const p of b.hp.phases) expect(p.hp, `${b.id}/${p.label}`).toBeGreaterThan(0);
				}
			}
		}
	});

	it('force is always tagged, and only non-`none` carries a requirement', () => {
		for (const b of BOSSES) {
			expect(['arcane', 'sacred', 'none'], b.id).toContain(b.force.type);
			if (b.force.type === 'none') {
				expect(b.force.required, b.id).toBeUndefined();
			} else {
				expect(b.force.required, b.id).toBeGreaterThan(0);
				expect(b.force.capAt, b.id).toBeGreaterThan(b.force.required as number);
			}
		}
	});

	it('crystal payouts are Heroic (5x the bosses.md §1.6 listed price) and 6 wide', () => {
		for (const b of BOSSES) {
			if (!b.crystal) continue;
			expect(b.crystal.heroicMultiplier, b.id).toBe(5);
			expect(b.crystal.byPartySize.length, b.id).toBe(6);
			expect(b.crystal.nonHeroic.byPartySize.length, b.id).toBe(6);
			expect(b.crystal.solo, b.id).toBe(b.crystal.nonHeroic.solo * 5);
			expect(b.crystal.byPartySize[0], b.id).toBe(b.crystal.solo);
			b.crystal.byPartySize.forEach((v, i) => {
				const listed = b.crystal!.nonHeroic.byPartySize[i];
				if (listed == null) expect(v, `${b.id}[${i}]`).toBeNull();
				else expect(v, `${b.id}[${i}]`).toBe(listed * 5);
			});
			// A party size beyond partyMax must have no payout, and vice versa.
			if (b.partyMax !== undefined) {
				for (let n = 1; n <= 6; n++) {
					const v = b.crystal.byPartySize[n - 1];
					if (n > b.partyMax) expect(v, `${b.id} @${n}`).toBeNull();
					else expect(v, `${b.id} @${n}`).not.toBeNull();
				}
			}
		}
	});

	it('CP gates are positive and per-member floors sit below the solo gate', () => {
		for (const b of BOSSES) {
			if (!b.cpGate) continue;
			if (b.cpGate.solo !== undefined) expect(b.cpGate.solo, b.id).toBeGreaterThan(0);
			for (const [size, floor] of Object.entries(b.cpGate.perMember ?? {})) {
				expect(Number(size), b.id).toBeGreaterThanOrEqual(2);
				expect(Number(size), b.id).toBeLessThanOrEqual(6);
				expect(floor, `${b.id} @${size}`).toBeGreaterThan(0);
				if (b.cpGate.solo !== undefined)
					expect(floor, `${b.id} @${size}`).toBeLessThan(b.cpGate.solo);
			}
		}
	});

	it('conflicts, where recorded, name a field and at least one alternative', () => {
		const withConflicts = BOSSES.filter((b) => b.conflicts?.length);
		expect(withConflicts.length).toBeGreaterThan(0);
		for (const b of withConflicts) {
			for (const c of b.conflicts!) {
				expect(c.field.length, b.id).toBeGreaterThan(0);
				expect(c.chosenSource.length, b.id).toBeGreaterThan(0);
				expect(c.alternatives.length, `${b.id}/${c.field}`).toBeGreaterThan(0);
				for (const alt of c.alternatives) expect(alt.source.length, b.id).toBeGreaterThan(0);
			}
		}
	});

	it('excludes the non-GMS bosses with a stated reason', () => {
		const names = EXCLUDED.map((e) => e.name);
		expect(names).toContain('Bellona');
		expect(names).toContain('Malitia');
		for (const e of EXCLUDED) expect(e.reason.length, e.name).toBeGreaterThan(10);
		// ...and they must not have leaked into the roster.
		for (const b of BOSSES) expect(['bellona', 'malitia']).not.toContain(b.boss);
	});

	it('covers the 2026 roster additions called out in bosses.md §1.1', () => {
		const ids = new Set(BOSSES.map((b) => b.id));
		for (const id of [
			'normal-omni-cln',
			'easy-first-adversary',
			'normal-first-adversary',
			'hard-first-adversary',
			'extreme-first-adversary',
			'normal-malefic-star',
			'hard-malefic-star',
			'normal-jupiter',
			'hard-jupiter',
			'extreme-lotus',
			'extreme-kalos',
			'extreme-kaling',
			'extreme-chosen-seren',
			'extreme-black-mage',
			'normal-guardian-angel-slime',
			'chaos-guardian-angel-slime',
			'easy-gollux',
			'normal-gollux',
			'hard-gollux',
			'normal-ursus',
			'normal-mori-ranmaru',
			'hard-mori-ranmaru',
			'normal-princess-no',
			'normal-akechi-mitsuhide'
		]) {
			expect(ids, id).toContain(id);
		}
	});
});

describe('bosses.json — HP', () => {
	// bosses.md §1.3 lists three families whose parts must NOT be summed: Horntail (the body
	// entry auto-dies and duplicates the Phase-3 subtotal), Pierre (three colour forms share
	// one HP bar) and Crimson Queen (four mood forms share one bar). Those entries therefore
	// store no `phases` at all, so there is nothing to sum — every entry that DOES carry
	// phases sums exactly to its total.
	it('phase HP sums to the stored total wherever phases exist', () => {
		const withPhases = BOSSES.filter((b) => b.hp?.phases);
		expect(withPhases.length).toBeGreaterThan(20);
		for (const b of withPhases) {
			const sum = b.hp!.phases!.reduce((acc, p) => acc + p.hp, 0);
			expect(closeTo(sum, b.hp!.total), `${b.id}: phases ${sum} vs total ${b.hp!.total}`).toBe(
				true
			);
		}
	});

	it('the §1.3 shared-HP-bar bosses store no phase split', () => {
		for (const id of [
			'easy-horntail',
			'normal-horntail',
			'chaos-horntail',
			'normal-pierre',
			'chaos-pierre',
			'normal-crimson-queen',
			'chaos-crimson-queen'
		]) {
			const b = boss(id);
			expect(b.hp?.phases, id).toBeUndefined();
			expect(b.notes, id).toMatch(/§1\.3/);
		}
	});

	it('§1.3 corrected totals are the corrected ones, not the naive sums', () => {
		expect(boss('easy-horntail').hp!.total).toBe(1.0176e9); // naive 1.835B
		expect(boss('normal-horntail').hp!.total).toBe(2.75e9); // naive 4.84B
		expect(boss('chaos-horntail').hp!.total).toBe(26.6e9); // naive 46.6B
		expect(boss('normal-pierre').hp!.total).toBe(315e6); // naive 945M
		expect(boss('chaos-pierre').hp!.total).toBe(80e9); // naive 240B
		expect(boss('normal-crimson-queen').hp!.total).toBe(315e6); // naive 1.26B
		expect(boss('chaos-crimson-queen').hp!.total).toBe(140e9); // naive 560B
	});

	it('Hard Kaling is the post-nerf 12.091Q, not the stale 17.775Q chart value', () => {
		const b = boss('hard-kaling');
		expect(b.hp!.total).toBe(12.091e15);
		const conflict = b.conflicts?.find((c) => c.field === 'hp.total');
		expect(conflict?.chosen).toBe(12.091e15);
		expect(conflict?.alternatives.map((a) => a.value)).toContain(17.775e15);
	});

	it('Hard Mori Ranmaru uses the GMS 2.1B, not the 84B used elsewhere', () => {
		const b = boss('hard-mori-ranmaru');
		expect(b.hp!.total).toBe(2.1e9);
		const conflict = b.conflicts?.find((c) => c.field === 'hp.total');
		expect(conflict?.alternatives.map((a) => a.value)).toContain(84e9);
	});

	it('Hard Jupiter records the masonym / wiki phase disagreement', () => {
		const b = boss('hard-jupiter');
		expect(b.hp!.total).toBe(49.4e15); // the value bosses.md §1.2 recommends
		const conflict = b.conflicts?.find((c) => c.field === 'hp.total');
		expect(conflict, 'hard-jupiter hp.total conflict').toBeDefined();
		expect(conflict!.alternatives.length).toBeGreaterThanOrEqual(2);
		// 19.76Q x2 + 9.88Q is masonym's split; reading 49.4Q as per-phase gives 148.2Q.
		expect(conflict!.alternatives.map((a) => a.value)).toContain(148.2e15);
	});
});

describe('bosses.md §2.2 — 5% carry threshold', () => {
	it('reproduces the published carry table', () => {
		// Five spot-checks straight out of the §2.2 table.
		expect(fivePercentHp(boss('chaos-zakum'))).toBe(8.4e9);
		expect(fivePercentHp(boss('hard-magnus'))).toBe(6e9);
		expect(fivePercentHp(boss('normal-lotus'))).toBe(78.75e9);
		expect(fivePercentHp(boss('normal-lucid'))).toBe(1.2e12);
		expect(fivePercentHp(boss('hard-lucid'))).toBe(5.88e12);
		expect(fivePercentHp(boss('hard-limbo'))).toBe(625e12);
	});

	it('is null for entries with no HP data', () => {
		expect(fivePercentHp(boss('destiny-lotus'))).toBeNull();
	});
});

describe('bosses.md §3 — Combat Power gates', () => {
	it('Hard Limbo: the 1.5B / 320M-at-3 worked example is recorded as a conflict', () => {
		const b = boss('hard-limbo');
		// bosses.md §3.3 says to prefer the §3.2 summary table, which reads 1,000,000,000.
		expect(b.cpGate?.solo).toBe(1_000_000_000);
		expect(b.cpGate?.perMember?.['2']).toBe(320_000_000);
		expect(b.cpGate?.perMember?.['3']).toBe(210_000_000);

		const soloConflict = b.conflicts?.find((c) => c.field === 'cpGate.solo');
		expect(soloConflict?.chosen).toBe(1_000_000_000);
		expect(soloConflict?.alternatives.map((a) => a.value)).toContain(1_500_000_000);

		// The Combat_Power page's worked example pairs 1.5B total with a 320M 3-person floor.
		const memberConflict = b.conflicts?.find((c) => c.field === 'cpGate.perMember.3');
		expect(memberConflict?.chosen).toBe(210_000_000);
		expect(memberConflict?.alternatives.map((a) => a.value)).toContain(320_000_000);
	});

	it('Hard Lucid carries the full published per-party-size ladder', () => {
		const cp = boss('hard-lucid').cpGate!;
		expect(cp.solo).toBe(18_000_000);
		expect(cp.perMember).toEqual({
			'2': 5_800_000,
			'3': 3_900_000,
			'4': 2_900_000,
			'5': 2_300_000,
			'6': 1_900_000
		});
		// §3.3: the 6-person floor is ~10.6% of the solo requirement.
		expect(cp.perMember!['6']! / cp.solo!).toBeCloseTo(CP_PARTY_SIZE_RATIOS[6], 2);
	});

	it('spot-checks the §3.2 solo table', () => {
		expect(boss('extreme-kaling').cpGate?.solo).toBe(5_500_000_000);
		expect(boss('hard-jupiter').cpGate?.solo).toBe(4_500_000_000);
		expect(boss('extreme-black-mage').cpGate?.solo).toBe(600_000_000);
		expect(boss('normal-omni-cln').cpGate?.solo).toBe(10_000);
		expect(boss('chaos-papulatus').cpGate?.solo).toBe(800_000);
	});

	it('records the §3.3 Will / Gloom 18M-vs-20M inconsistency', () => {
		for (const id of ['hard-will', 'chaos-gloom']) {
			const b = boss(id);
			expect(b.cpGate?.solo, id).toBe(20_000_000);
			const c = b.conflicts?.find((x) => x.field === 'cpGate.solo');
			expect(
				c?.alternatives.map((a) => a.value),
				id
			).toContain(18_000_000);
		}
	});
});

describe('bosses.md §4 — force requirements', () => {
	it('returns the requirement, or null when the boss has none', () => {
		expect(forceRequirement(boss('hard-lucid'))).toEqual({ type: 'arcane', required: 360 });
		expect(forceRequirement(boss('hard-jupiter'))).toEqual({ type: 'sacred', required: 810 });
		expect(forceRequirement(boss('chaos-zakum'))).toBeNull();
		expect(forceRequirement(boss('extreme-lotus'))).toBeNull();
	});

	it('matches the §4.5 reference table', () => {
		expect(boss('easy-will').force).toMatchObject({ type: 'arcane', required: 560, capAt: 840 });
		expect(boss('hard-will').force).toMatchObject({ type: 'arcane', required: 760, capAt: 1140 });
		expect(boss('hard-black-mage').force).toMatchObject({ required: 1320, capAt: 1980 });
		expect(boss('hard-verus-hilla').force).toMatchObject({ required: 900, capAt: 1350 });
		expect(boss('extreme-kaling').force).toMatchObject({
			type: 'sacred',
			required: 480,
			capAt: 530
		});
		expect(boss('hard-first-adversary').force).toMatchObject({ required: 340, capAt: 390 });
	});

	it('carries the §4.3 per-phase requirements', () => {
		expect(boss('normal-kalos').force.phase2Required).toBe(300);
		for (const id of ['normal-chosen-seren', 'hard-chosen-seren', 'extreme-chosen-seren']) {
			expect(boss(id).force.required, id).toBe(150);
			expect(boss(id).force.phase2Required, id).toBe(200);
		}
	});

	it('Arcane bosses land in arcane-river and Sacred bosses in grandis', () => {
		expect(boss('hard-lucid').region).toBe('arcane-river');
		expect(boss('hard-limbo').region).toBe('grandis');
		expect(boss('chaos-zakum').region).toBe('legacy');
	});
});

describe('bosses.md §5.5 — effective-HP mechanics are surfaced', () => {
	it.each([
		['chaos-gloom', /90% reduced damage/],
		['chaos-guardian-angel-slime', /15% damage reduction/],
		['hard-black-mage', /shield/i],
		['extreme-lotus', /shield/i],
		['hard-chosen-seren', /heals by the remaining shield/],
		['easy-first-adversary', /Order gauge/],
		['normal-malefic-star', /\+30% final damage/],
		['hard-lucid', /12\.8T within 40 seconds/]
	])('%s notes the mechanic', (id, pattern) => {
		expect(boss(id).notes ?? '', id).toMatch(pattern as RegExp);
	});
});

describe('loader helpers', () => {
	it('getBoss round-trips every id and rejects unknown ones', () => {
		for (const b of BOSSES) expect(getBoss(b.id)).toBe(b);
		expect(getBoss('nope-nope')).toBeUndefined();
	});

	it('bossesByBoss groups every entry exactly once', () => {
		const groups = bossesByBoss();
		expect([...groups.values()].reduce((n, g) => n + g.length, 0)).toBe(BOSSES.length);
		expect(groups.get('lucid')?.map((b) => b.difficulty)).toEqual([
			'easy',
			'normal',
			'hard',
			'destiny'
		]);
	});

	it('BOSS_ORDER is a permutation of the roster', () => {
		expect(BOSS_ORDER.length).toBe(BOSSES.length);
		expect(new Set(BOSS_ORDER).size).toBe(BOSSES.length);
		for (const id of BOSS_ORDER) expect(getBoss(id), id).toBeDefined();
	});

	it('BOSS_ORDER runs hardest -> easiest by CP gate', () => {
		const ranked = BOSS_ORDER.map((id) => boss(id)).filter((b) => b.cpGate?.solo != null);
		for (let i = 1; i < ranked.length; i++) {
			expect(ranked[i].cpGate!.solo!, `${ranked[i - 1].id} -> ${ranked[i].id}`).toBeLessThanOrEqual(
				ranked[i - 1].cpGate!.solo!
			);
		}
		expect(BOSS_ORDER[0]).toBe('extreme-kaling'); // 5.5B, the highest published gate
		// Entries with no published gate are appended, ordered by monster level.
		const unranked = BOSS_ORDER.map((id) => boss(id)).filter((b) => b.cpGate?.solo == null);
		expect(unranked.map((b) => b.id)).toEqual([
			'normal-akechi-mitsuhide',
			'hard-gollux',
			'easy-gollux',
			'normal-ursus',
			'easy-balrog'
		]);
	});
});
