import { describe, expect, it } from 'vitest';

import * as potentialData from '$lib/data/potential';
import * as starforceData from '$lib/data/starforce';

import { getClass, listClasses } from '$lib/data/classes';
import * as gearProgression from '$lib/data/gear-progression';
import { CATALOGUE, CATALOGUE_META, capabilities, findByName } from '$lib/data/items';
import type { Item } from '$lib/schema';

import { toCalcInput } from './adapter';
import { generateCandidates, STAR_BREAKPOINTS, weakest } from './candidates';
import { summarizeGear } from './gear';
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
		// Breakpoints are offered up to the PLAN, not the mechanical cap. The
		// fixture's cape sits on a ladder stage that stops at 22 on event, so 23,
		// 25 and 30 are correctly absent. Stars 23+ grant no class STAT, though ATT
		// does keep climbing there — the cap is a cost judgment, not a claim that
		// the band is worthless.
		const plan = gearProgression.starTargetVerdict(windArcherFixture().equipment.cape!.name, 30);
		const ceiling = plan.known ? (plan.onEvent ?? plan.prescribed ?? 30) : 30;
		expect(Math.max(...targets)).toBeLessThanOrEqual(ceiling);
		expect(Math.max(...targets)).toBeLessThanOrEqual(starforceData.maxStars(200, false));
		for (const bp of STAR_BREAKPOINTS) {
			if (bp > 17 && bp <= Math.min(ceiling, starforceData.maxStars(200, false))) {
				expect(targets).toContain(bp);
			}
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
		// The 23★+ band (attack only, no stat) is deliberately unreachable from
		// here: every item is capped at 22, laddered or not. That band's behaviour
		// is covered where it belongs, in starforce.spec.ts.
		expect(candidates.some((c) => Number(c.id.split('-').pop()) > 22)).toBe(false);

		const statStep = candidates.find((c) => c.id === 'starforce:cape:17-18')!;
		expect(statStep.delta.mainFlat).toBeGreaterThan(0);
		expect(statStep.delta.mainFlat).toBe(statStep.delta.subFlat);
	});

	// Stars 23-30 grant no class stat (ATT does keep climbing), and 22 -> 30
	// costs ~2.4e7 attempts
	// and ~1.1e6 destroyed copies. Nate: "30 star is a thing of myth (no one will
	// ever see)". A laddered item must not be offered one.
	it('never offers 30★ on an item the progression ladder covers', () => {
		const { candidates, notes } = generate(
			(character) => {
				character.equipment.weapon!.name = 'Arcane Umbra Bow';
			},
			{ kinds: ['starforce'] }
		);
		expect(candidates.some((c) => c.id === 'starforce:weapon:22-30')).toBe(false);
		// Dropped WITH A REASON — a silently missing row looks exactly like a bug.
		expect(notes.join(' ')).toMatch(/Arcane Umbra Bow.*did not offer/);
	});

	// An item MISSING from the ladder still generates candidates — unknown is not
	// the same as wrong — but it is still capped at the global 22, so a future
	// name-matching gap fails closed instead of resurrecting a 30★ recommendation.
	it('caps an item outside the ladder at the global ceiling too', () => {
		const { candidates } = generate(
			(character) => {
				character.equipment.weapon!.name = 'Ignitia Sureshot Bow';
				// The fixture's weapon is already at 22★, the global ceiling.
				character.equipment.weapon!.starforce = 17;
			},
			{ kinds: ['starforce'] }
		);
		const weapon = candidates.filter((c) => c.slot === 'weapon');
		expect(weapon.length).toBeGreaterThan(0);
		expect(Math.max(...weapon.map((c) => Number(c.id.split('-').pop())))).toBeLessThanOrEqual(22);
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
	it('emits a rank-up and per-slot cube goals for an item', () => {
		const { candidates } = generate(() => {}, { kinds: ['potential'] });
		const bottom = candidates.filter((c) => c.slot === 'bottom');

		expect(bottom.map((c) => c.id)).toContain('potential:bottom:rank-up');
		// Goals are keyed by the real per-slot line pool now, not one blanket
		// "useful lines" candidate.
		expect(bottom.some((c) => c.id.startsWith('potential:bottom:goal:'))).toBe(true);

		const rankUp = bottom.find((c) => c.id.endsWith('rank-up'))!;
		expect(rankUp.confidence).toBe('speculative');
		expect(rankUp.cost.mesos! % potentialData.HEROIC_CUBE_PRICES.bright).toBe(0);
	});

	it('has no rank-up for a legendary item, but still offers cube goals', () => {
		const { candidates } = generate(() => {}, { kinds: ['potential'] });
		expect(candidates.some((c) => c.id === 'potential:hat:rank-up')).toBe(false);
		expect(candidates.some((c) => c.id.startsWith('potential:hat:goal:'))).toBe(true);
	});

	it('removes the current IED lines before adding the new ones', () => {
		const { candidates } = generate(() => {}, { kinds: ['potential'] });
		const weapon = candidates.find((c) => c.id === 'potential:weapon:goal:bossied2')!;

		expect(weapon.delta.iedRemove).toEqual([40]);
		expect(weapon.delta.iedAdd!.length).toBeGreaterThan(0);
	});

	// Pools are per SLOT, and an emblem's pool contains no Boss Damage line at
	// any rank — so no boss goal may be offered for one, however tempting.
	it('never offers a boss-damage goal for an emblem', () => {
		const { candidates } = generate(() => {}, { kinds: ['potential'] });
		const emblem = candidates.filter((c) => c.slot === 'emblem');
		expect(emblem.some((c) => c.id.includes('boss'))).toBe(false);
	});

	// 3L crit damage is 133,100 cubes ~ 2.9T mesos (cubing-strategy.md SS1, which
	// the community independently derives at 2.3-3T). Nate: "Maybe 5 people in all
	// of maple story history have had 3 crit lines." It is not a plan, so it is not
	// a candidate. 2L crit damage IS the researched rung and must still be offered.
	it('never offers three critical-damage glove lines', () => {
		const { candidates } = generate(() => {}, { kinds: ['potential'] });
		expect(candidates.some((c) => c.id === 'potential:gloves:goal:critdmg3')).toBe(false);
	});

	// Boss / IED / Drop are hard-capped at 2 lines per item (StrategyWiki, quoted
	// in cubing-strategy.md SS1). Three of any of them cannot be rolled at all, and
	// we used to offer exactly that.
	it('never asks for more than two boss or IED lines on one item', () => {
		const { candidates } = generate(() => {}, { kinds: ['potential'] });
		for (const c of candidates.filter((x) => /goal:(boss|ied)/.test(x.id))) {
			const added = (c.delta.iedAdd?.length ?? 0) + (c.delta.boss !== undefined ? 1 : 0);
			expect(added).toBeLessThanOrEqual(2);
		}
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

/* -------------------------------------------------------------------------- */
/* Upgrade capabilities (src/lib/data/items)                                    */
/* -------------------------------------------------------------------------- */

describe('capability gate', () => {
	function starforceFor(name: string, slot: 'weapon' | 'ring1', extra: Partial<Item> = {}) {
		return generate(
			(character) => {
				const base: Item = character.equipment[slot] ?? {
					name,
					slot,
					category: slot === 'weapon' ? 'weapon' : 'accessory'
				};
				character.equipment[slot] = { ...base, name, ...extra };
			},
			{ kinds: ['starforce'] }
		);
	}

	it('generates no star force candidate for a Ring of Restraint, and says why', () => {
		const { candidates, notes } = starforceFor('Ring of Restraint', 'ring1', {
			itemLevel: 110,
			starforce: 0
		});

		expect(candidates.filter((c) => c.slot === 'ring1')).toEqual([]);
		const note = notes.find((n) => n.includes('Ring of Restraint'));
		expect(note).toBeDefined();
		expect(note).toContain('no upgrade slots');
	});

	it('says a Ring of Restraint cannot be star forced at all', () => {
		const caps = capabilities({
			name: 'Ring of Restraint',
			slot: 'ring1',
			category: 'accessory',
			itemLevel: 110
		});
		expect(caps.canStarforce).toBe(false);
		expect(caps.maxStarforce).toBeUndefined();
		expect(caps.known).toBe(true);
		expect(Object.keys(caps.reasons)).toContain('no-upgrade-slots');
	});

	it('generates no star force candidate for a Genesis weapon and reports 22★ fixed', () => {
		// "Genesis Sword" is not a real GMS item id — Genesis weapons are per class
		// — so this also pins the NAME-FAMILY rule rather than the id lookup.
		const { candidates, notes } = starforceFor('Genesis Sword', 'weapon', {
			itemLevel: 200,
			starforce: 22
		});

		expect(candidates.filter((c) => c.slot === 'weapon')).toEqual([]);
		const note = notes.find((n) => n.includes('Genesis Sword'));
		expect(note).toBeDefined();
		expect(note).toContain('22★');
	});

	it('fixes every Genesis and Destiny weapon at 22★', () => {
		for (const name of ['Genesis Sword', 'Genesis Fan', 'Genesis Bow', 'Destiny Bladecaster']) {
			const caps = capabilities({
				name,
				slot: 'weapon',
				category: 'weapon',
				itemLevel: name.startsWith('Destiny') ? 250 : 200
			});
			expect(caps.canStarforce).toBe(false);
			expect(caps.fixedStarforce).toBe(22);
			expect(caps.maxStarforce).toBe(22);
		}
	});

	it('does not mistake the Genesis Badge or a Destiny medal for a liberated weapon', () => {
		const badge = capabilities({
			name: 'Genesis Badge',
			slot: 'badge',
			category: 'badge',
			itemLevel: 200
		});
		expect(badge.fixedStarforce).toBeUndefined();

		const medal = capabilities({
			name: 'Adversary of Destiny',
			slot: 'medal',
			category: 'medal',
			itemLevel: 200
		});
		expect(medal.fixedStarforce).toBeUndefined();
	});

	it('still star forces a normal Arcane Umbra hat', () => {
		const caps = capabilities({
			name: 'Arcane Umbra Knight Hat',
			slot: 'hat',
			category: 'armor',
			itemLevel: 200
		});
		expect(caps.canStarforce).toBe(true);
		expect(caps.canFlame).toBe(true);
		expect(caps.canPotential).toBe(true);
		expect(caps.maxStarforce).toBe(30);

		// Started below the ceiling: the fixture's hat is already at the plan's
		// 22★ stop, where having nothing left to offer is the correct answer.
		const { candidates } = generate((character) => (character.equipment.hat!.starforce = 17), {
			kinds: ['starforce']
		});
		expect(candidates.filter((c) => c.slot === 'hat').length).toBeGreaterThan(0);
	});

	it('still generates candidates for an unknown item, but flags it', () => {
		const caps = capabilities({
			name: 'Completely Made Up Battlehat',
			slot: 'hat',
			category: 'armor',
			itemLevel: 200
		});
		expect(caps.known).toBe(false);
		expect(caps.matchQuality).toBe('none');
		expect(caps.canStarforce).toBe(true);
		expect(Object.keys(caps.reasons)).toContain('unknown-item');

		const { candidates } = generate(
			(character) => {
				character.equipment.hat!.name = 'Completely Made Up Battlehat';
				character.equipment.hat!.starforce = 17;
			},
			{ kinds: ['starforce'] }
		);
		const hat = candidates.filter((c) => c.slot === 'hat');
		expect(hat.length).toBeGreaterThan(0);
		expect(hat[0].notes!.join(' ')).toContain('not in the v270 GMS catalogue');
	});

	it('treats an absent name as UNKNOWN, never as a restriction', () => {
		// The v270 dump predates Ren, so "Imugi Gem" is genuinely not in it. An
		// absence must NOT be read as "this item cannot be upgraded" — a Ren main
		// would then get wrong advice on every slot.
		expect(findByName('Imugi Gem')).toHaveLength(0);
		const caps = capabilities({
			name: 'Imugi Gem',
			slot: 'secondary',
			category: 'secondary',
			itemLevel: 200
		});
		expect(caps.known).toBe(false);
		expect(caps.canStarforce).toBe(true);
		expect(caps.canPotential).toBe(true);
		expect(caps.blockedBy.starforce).toEqual([]);
		expect(Object.keys(caps.reasons)).toContain('unknown-item');
		// ...and the catalogue says so about itself.
		expect(CATALOGUE_META.gameVersion).toBe('270');
		expect(CATALOGUE_META.coverage.knownMissing.join(' ')).toContain('Imugi Gem');
		expect(CATALOGUE_META.coverage.note).toContain('UNKNOWN');
	});

	it('resolves approximate capture names to the closest catalogue entry', () => {
		const caps = capabilities({
			name: 'Arcane Umbra Hat',
			slot: 'hat',
			category: 'armor',
			itemLevel: 200
		});
		expect(caps.matchQuality).toBe('approximate');
		expect(caps.known).toBe(true);
		expect(caps.canStarforce).toBe(true);

		// "Total Control Heart" is a capture of the item actually named "Total Control".
		const heart = capabilities({
			name: 'Total Control Heart',
			slot: 'heart',
			category: 'heart',
			itemLevel: 200
		});
		expect(heart.matchQuality).toBe('exact');
		expect(heart.entries[0].name).toBe('Total Control');
	});

	it('blocks star force on the exclusive-currency event rings, which DO have slots', () => {
		// Vengeful / Cosmos / Awake rings carry 3-20 upgrade slots that only accept
		// their own enhancement currency, so the `tuc === 0` screen does not catch
		// them. https://maplestorywiki.net/w/Vengeful_Ring
		for (const name of ['Vengeful Ring', 'Cosmos Ring', 'Awake Ring']) {
			const caps = capabilities({
				name,
				slot: 'ring1',
				category: 'accessory',
				itemLevel: 120
			});
			expect(caps.canStarforce, name).toBe(false);
			expect(caps.blockedBy.starforce, name).toContain('exclusive-scroll-only');
		}
		// ...but a Platinum Cross Ring and Glona's Heart still do.
		expect(
			capabilities({ name: 'Platinum Cross Ring', slot: 'ring1', category: 'accessory' })
				.canStarforce
		).toBe(true);
	});

	it('reports only the reasons that bear on the blocked capability', () => {
		const caps = capabilities({
			name: 'Ring of Restraint',
			slot: 'ring1',
			category: 'accessory',
			itemLevel: 110
		});
		// The ring is blocked from BOTH star force and flames, for different
		// reasons; the star force explanation must not drag the flame one in.
		expect(caps.blockedBy.starforce).toEqual(['no-upgrade-slots']);
		expect(caps.blockedBy.flame).toEqual(['flame-ineligible-slot']);
		expect(caps.blockedBy.potential).toEqual([]);
	});

	it('never flames a ring, a badge, an emblem or a secondary', () => {
		for (const [name, slot, category] of [
			['Ring of Restraint', 'ring1', 'accessory'],
			['Genesis Badge', 'badge', 'badge'],
			['Gold Maple Leaf Emblem', 'emblem', 'emblem'],
			['Astra Sacred Aegis', 'secondary', 'secondary']
		] as const) {
			expect(capabilities({ name, slot, category, itemLevel: 200 }).canFlame).toBe(false);
		}
		// ...but a belt, an earring and a pendant all take flames.
		for (const [name, slot] of [
			['Dreamy Belt', 'belt'],
			['Commanding Force Earring', 'earrings'],
			['Source of Suffering', 'pendant1']
		] as const) {
			expect(capabilities({ name, slot, category: 'accessory', itemLevel: 200 }).canFlame).toBe(
				true
			);
		}
	});

	it('never gives potential to a medal, a pocket item, an android or a plain badge', () => {
		for (const [name, slot, category] of [
			['Chaos Vellum Medal', 'medal', 'medal'],
			['Pink Holy Cup', 'pocket', 'pocket'],
			['Lumiwing Android', 'android', 'android'],
			['Genesis Badge', 'badge', 'badge']
		] as const) {
			expect(capabilities({ name, slot, category, itemLevel: 200 }).canPotential).toBe(false);
		}
		// The two star-forceable badges are also the badges that take potential.
		expect(
			capabilities({
				name: 'Ghost Ship Exorcist',
				slot: 'badge',
				category: 'badge',
				itemLevel: 150
			}).canPotential
		).toBe(true);
	});

	it('never offers bonus potential, because Heroic has none', () => {
		const caps = capabilities({
			name: 'Arcane Umbra Knight Hat',
			slot: 'hat',
			category: 'armor',
			itemLevel: 200
		});
		expect(caps.canBonusPotential).toBe(false);
		expect(Object.keys(caps.reasons)).toContain('bonus-potential-not-in-heroic');
	});

	it('recognises exactly the 50 GMS Superior items, and not Superior Gollux', () => {
		// https://maplestorywiki.net/w/Category:Superior_Equipment — Tyrant
		// belt/boots/cloak/gloves, Nova belt/boots/cloak, Elite Heliseum
		// belt/boots/cape, five variants each.
		expect(CATALOGUE.filter((e) => e.superior)).toHaveLength(50);
		// "Superior Gollux" accessories are NOT Superior equipment; they use the
		// ordinary 30★ table.
		const gollux = capabilities({
			name: 'Superior Gollux Ring',
			slot: 'ring1',
			category: 'accessory',
			itemLevel: 150
		});
		expect(gollux.superior).toBeUndefined();
		expect(gollux.maxStarforce).toBe(30);
	});

	it('caps Superior (Tyrant) gear at its own table', () => {
		const caps = capabilities({
			name: 'Tyrant Hyades Gloves',
			slot: 'gloves',
			category: 'armor',
			itemLevel: 150
		});
		expect(caps.superior).toBe(true);
		expect(caps.maxStarforce).toBe(15);
	});

	it('suppresses flame and potential candidates with a reason, not silently', () => {
		const { notes } = generate(() => {}, { kinds: ['flame', 'potential'] });
		const joined = notes.join('\n');
		expect(joined).toContain('No flame candidate for');
		expect(joined).toMatch(/can never receive bonus stats/);
	});
});

describe('class weapon table', () => {
	it('matches the five priority classes exactly', () => {
		const expected: Record<string, { weaponType: string; secondaryType: string }> = {
			// https://grandislibrary.com/anima/ren — Sword + Imugi Gem, STR / DEX.
			ren: { weaponType: 'Sword', secondaryType: 'Imugi Gem' },
			hero: { weaponType: 'Two-Handed Sword', secondaryType: 'Medallion' },
			'wind-archer': { weaponType: 'Bow', secondaryType: 'Jewel' },
			'battle-mage': { weaponType: 'Staff', secondaryType: 'Magic Marble' },
			'night-walker': { weaponType: 'Claw', secondaryType: 'Jewel' }
		};
		for (const [id, want] of Object.entries(expected)) {
			const cls = getClass(id);
			expect(cls.weaponType).toBe(want.weaponType);
			expect(cls.secondaryType).toBe(want.secondaryType);
		}
	});

	it('keeps Ren STR / DEX and leaves the sourced 1.3 weapon constant alone', () => {
		const ren = getClass('ren');
		expect(ren.primary).toEqual(['str']);
		expect(ren.secondary).toEqual(['dex']);
		// formulas.md §1.5 — a per-class value, NOT "the Sword constant".
		expect(ren.weaponConstant).toBe(1.3);
	});

	it('gives every class a weapon and a secondary', () => {
		for (const cls of listClasses()) {
			expect(cls.weaponType, cls.id).toBeTruthy();
			expect(cls.secondaryType, cls.id).toBeTruthy();
		}
	});

	it('warns when a class holds a weapon it cannot equip', () => {
		const character = windArcherFixture();
		character.equipment.weapon!.name = 'Arcane Umbra Shining Rod';
		const { warnings } = summarizeGear(character);
		expect(warnings.join('\n')).toContain('but Wind Archer uses a Bow');
	});

	it('does not warn about Ren, whose weapon postdates the v270 catalogue', () => {
		const character = windArcherFixture();
		character.classId = 'ren';
		character.equipment.weapon!.name = 'Genesis Sword';
		const { warnings } = summarizeGear(character);
		expect(warnings.join('\n')).not.toContain('uses a Sword');
	});
});

describe('cube goals price and value the SAME outcome', () => {
	// The bug this pins: the target asked for "3 stat lines of ANY value" — which
	// a 3% line satisfies, ~14 cubes — while the contribution was valued at the
	// PRIME value as though all three rolled 12%. That reported +28.84% for 159M
	// mesos, which is off by orders of magnitude. One value now feeds both sides.
	it('names the per-line value it priced, in the label', () => {
		const { candidates } = generate(() => {}, { kinds: ['potential'] });
		const statGoals = candidates.filter((c) => c.id.includes(':goal:stat'));
		expect(statGoals.length).toBeGreaterThan(0);
		for (const goal of statGoals) {
			// Summed, the way every guide and calculator states it: "... -> 21%+ main
			// stat (2 lines)". Never a bare "%main stat" with no number attached.
			expect(goal.label).toMatch(/\d+%\+? main stat/);
		}
	});

	it('costs more for a prime-value goal than the old any-value basis did', () => {
		const { candidates } = generate(() => {}, { kinds: ['potential'] });
		const statGoals = candidates.filter((c) => c.id.includes(':goal:stat'));
		for (const goal of statGoals) {
			// The old model produced ~159M for a three-line stat goal. Anything at
			// that scale means the value stopped feeding the probability model.
			expect(goal.cost.mesos!).toBeGreaterThan(200_000_000);
		}
	});

	// IED composes multiplicatively, so two IED lines are worth much less than one
	// boss plus one IED. A mixed goal must be valued as the mix.
	//
	// Rolled on a weapon that does NOT already carry boss/IED: the fixture's own
	// bow has Boss 40 + IED 40, which since the 2-line cap landed IS the goal, so
	// it correctly gains nothing there.
	it('values a boss-or-IED goal as boss + IED, not two of one', () => {
		const { candidates } = generate(
			(character) => {
				character.equipment.weapon!.potential = {
					grade: 'legendary',
					lines: ['DEX : +12%', 'DEX : +12%', 'DEX : +9%']
				};
			},
			{ kinds: ['potential'] }
		);
		const weapon = candidates.find((c) => c.id === 'potential:weapon:goal:bossied2')!;
		expect(weapon.delta.boss).toBeGreaterThan(0);
		expect(weapon.delta.iedAdd!.length).toBe(1);
	});
});
