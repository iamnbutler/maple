import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
	GEAR_GATES,
	INVESTMENT_ORDER,
	LAST_STAT_STAR,
	NAMES_NOT_IN_V270_CATALOGUE,
	OUT_OF_SCOPE,
	PITCHED_WAIT_SENSITIVITY,
	PRESCRIBED_MAX_STAR,
	SAFEGUARD_CEILING,
	SLOT_PATHS,
	STAR_CLIMB_COST,
	THEORETICAL_MAX_STAR,
	gateRequirements,
	getStage,
	isOutOfScope,
	nextRecommendedStage,
	nextStage,
	pathForItem,
	pathsFor,
	stageForItem,
	starTargetVerdict,
	stopPointForItem,
	type PathStage
} from './gear-progression';
import { findByName } from './items';
import { getBoss } from './bosses';
import * as starforce from './starforce';

const ALL_STAGES: PathStage[] = SLOT_PATHS.flatMap((p) => [...p.stages]);

describe("the user's worked examples", () => {
	// "no one in their right mind would take these garbage earrings and try to
	// 3 line them ... these earrings will always be replaced with sup gollux
	// earrings in the end".
	it("Will o' the Wisps is a stepping stone whose successor is the Superior Gollux Earring", () => {
		const wisps = stageForItem("Will o' the Wisps");
		expect(wisps).toBeDefined();
		expect(wisps!.itemLevel).toBe(130);
		expect(wisps!.setName).toBe('Boss Accessory Set');

		// It is NOT out of scope — you wear it, you star it, it gets you to Gollux.
		expect(wisps!.outOfScope).toBeUndefined();

		// But the prescribed stop is cheap: 10 stars, Epic, no flames, no 3-lining.
		expect(wisps!.stop.stars).toBe(10);
		expect(wisps!.stop.potential).toBe('epic');
		expect(wisps!.stop.mainStatPct).toBe(6);
		expect(wisps!.stop.flames).toBe('none');
		expect(wisps!.stop.usefulLines).toBeUndefined();

		// The successor, by name.
		const successor = nextRecommendedStage(wisps!.id);
		expect(successor?.name).toBe('Superior Gollux Earrings');
		expect(successor?.itemLevel).toBe(150);
		expect(successor?.setName).toBe('Superior Gollux Set');
	});

	// The mechanical half of the argument: a 20-star item cannot be an endgame
	// piece, and its successor can go to 30.
	it("caps Will o' the Wisps at 20 stars against the Superior Gollux Earring's 30", () => {
		expect(stageForItem("Will o' the Wisps")!.maxStars).toBe(20);
		expect(stageForItem('Superior Gollux Earrings')!.maxStars).toBe(30);

		// And that cap agrees with starforce.ts, which was researched independently.
		expect(starforce.maxStars(130)).toBe(20);
		expect(starforce.maxStars(150)).toBe(30);
	});

	it("refuses a 3-line legendary or a 22-star push on Will o' the Wisps", () => {
		const legendary = starTargetVerdict("Will o' the Wisps", 22);
		expect(legendary.verdict).toBe('impossible');
		expect(legendary.mechanicalMax).toBe(20);

		const overInvested = starTargetVerdict("Will o' the Wisps", 17);
		expect(overInvested.verdict).toBe('over-invested');
		expect(overInvested.prescribed).toBe(10);
		expect(overInvested.why).toContain('Superior Gollux');
	});

	// "no one would ever star absolab to 22 stars for example, arcanes come too fast."
	it('stops AbsoLab well below 22 stars, and does not even allow an event push', () => {
		const abso = stageForItem('AbsoLab Knight Shoes');
		expect(abso).toBeDefined();
		expect(abso!.tier).toBe('absolab');
		expect(abso!.itemLevel).toBe(160);

		expect(abso!.stop.stars).toBe(17);
		expect(abso!.stop.stars).toBeLessThan(22);
		// Unlike CRA or Arcane, AbsoLab gets no 21-22 event push: it is gone by then.
		expect(abso!.stop.starsOnEvent).toBe(17);
		expect(abso!.stop.potential).toBe('epic');

		// It is still a required stage — investment is not suppressed.
		expect(abso!.outOfScope).toBeUndefined();
		expect(abso!.stop.stars).toBeGreaterThan(0);

		// And a 22-star AbsoLab candidate is flagged, not silently allowed.
		const verdict = starTargetVerdict('AbsoLab Knight Shoes', 22);
		expect(verdict.verdict).toBe('over-invested');
		expect(verdict.prescribed).toBe(17);
		expect(verdict.why).toContain('Arcane');
	});

	it('takes AbsoLab to Arcane Umbra, which does get the 22-star push', () => {
		const abso = stageForItem('AbsoLab Knight Shoes')!;
		const arcane = nextRecommendedStage(abso.id);
		expect(arcane?.tier).toBe('arcane-umbra');
		expect(arcane?.itemLevel).toBe(200);
		expect(arcane?.stop.stars).toBe(17);
		expect(arcane?.stop.starsOnEvent).toBe(22);
		expect(arcane?.stop.potential).toBe('legendary');
	});

	// CRA is the contrast case: also replaced eventually, but it lasts ~100 levels,
	// so it earns Legendary and a 21-22 push. The tool must be able to tell them apart.
	it('gives CRA a Legendary target and a 22-star event push, unlike AbsoLab', () => {
		const cra = stageForItem('Royal Warrior Helm');
		expect(cra?.tier).toBe('cra');
		expect(cra?.stop.stars).toBe(17);
		expect(cra?.stop.starsOnEvent).toBe(22);
		expect(cra?.stop.potential).toBe('legendary');
		expect(cra?.stop.mainStatPct).toBe(15);
		expect(cra?.stop.flames).toBe('invest');
	});
});

describe('pitched and brilliant are out of scope', () => {
	const pitched = [
		'Berserked',
		'Magic Eyepatch',
		'Dreamy Belt',
		'Endless Terror',
		'Source of Suffering',
		'Commanding Force Earring',
		'Genesis Badge',
		'Black Heart',
		'Cursed Red Spellbook',
		"Mitra's Rage: Warrior"
	];
	const brilliant = [
		'Original Sin of Pride',
		'Oath of Death',
		'Whisper of the Source',
		'Blissful Nightmare'
	];

	it.each([...pitched, ...brilliant])('flags %s as out of scope', (name) => {
		expect(stageForItem(name), `${name} is not in the ladder at all`).toBeDefined();
		expect(isOutOfScope(name)).toBe(true);
	});

	it('never lets an out-of-scope stage be the answer to "what is next"', () => {
		for (const stage of ALL_STAGES) {
			expect(nextRecommendedStage(stage.id)?.outOfScope ?? false).toBe(false);
		}
	});

	it('documents both sets with a reason and a presentation rule, and NO invented drop rate', () => {
		expect(OUT_OF_SCOPE.map((s) => s.setName)).toEqual(['Pitched Boss Set', 'Brilliant Boss Set']);
		for (const set of OUT_OF_SCOPE) {
			// The hardest rule in this project: do not invent numbers. No public source
			// publishes GMS pitched drop rates, so this stays undefined forever until one does.
			expect(set.dropRatePercent).toBeUndefined();
			expect(set.reason.length).toBeGreaterThan(80);
			expect(set.presentAs).toMatch(/never/i);
			expect(set.sources.length).toBeGreaterThan(0);
		}
		// "Radiant" is the community name; the GMS name is Brilliant. Recording the
		// alias is what stops the tracker inventing a "Radiant Boss Set" item.
		expect(OUT_OF_SCOPE[1].alsoCalled).toContain('Radiant Boss Set');
	});

	it('keeps the pitched wait arithmetic consistent with a geometric model', () => {
		for (const row of PITCHED_WAIT_SENSITIVITY) {
			expect(row.expectedClears).toBeCloseTo(100 / row.dropRatePercent, 6);
			// A weekly boss gives 52 rolls a year, a monthly one 12.
			expect(row.weeklyBossYears).toBeCloseTo(row.expectedClears / 52, 1);
			expect(row.monthlyBossYears).toBeCloseTo(row.expectedClears / 12, 1);
		}
		// The user's "1-2 years" corresponds to a ~1% per-clear rate on a weekly boss.
		const onePct = PITCHED_WAIT_SENSITIVITY.find((r) => r.dropRatePercent === 1)!;
		expect(onePct.weeklyBossYears).toBeGreaterThan(1.5);
		expect(onePct.weeklyBossYears).toBeLessThan(2.5);
	});

	it('sources every pitched item from a weekly- or monthly-reset boss', () => {
		const pitchedStages = ALL_STAGES.filter((s) => s.tier === 'pitched' && s.bossIds);
		expect(pitchedStages.length).toBeGreaterThan(5);
		for (const stage of pitchedStages) {
			for (const id of stage.bossIds!) {
				const boss = getBoss(id);
				expect(boss, `${id} is not in bosses.json`).toBeDefined();
				expect(['weekly', 'monthly']).toContain(boss!.reset);
			}
		}
	});
});

describe('stepping-stone investment is prescribed, not suppressed', () => {
	// The whole point of the reframe: a tool that tells you not to gear CRA/AbsoLab
	// is telling you not to build the gear that unlocks Lucid.
	it('gives every non-starter, star-forceable stage a positive star target', () => {
		for (const stage of ALL_STAGES) {
			if (stage.maxStars === undefined) continue;
			expect(stage.stop.stars, `${stage.id} has no star target`).toBeGreaterThan(0);
		}
	});

	it('never prescribes more stars than the item can mechanically take', () => {
		for (const stage of ALL_STAGES) {
			if (stage.maxStars === undefined || stage.stop.stars === undefined) continue;
			expect(stage.stop.stars, stage.id).toBeLessThanOrEqual(stage.maxStars);
			expect(stage.stop.starsOnEvent ?? 0, stage.id).toBeLessThanOrEqual(stage.maxStars);
		}
	});

	it('never prescribes past 22 stars, for any item, ever', () => {
		for (const stage of ALL_STAGES) {
			expect(stage.stop.stars ?? 0, stage.id).toBeLessThanOrEqual(PRESCRIBED_MAX_STAR);
			expect(stage.stop.starsOnEvent ?? 0, stage.id).toBeLessThanOrEqual(PRESCRIBED_MAX_STAR);
		}
		expect(PRESCRIBED_MAX_STAR).toBe(LAST_STAT_STAR);
		expect(PRESCRIBED_MAX_STAR).toBeLessThan(THEORETICAL_MAX_STAR);
	});

	it('keeps the event push at or above the everyday target', () => {
		for (const stage of ALL_STAGES) {
			if (stage.stop.stars === undefined || stage.stop.starsOnEvent === undefined) continue;
			expect(stage.stop.starsOnEvent, stage.id).toBeGreaterThanOrEqual(stage.stop.stars);
		}
	});

	it('flames nothing that cannot be flamed, and rings/hearts are marked not-applicable', () => {
		// items/rules.ts flame-ineligible-slot: rings, hearts, secondaries, emblems,
		// badges, medals, shoulders and totems take no bonus stats.
		const flameIneligible: readonly string[] = ['ring', 'heart', 'secondary', 'emblem', 'badge'];
		for (const path of SLOT_PATHS) {
			if (!flameIneligible.includes(path.slot)) continue;
			for (const stage of path.stages) {
				expect(stage.stop.flames, `${stage.id} (${path.slot})`).toBe('not-applicable');
			}
		}
	});

	it('never sets a potential target on an item that cannot take potential', () => {
		// Badges (bar three exceptions) and pocket items never get potential.
		for (const path of SLOT_PATHS) {
			if (path.slot !== 'badge' && path.slot !== 'pocket') continue;
			for (const stage of path.stages) {
				expect(stage.stop.potential, stage.id).toBe('none');
			}
		}
	});

	it('explains every stopping point and cites a source', () => {
		for (const stage of ALL_STAGES) {
			expect(stage.stop.why.length, stage.id).toBeGreaterThan(40);
			expect(stage.stop.sources.length, stage.id).toBeGreaterThan(0);
			for (const s of stage.stop.sources) expect(s).toMatch(/research §|http|UG|DTQ|GL/);
		}
	});
});

describe('paths are well-formed', () => {
	it('has unique stage ids', () => {
		const ids = ALL_STAGES.map((s) => s.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('covers every damage-relevant slot', () => {
		const covered = new Set(SLOT_PATHS.map((p) => p.slot));
		for (const slot of [
			'weapon',
			'secondary',
			'emblem',
			'hat',
			'shoes',
			'earrings',
			'face',
			'eye',
			'pendant',
			'ring',
			'belt',
			'heart',
			'badge',
			'pocket'
		]) {
			expect(covered.has(slot as never), `no path for ${slot}`).toBe(true);
		}
	});

	it('states a branch condition wherever there is a real branch', () => {
		for (const path of SLOT_PATHS) {
			if (path.kind === 'only') {
				expect(path.branchCondition, path.id).toBeUndefined();
			} else {
				expect(path.branchCondition, path.id).toBeTruthy();
			}
		}
		// Face is the documented branch: Lucid/Will route vs the Commerci route.
		const face = pathsFor('face');
		expect(face.length).toBe(2);
		expect(face.map((p) => p.kind).sort()).toEqual(['alternative', 'default']);
		expect(face.find((p) => p.kind === 'alternative')!.branchCondition).toMatch(/Commerci|Lucid/);
	});

	it('orders stages by increasing item level within a path', () => {
		for (const path of SLOT_PATHS) {
			const levels = path.stages.map((s) => s.itemLevel).filter((n): n is number => n != null);
			for (let i = 1; i < levels.length; i++) {
				expect(levels[i], `${path.id} stage ${i}`).toBeGreaterThanOrEqual(levels[i - 1]);
			}
		}
	});

	it('resolves an item to its stage, path and next step', () => {
		expect(stageForItem('superior gollux earrings')?.id).toBe('earrings-superior-gollux');
		expect(stageForItem('  Superior Gollux Earrings  ')?.id).toBe('earrings-superior-gollux');
		expect(pathForItem("Will o' the Wisps")?.slot).toBe('earrings');
		expect(stopPointForItem('Fafnir Mistilteinn')?.stars).toBe(17);
		expect(nextStage('weapon-genesis')).toBeUndefined();
		expect(getStage('nope')).toBeUndefined();
	});

	it('treats an unknown item as UNKNOWN, never as INVALID', () => {
		expect(stageForItem('Pot Lid of Questionable Provenance')).toBeUndefined();
		const verdict = starTargetVerdict('Pot Lid of Questionable Provenance', 20);
		expect(verdict.known).toBe(false);
		expect(verdict.verdict).toBe('unknown');
	});

	// The 22-star ceiling comes from the star table, not from the ladder, so a name
	// we failed to recognise must not be able to produce a 30-star recommendation by
	// falling through. This is the belt-and-braces for any future lookup gap.
	it('caps an UNKNOWN item at 22 stars too', () => {
		const verdict = starTargetVerdict('Pot Lid of Questionable Provenance', 30);
		expect(verdict.known).toBe(false);
		expect(verdict.verdict).toBe('above-global-cap');
		expect(verdict.why).toMatch(/no class stat/);
	});

	// `above-global-cap` is additive: a KNOWN item keeps returning the verdicts
	// analysis/candidates.ts already branches on, so adding it broke nothing.
	it('keeps the existing suppression verdicts for a KNOWN item at 30 stars', () => {
		for (const [name, slot] of [
			['Arcane Umbra Bow', 'weapon'],
			['AbsoLab Knight Shoes', 'shoes'],
			['Royal Warrior Helm', 'hat'],
			["Will o' the Wisps", 'earrings']
		] as const) {
			const v = starTargetVerdict(name, 30, slot);
			expect(v.known, name).toBe(true);
			expect(['over-invested', 'impossible'], name).toContain(v.verdict);
		}
	});
});

describe('name lookup covers the names captures actually produce', () => {
	// Each row is a real capture that used to resolve to `undefined`, which is how a
	// "Fafnir Soaring Sword 14★ -> 30★ for 2,275 trillion mesos" candidate reached
	// the ranked board. Family stages cover one item PER JOB BRANCH, so `examples`
	// can never enumerate them — these exercise the set/prefix matchers instead.
	const cases: [name: string, slot: Parameters<typeof stageForItem>[1], stageId: string][] = [
		// Ren weapons: post-v270, so the catalogue cannot help at all — prefix only.
		['Fafnir Soaring Sword', 'weapon', 'weapon-cra'],
		['Genesis Sword', 'weapon', 'weapon-genesis'],
		// Other job branches of the same families.
		['Fafnir Mana Cradle', 'weapon', 'weapon-cra'],
		['AbsoLab Shining Rod', 'weapon', 'weapon-absolab'],
		['Arcane Umbra Dual Bowguns', 'weapon', 'weapon-arcane'],
		['Genesis Bow', 'weapon', 'weapon-genesis'],
		// Armour families, non-Warrior branches, via catalogue set membership.
		['Royal Dunwitch Hat', 'hat', 'armour-core-cra'],
		['Eagle Eye Ranger Cowl', 'top', 'armour-core-cra'],
		['Trixter Assassin Pants', 'bottom', 'armour-core-cra'],
		['AbsoLab Bandit Cape', 'cape', 'armour-outer-absolab'],
		['Arcane Umbra Mage Shoes', 'shoes', 'armour-outer-arcane'],
		['Eternal Archer Hat', 'hat', 'armour-core-eternal'],
		['Eternal Thief Gloves', 'gloves', 'armour-outer-eternal'],
		// Loose screenshot transcriptions that drop the job word.
		['Arcane Umbra Top', 'top', 'armour-outer-arcane'],
		['Arcane Umbra Bottom', 'bottom', 'armour-outer-arcane'],
		['Arcane Umbra Gloves', 'gloves', 'armour-outer-arcane'],
		['Arcane Umbra Shoes', 'shoes', 'armour-outer-arcane'],
		['Arcane Umbra Cape', 'cape', 'armour-outer-arcane'],
		['Arcane Umbra Knight Hat', 'hat', 'armour-outer-arcane'],
		['Arcane Umbra Knight Suit', 'overall', 'armour-outer-arcane'],
		['Total Control Heart', 'heart', 'heart-pitched'],
		// Post-v270 or class-specific names in cube-only slots.
		["Princess No's Imugi Gem", 'secondary', 'secondary-princess-no'],
		['Imugi Gem', 'secondary', 'secondary-lv100'],
		['Gold Sword Emblem', 'emblem', 'emblem-gold-maple'],
		// Curly apostrophe (U+2019) — the catalogue stores a straight one.
		['Kanna’s Treasure', 'ring', 'ring-keepers'],
		["Kanna's Treasure", 'ring', 'ring-keepers'],
		['Guardian Angel Ring', 'ring', 'ring-keepers']
	];

	it.each(cases)('%s (%s) resolves to %s', (name, slot, stageId) => {
		expect(stageForItem(name, slot)?.id).toBe(stageId);
	});

	// The failure mode the starforce.ts `MAX_STAR_EXCEPTIONS` comment warns about: a
	// bare substring on "genesis"/"eternal"/"royal" catching badges, medals, capes
	// and rings. Every matcher is slot-scoped precisely to stop this.
	const mustNotMatch: [name: string, slot: Parameters<typeof stageForItem>[1], stageId: string][] =
		[
			['Genesis Badge', 'badge', 'weapon-genesis'],
			['Eternal Flame Ring', 'ring', 'armour-core-eternal'],
			['Eternal Flame Ring', 'ring', 'armour-outer-eternal'],
			['Stone of Eternal Life', 'pocket', 'armour-outer-eternal'],
			['Royal Black Metal Shoulder', 'shoulder', 'armour-core-cra']
		];

	it.each(mustNotMatch)('%s (%s) must NOT match %s', (name, slot, forbiddenStageId) => {
		expect(stageForItem(name, slot)?.id).not.toBe(forbiddenStageId);
	});

	it('keeps Genesis Badge on the badge stage and the Genesis weapon on the weapon stage', () => {
		expect(stageForItem('Genesis Badge', 'badge')?.id).toBe('badge-genesis');
		expect(stageForItem('Genesis Sword', 'weapon')?.id).toBe('weapon-genesis');
	});

	it('refuses to guess when a matcher is ambiguous and no slot is given', () => {
		// "arcane umbra" is claimed by both the weapon stage and the armour stage.
		expect(stageForItem('Arcane Umbra Whatsit')).toBeUndefined();
		// A slot disambiguates it.
		expect(stageForItem('Arcane Umbra Whatsit', 'weapon')?.id).toBe('weapon-arcane');
		expect(stageForItem('Arcane Umbra Whatsit', 'cape')?.id).toBe('armour-outer-arcane');
	});

	it('never lets two stages claim the same slot for the same prefix', () => {
		const seen = new Map<string, string>();
		for (const stage of ALL_STAGES) {
			for (const prefix of stage.match?.prefixes ?? []) {
				for (const slot of stage.match!.slots) {
					const key = `${prefix}|${slot}`;
					const other = seen.get(key);
					expect(other, `"${prefix}" in ${slot} is claimed by both ${other} and ${stage.id}`).toBe(
						undefined
					);
					seen.set(key, stage.id);
				}
			}
		}
	});

	it('never lets two stages claim the same slot as a fallback', () => {
		const seen = new Set<string>();
		for (const stage of ALL_STAGES) {
			if (!stage.match?.slotFallback) continue;
			for (const slot of stage.match.slots) {
				expect(seen.has(slot), `${slot} has two slotFallback stages`).toBe(false);
				seen.add(slot);
			}
		}
	});

	it('only allows a slot fallback where every item in the slot gets identical advice', () => {
		// Secondaries and emblems take no star force and no flames, so "cube it and
		// stop" is true of every item in those slots. Nowhere else qualifies.
		for (const stage of ALL_STAGES) {
			if (!stage.match?.slotFallback) continue;
			expect(stage.match.slots.every((s) => s === 'secondary' || s === 'emblem')).toBe(true);
			expect(stage.stop.stars).toBeUndefined();
			expect(stage.stop.flames).toBe('not-applicable');
		}
	});
});

describe('item names are real', () => {
	// This is the guard against confidently wrong advice. Every concrete item name
	// must exist in the GMS v270 catalogue; the only exceptions are the documented
	// post-v270 names verified against MapleStory Wiki instead.
	const exceptions = new Set(NAMES_NOT_IN_V270_CATALOGUE.map((n) => n.toLowerCase()));

	const concreteNames = ALL_STAGES.flatMap((s) => [
		...(s.nameKind === 'item' ? [s.name] : []),
		...(s.examples ?? [])
	]);

	it('checks a meaningful number of names', () => {
		expect(concreteNames.length).toBeGreaterThan(60);
	});

	it.each(concreteNames)('%s is a real GMS item name', (name) => {
		const known = exceptions.has(name.toLowerCase()) || findByName(name).length > 0;
		expect(
			known,
			`"${name}" is in neither the v270 catalogue nor the documented exception list`
		).toBe(true);
	});

	it('keeps every family stage backed by verified example names', () => {
		for (const stage of ALL_STAGES) {
			if (stage.nameKind !== 'family') continue;
			expect(stage.examples?.length ?? 0, stage.id).toBeGreaterThan(0);
		}
	});
});

describe('gating data joins into the boss table', () => {
	it('resolves every gate boss', () => {
		for (const gate of GEAR_GATES) {
			for (const row of gateRequirements(gate)) {
				expect(row.found, `${gate.tier} -> ${row.bossId}`).toBe(true);
			}
		}
	});

	it('resolves every stage boss id', () => {
		for (const stage of ALL_STAGES) {
			for (const id of stage.bossIds ?? []) {
				expect(getBoss(id), `${stage.id} -> ${id}`).toBeDefined();
			}
		}
	});

	it('carries the four gates that are actually hard, and no range number', () => {
		const arcane = GEAR_GATES.find((g) => g.tier === 'arcane-umbra')!;
		const rows = gateRequirements(arcane);
		const lucid = rows.find((r) => r.bossId === 'normal-lucid')!;
		// Entry level and Arcane Force are in-game hard requirements.
		expect(lucid.entryLevel).toBe(220);
		expect(lucid.force).toEqual({ type: 'arcane', required: 360 });
		// Published minimum Combat Power (advisory), and the 5%-of-HP loot floor.
		expect(lucid.soloCombatPower).toBe(3_500_000);
		expect(lucid.lootContributionHp).toBeCloseTo(24_000_000_000_000 * 0.05, 0);
		expect(lucid.reset).toBe('weekly');
	});

	it('records the AbsoLab -> Arcane gating that makes 17 stars the AbsoLab answer', () => {
		const abso = GEAR_GATES.find((g) => g.tier === 'absolab')!;
		const arcane = GEAR_GATES.find((g) => g.tier === 'arcane-umbra')!;
		// AbsoLab comes from Lomien (entry 190); Arcane from Lucid (entry 220). Thirty
		// levels of the same Arcane River run — which is why "arcanes come too fast".
		const absoEntry = Math.min(...gateRequirements(abso).map((r) => r.entryLevel ?? Infinity));
		const arcaneEntry = Math.min(...gateRequirements(arcane).map((r) => r.entryLevel ?? Infinity));
		expect(absoEntry).toBe(190);
		expect(arcaneEntry).toBe(220);
		expect(arcaneEntry - absoEntry).toBeLessThanOrEqual(30);
	});

	it('keeps the community Kalos CP figure alongside the published floor', () => {
		const eternal = GEAR_GATES.find((g) => g.tier === 'eternal')!;
		const easyKalos = gateRequirements(eternal).find((r) => r.bossId === 'easy-kalos')!;
		expect(easyKalos.soloCombatPower).toBe(35_000_000);
		// UG says "eKalos (80m+ CP at least)" — the published gate is a floor to enter,
		// not a number at which you clear. Both are recorded; neither is invented.
		expect(eternal.communityCombatPower).toBe(80_000_000);
		expect(eternal.communityCombatPower!).toBeGreaterThan(easyKalos.soloCombatPower!);
	});
});

describe('star force reality', () => {
	it('mirrors starforce.ts rather than restating it', () => {
		expect(LAST_STAT_STAR).toBe(starforce.LAST_STAT_STAR);
		expect(THEORETICAL_MAX_STAR).toBe(starforce.maxStars(200));
		expect(SAFEGUARD_CEILING).toBe(Math.max(...starforce.SAFEGUARD_STARS));
	});

	/**
	 * Re-derives STAR_CLIMB_COST from starforce.ts STAR_RATES + TRACE_RECOVERY so the
	 * published numbers cannot drift away from the rate table they came from.
	 *
	 * Model: absorbing Markov chain on star level. Success -> +1 star; maintain ->
	 * stay (post-2025 revamp: failure no longer decreases stars); destroy -> the item
	 * is replaced and restarted from its Equipment Trace star. Enhancement Mode 1, no
	 * Star Catch, Safeguard off. Solved by Gaussian elimination on
	 *   E[s] = 1 + m*E[s] + d*E[trace(s)] + p*E[s+1]      (expected attempts)
	 *   B[s] = d + m*B[s] + d*B[trace(s)] + p*B[s+1]      (expected destructions)
	 * with E[target] = B[target] = 0.
	 */
	function climb(from: number, to: number): { attempts: number; booms: number } {
		const n = to;
		const A: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
		const bA = new Array<number>(n).fill(0);
		const B: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
		const bB = new Array<number>(n).fill(0);

		for (let s = 0; s < n; s++) {
			const { success, maintain, destroy } = starforce.STAR_RATES[s];
			A[s][s] += 1;
			B[s][s] += 1;
			bA[s] = 1;
			bB[s] = destroy;
			A[s][s] -= maintain;
			B[s][s] -= maintain;
			if (destroy > 0) {
				const recovered = starforce.getRecoveredStars(s);
				if (recovered < n) {
					A[s][recovered] -= destroy;
					B[s][recovered] -= destroy;
				}
			}
			if (s + 1 < n) {
				A[s][s + 1] -= success;
				B[s][s + 1] -= success;
			}
		}

		const solve = (M: number[][], rhs: number[]): number[] => {
			const size = rhs.length;
			const aug = M.map((row, i) => [...row, rhs[i]]);
			for (let c = 0; c < size; c++) {
				let pivot = c;
				for (let r = c; r < size; r++) if (Math.abs(aug[r][c]) > Math.abs(aug[pivot][c])) pivot = r;
				[aug[c], aug[pivot]] = [aug[pivot], aug[c]];
				const pv = aug[c][c];
				for (let r = 0; r < size; r++) {
					if (r === c || aug[r][c] === 0) continue;
					const f = aug[r][c] / pv;
					for (let k = c; k <= size; k++) aug[r][k] -= f * aug[c][k];
				}
			}
			return aug.map((row, i) => row[size] / row[i]);
		};

		return { attempts: solve(A, bA)[from], booms: solve(B, bB)[from] };
	}

	it.each(STAR_CLIMB_COST.filter((r) => r.to <= 25))(
		'reproduces $from★ -> $to★ from the rate table',
		(row) => {
			const { attempts, booms } = climb(row.from, row.to);
			// Published to 3 significant figures; allow 2% for that rounding.
			expect(attempts).toBeGreaterThan(row.expectedAttempts * 0.98);
			expect(attempts).toBeLessThan(row.expectedAttempts * 1.02 + 1);
			expect(booms).toBeGreaterThan(row.expectedBooms * 0.9 - 0.05);
			expect(booms).toBeLessThan(row.expectedBooms * 1.1 + 0.05);
		}
	);

	it('shows 30★ is unreachable in any practical sense', () => {
		const to30 = STAR_CLIMB_COST.find((r) => r.to === 30)!;
		expect(to30.from).toBe(22);
		// Roughly 24 million attempts and 1.1 million destroyed copies, in expectation.
		expect(to30.expectedAttempts).toBeGreaterThan(1e7);
		expect(to30.expectedBooms).toBeGreaterThan(1e6);

		const { attempts, booms } = climb(22, 30);
		expect(attempts).toBeGreaterThan(1e7);
		expect(booms).toBeGreaterThan(1e6);

		// And the reason it is never worth chasing: 23★+ grants no class stat.
		expect(starforce.STAT_PER_STAR_16_22['200-249']).toBeGreaterThan(0);
		expect(starforce.LAST_STAT_STAR).toBe(22);
	});

	it('makes 17★ the everyday target because it is the last Safeguard star', () => {
		expect(starforce.safeguardAvailable(17)).toBe(true);
		expect(starforce.safeguardAvailable(18)).toBe(false);
		const cheap = climb(0, 17);
		const expensive = climb(17, 22);
		expect(cheap.booms).toBeLessThan(0.5);
		expect(expensive.booms).toBeGreaterThan(5);
	});
});

describe('investment order', () => {
	it('runs phase 0 through 4 in order', () => {
		expect(INVESTMENT_ORDER.map((p) => p.phase)).toEqual([0, 1, 2, 3, 4]);
		for (const step of INVESTMENT_ORDER) {
			expect(step.actions.length).toBeGreaterThan(0);
			expect(step.sources.length).toBeGreaterThan(0);
		}
	});

	it('puts flames after the cheap star floor, not before', () => {
		expect(INVESTMENT_ORDER[1].actions.join(' ')).toMatch(/No flames yet/i);
		expect(INVESTMENT_ORDER[2].actions.join(' ')).toMatch(/Flames enter here/i);
	});
});

/* -------------------------------------------------------------------------- */
/* Regression: the seeded characters                                           */
/* -------------------------------------------------------------------------- */

/**
 * Walks the real transcribed gear in `data/characters/*.json`.
 *
 * This exists because a name that silently fails to match does not produce an
 * error — it produces a plausible-looking recommendation. `stageForItem` returning
 * `undefined` for "Fafnir Soaring Sword" is what put a 14★ -> 30★ candidate worth
 * 2,275 trillion mesos on the ranked board. This test converts that class of gap
 * from invisible to failing.
 *
 * `data/` is gitignored, so the suite skips cleanly when it is absent rather than
 * failing on a fresh checkout.
 */
describe('seeded characters resolve end to end', () => {
	/**
	 * Slots whose items are CORRECTLY not on any gear path, and why.
	 *
	 * These are not lookup failures — they are equipment the progression model has
	 * nothing to say about, because none of them takes star force, potential or
	 * flames on the damage path. Keep this list short and justified: every entry
	 * added here is a piece of gear the tracker will stop advising on.
	 */
	const SLOTS_NOT_ON_A_PATH: Record<string, string> = {
		medal: 'no star force, no potential, no flames — event/achievement medals only',
		android: 'the android body itself carries no upgrades; the HEART is the modelled slot',
		totem: 'no star force, no potential, no flames'
	};

	/**
	 * Individual items that are correctly not on a path. Event and exclusive-scroll
	 * rings take no ordinary star force at all — `items/rules.ts` classifies them as
	 * `exclusive-scroll-only` or `no-upgrade-slots`.
	 */
	const ITEMS_NOT_ON_A_PATH = new Set(
		[
			'Ring of Restraint',
			'Heroic Awake Ring (Lv. 4)',
			'Awake Ring',
			'Vengeful Ring',
			'Cosmos Ring',
			'Eternal Flame Ring',
			"Libae's Prototype R Ring"
		].map((n) => n.toLowerCase())
	);

	const dir = join(process.cwd(), 'data', 'characters');
	let files: string[] = [];
	try {
		files = readdirSync(dir).filter((f) => f.endsWith('.json'));
	} catch {
		files = [];
	}

	it.runIf(files.length > 0)('found the seeded characters', () => {
		expect(files.length).toBeGreaterThan(0);
	});

	for (const file of files) {
		const doc = JSON.parse(readFileSync(join(dir, file), 'utf8')) as {
			name?: string;
			equipment?: Record<string, { name: string; starforce?: number }>;
		};
		const equipment = Object.entries(doc.equipment ?? {});

		describe(`${doc.name ?? file}`, () => {
			it('has gear to check', () => {
				expect(equipment.length).toBeGreaterThan(10);
			});

			it.each(equipment)('%s: %o resolves to a stage or an allow-list entry', (slotKey, item) => {
				// `ring1..ring4` / `pendant1..2` / `totem1..3` collapse to the slot family.
				const slot = slotKey.replace(/\d+$/, '');
				const allowed =
					slot in SLOTS_NOT_ON_A_PATH || ITEMS_NOT_ON_A_PATH.has(item.name.toLowerCase());
				const stage = stageForItem(item.name, slot as never);
				expect(
					stage !== undefined || allowed,
					`"${item.name}" (${slotKey}) matched no stage and is not on the allow-list. ` +
						`Either add a matcher, or justify it in SLOTS_NOT_ON_A_PATH / ITEMS_NOT_ON_A_PATH.`
				).toBe(true);
			});

			// The concrete bug: an unmatched name let a 30-star target through.
			it.each(equipment)('%s: %o can never be offered a 30-star target', (slotKey, item) => {
				const slot = slotKey.replace(/\d+$/, '');
				const verdict = starTargetVerdict(item.name, 30, slot as never);
				// Known gear lands on the ladder's own suppression verdicts; anything the
				// ladder does not cover still hits the global 22-star ceiling. What must
				// never happen is a 30-star target reading as fine.
				expect(['over-invested', 'impossible', 'above-global-cap']).toContain(verdict.verdict);
			});

			it('never leaves a star-forced item both unmatched and uncapped', () => {
				for (const [slotKey, item] of equipment) {
					if (item.starforce === undefined) continue;
					const slot = slotKey.replace(/\d+$/, '');
					const stage = stageForItem(item.name, slot as never);
					const allowed =
						slot in SLOTS_NOT_ON_A_PATH || ITEMS_NOT_ON_A_PATH.has(item.name.toLowerCase());
					expect(
						stage !== undefined || allowed,
						`"${item.name}" carries ${item.starforce} stars but has no stopping point`
					).toBe(true);
				}
			});
		});
	}
});
