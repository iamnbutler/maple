import { describe, expect, it } from 'vitest';

import * as potentialData from '$lib/data/potential';
import * as starforceData from '$lib/data/starforce';

import { toCalcInput } from './adapter';
import { generateCandidates, STAR_BREAKPOINTS, weakest } from './candidates';
import { resolveTarget } from './targets';
import { windArcherFixture } from './test-fixtures';

function generate(
	mutate: (character: ReturnType<typeof windArcherFixture>) => void = () => {},
	kinds?: Parameters<typeof generateCandidates>[3]
) {
	const character = windArcherFixture();
	mutate(character);
	const { input } = toCalcInput(character);
	return generateCandidates(character, input, resolveTarget('grandis'), kinds ?? {});
}

describe('weakest', () => {
	it('returns the least trustworthy input', () => {
		expect(weakest('exact', 'sourced')).toBe('sourced');
		expect(weakest('sourced', 'speculative', 'estimated')).toBe('speculative');
		expect(weakest('exact')).toBe('exact');
	});
});

describe('star force candidates', () => {
	it('offers +1 and every breakpoint within maxStars', () => {
		const { candidates } = generate(() => {}, { kinds: ['starforce'] });
		const cape = candidates.filter((c) => c.slot === 'cape');

		// The cape is at 17*; +1 is 18, and 18 is also a breakpoint, so no duplicate.
		expect(new Set(cape.map((c) => c.id)).size).toBe(cape.length);
		const targets = cape.map((c) => Number(c.id.split('-').pop()));
		expect(targets).toContain(18);
		expect(targets).toContain(30);
		expect(Math.max(...targets)).toBeLessThanOrEqual(starforceData.maxStars(200, false));
		for (const bp of STAR_BREAKPOINTS) {
			if (bp > 17 && bp <= starforceData.maxStars(200, false)) expect(targets).toContain(bp);
		}
	});

	it('prices with safeguard and reports expected booms', () => {
		const { candidates } = generate(() => {}, { kinds: ['starforce'] });
		const step = candidates.find((c) => c.id === 'starforce:cape:17-18')!;

		expect(step.cost.mesos).toBeGreaterThan(0);
		expect(step.cost.mesos).toBe(
			Math.round(starforceData.expectedCostToReach(200, 17, 18, { safeguard: true }))
		);
		expect(step.cost.note).toContain('booms');
		expect(step.notes!.join(' ')).toContain('Safeguard');
	});

	it('gives a star force delta in the % applied (base) channel', () => {
		const { candidates } = generate(() => {}, { kinds: ['starforce'] });
		const step = candidates.find((c) => c.id === 'starforce:hat:22-23')!;

		expect(step.delta.mainFlat).toBeUndefined(); // 23* grants ATT only, no stat
		expect(step.delta.att).toBeGreaterThan(0);
		expect(step.delta.mainFinal).toBeUndefined();

		const statStep = candidates.find((c) => c.id === 'starforce:cape:17-18')!;
		expect(statStep.delta.mainFlat).toBeGreaterThan(0);
		expect(statStep.delta.mainFlat).toBe(statStep.delta.subFlat);
	});

	it('marks weapon 26-30 speculative', () => {
		const { candidates } = generate(() => {}, { kinds: ['starforce'] });
		const to30 = candidates.find((c) => c.id === 'starforce:weapon:22-30')!;
		expect(to30.confidence).toBe('speculative');
		expect(to30.notes!.join(' ')).toContain('UNVERIFIED_WEAPON_26_30');
	});

	it('skips Superior gear and says why', () => {
		const { candidates, notes } = generate(
			(character) => {
				character.equipment.belt!.superior = true;
			},
			{ kinds: ['starforce'] }
		);

		expect(candidates.some((c) => c.slot === 'belt')).toBe(false);
		expect(notes.join(' ')).toContain('Superior');
		expect(notes.join(' ')).toContain('Chance Time');
	});

	it('skips items with no confirmed star force', () => {
		const { candidates } = generate(
			(character) => {
				delete character.equipment.cape!.starforce;
			},
			{ kinds: ['starforce'] }
		);
		expect(candidates.some((c) => c.slot === 'cape')).toBe(false);
	});
});

describe('flame candidates', () => {
	it('targets the next benchmark band and prices it in Powerful flames', () => {
		const { candidates } = generate(() => {}, { kinds: ['flame'] });
		const cape = candidates.find((c) => c.slot === 'cape')!;

		expect(cape.kind).toBe('flame');
		expect(cape.delta.mainFlat).toBeGreaterThan(0);
		expect(cape.cost.mesos! % 9_500_000).toBe(0);
		expect(cape.confidence).toBe('estimated');
	});

	it('refuses to score a weapon flame and says why', () => {
		const { candidates, notes } = generate(() => {}, { kinds: ['flame'] });
		expect(candidates.some((c) => c.slot === 'weapon')).toBe(false);
		expect(notes.join(' ')).toContain('percentage of base ATT');
	});
});

describe('potential candidates', () => {
	it('emits a rank-up and a useful-lines candidate per item', () => {
		const { candidates } = generate(() => {}, { kinds: ['potential'] });
		const bottom = candidates.filter((c) => c.slot === 'bottom');

		expect(bottom.map((c) => c.id).sort()).toEqual([
			'potential:bottom:rank-up',
			'potential:bottom:useful-lines'
		]);
		const rankUp = bottom.find((c) => c.id.endsWith('rank-up'))!;
		expect(rankUp.confidence).toBe('speculative');
		expect(rankUp.cost.mesos! % potentialData.HEROIC_CUBE_PRICES.bright).toBe(0);
	});

	it('has no rank-up for a legendary item', () => {
		const { candidates } = generate(() => {}, { kinds: ['potential'] });
		expect(candidates.some((c) => c.id === 'potential:hat:rank-up')).toBe(false);
		expect(candidates.some((c) => c.id === 'potential:hat:useful-lines')).toBe(true);
	});

	it('removes the current IED lines before adding the new ones', () => {
		const { candidates } = generate(() => {}, { kinds: ['potential'] });
		const weapon = candidates.find((c) => c.id === 'potential:weapon:useful-lines')!;

		expect(weapon.delta.iedRemove).toEqual([40]);
		expect(weapon.delta.iedAdd!.length).toBeGreaterThan(0);
	});

	it('skips bonus potential entirely in Heroic', () => {
		expect(potentialData.BONUS_POTENTIAL_AVAILABLE_IN_HEROIC).toBe(false);
		const { candidates, notes } = generate(
			(character) => {
				character.equipment.hat!.bonusPotential = {
					grade: 'unique',
					lines: ['DEX : +4%', 'DEX : +4%', 'DEX : +3%']
				};
			},
			{ kinds: ['bonus-potential'] }
		);
		expect(candidates).toEqual([]);
		expect(notes.join(' ')).toContain('BONUS_POTENTIAL_AVAILABLE_IN_HEROIC');
	});
});

describe('symbol candidates', () => {
	it('offers +1 and max per region, in the final stat channel', () => {
		const { candidates } = generate(() => {}, { kinds: ['symbol'] });
		const esfera = candidates.filter((c) => c.id.includes('esfera'));

		expect(esfera.map((c) => c.id).sort()).toEqual([
			'symbol:arcane:esfera:16-17',
			'symbol:arcane:esfera:16-20'
		]);
		for (const candidate of esfera) {
			// Symbols are "% not applied" stat (formulas.md §1.2).
			expect(candidate.delta.mainFinal).toBeGreaterThan(0);
			expect(candidate.delta.mainFlat).toBeUndefined();
			expect(candidate.delta.arcane).toBeGreaterThan(0);
			expect(candidate.cost.days).toBeGreaterThan(0);
			expect(candidate.confidence).toBe('sourced');
		}
	});

	it('offers nothing for a maxed region', () => {
		const { candidates } = generate(() => {}, { kinds: ['symbol'] });
		expect(candidates.some((c) => c.id.includes('vanishingJourney'))).toBe(false);
	});

	it('notes that a Grand Sacred symbol contributes no damage', () => {
		const { candidates, notes } = generate(
			(character) => {
				character.symbols!.sacred!.tallahart = 4;
			},
			{ kinds: ['symbol'] }
		);
		expect(candidates.some((c) => c.id.includes('tallahart'))).toBe(false);
		expect(notes.join(' ')).toContain('Grand Sacred');
	});
});

describe('hyper stat candidates', () => {
	it('offers +1 level in each damage-relevant hyper, costed in points', () => {
		const { candidates } = generate(() => {}, { kinds: ['hyper-stat'] });
		const ids = candidates.map((c) => c.id);

		expect(ids).toContain('hyper-stat:bossDamage:12-13');
		expect(ids).toContain('hyper-stat:ignoreDefense:9-10');
		expect(ids).toContain('hyper-stat:dex:10-11');
		// LUK is neither primary nor secondary for a Wind Archer.
		expect(ids.some((id) => id.startsWith('hyper-stat:luk'))).toBe(false);

		for (const candidate of candidates) {
			expect(candidate.cost.points).toBeGreaterThan(0);
			expect(candidate.cost.mesos).toBeUndefined();
		}
	});

	it('routes the hyper IED level through iedAdd, never by addition', () => {
		const { candidates } = generate(() => {}, { kinds: ['hyper-stat'] });
		const ied = candidates.find((c) => c.id.startsWith('hyper-stat:ignoreDefense'))!;
		expect(ied.delta.iedAdd).toHaveLength(1);
	});

	it('drops the Arcane Force hyper when the target has no arcane requirement', () => {
		const character = windArcherFixture();
		const { input } = toCalcInput(character);

		const grandis = generateCandidates(character, input, resolveTarget('grandis'), {
			kinds: ['hyper-stat']
		});
		expect(grandis.candidates.some((c) => c.id.includes('arcaneForce'))).toBe(false);

		const lucid = generateCandidates(character, input, resolveTarget('hard-lucid'), {
			kinds: ['hyper-stat']
		});
		expect(lucid.candidates.some((c) => c.id.includes('arcaneForce'))).toBe(true);
	});
});

describe('generateCandidates', () => {
	it('honours the kind filter', () => {
		const { candidates } = generate(() => {}, { kinds: ['symbol'] });
		expect(new Set(candidates.map((c) => c.kind))).toEqual(new Set(['symbol']));
	});

	it('produces a full board by default', () => {
		const { candidates } = generate();
		expect(new Set(candidates.map((c) => c.kind))).toEqual(
			new Set(['starforce', 'flame', 'potential', 'symbol', 'hyper-stat'])
		);
		expect(new Set(candidates.map((c) => c.id)).size).toBe(candidates.length);
	});
});
