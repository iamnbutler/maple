import { describe, expect, it } from 'vitest';

import {
	ARCANE_FORCE_MAX_FROM_SYMBOLS,
	ARCANE_FORCE_PRACTICAL_MAX,
	ARCANE_MAIN_STAT_MAX_FROM_SYMBOLS,
	ARCANE_REGIONS,
	ARCANE_SYMBOLS_TO_MAX,
	ARCANE_SYMBOLS_TO_MAX_ALL_REGIONS,
	arcaneDaysToReach,
	arcaneDemonAvengerHp,
	arcaneForce,
	arcaneMainStat,
	arcaneMesoToNextLevel,
	arcaneMesoToReach,
	arcaneSymbolsPerWeek,
	arcaneSymbolsToNextLevel,
	arcaneSymbolsToReach,
	arcaneXenonStatEach,
	GRAND_SACRED_REGIONS,
	grandSacredDropPercent,
	grandSacredExpPercent,
	grandSacredMesoPercent,
	SACRED_FORCE_PRACTICAL_MAX,
	SACRED_MAX_LEVEL_BONUS,
	SACRED_REGIONS,
	SACRED_SYMBOLS_TO_MAX,
	sacredDaysToReach,
	sacredForce,
	sacredMainStat,
	sacredMesoToNextLevel,
	sacredMesoToReach,
	sacredSymbolsToNextLevel,
	sacredSymbolsToReach,
	SYMBOL_RATE_SETS,
	type ArcaneRegion
} from './symbols';

describe('Arcane symbols', () => {
	// formulas.md §4B §3 A.2
	it('gives 30 Arcane Force at Lv1 and 220 at Lv20', () => {
		expect(arcaneForce(1)).toBe(30);
		expect(arcaneForce(20)).toBe(220);
		expect(arcaneForce(0)).toBe(0);
	});

	it('gives 300 main stat at Lv1 and 2,200 at Lv20', () => {
		expect(arcaneMainStat(1)).toBe(300);
		expect(arcaneMainStat(20)).toBe(2200);
		expect(arcaneDemonAvengerHp(1)).toBe(6300);
		expect(arcaneDemonAvengerHp(20)).toBe(46_200);
		expect(arcaneXenonStatEach(1)).toBe(144);
		expect(arcaneXenonStatEach(20)).toBe(1056);
	});

	it('caps at 1,320 AF / 13,200 main stat across six maxed symbols', () => {
		expect(arcaneForce(20) * 6).toBe(ARCANE_FORCE_MAX_FROM_SYMBOLS);
		expect(arcaneMainStat(20) * 6).toBe(ARCANE_MAIN_STAT_MAX_FROM_SYMBOLS);
		expect(ARCANE_FORCE_PRACTICAL_MAX).toBe(1320 + 100 + 30); // + hyper stat + guild skill
	});

	// formulas.md §4B §3 A.3 — symbols per level-up = L² + 11
	it('matches the published symbol-count table', () => {
		const perLevel = [
			12, 15, 20, 27, 36, 47, 60, 75, 92, 111, 132, 155, 180, 207, 236, 267, 300, 335, 372
		];
		expect(perLevel.map((_, i) => arcaneSymbolsToNextLevel(i + 1))).toEqual(perLevel);
		expect(arcaneSymbolsToReach(20)).toBe(ARCANE_SYMBOLS_TO_MAX);
		expect(ARCANE_SYMBOLS_TO_MAX).toBe(2679);
		expect(ARCANE_SYMBOLS_TO_MAX_ALL_REGIONS).toBe(2679 * 6);
		expect(arcaneSymbolsToNextLevel(20)).toBe(0); // capped
	});

	// formulas.md §4B §3 A.4 — integer arithmetic avoids the float off-by-10,000
	it('matches the published Vanishing Journey meso table', () => {
		expect(arcaneMesoToNextLevel(1, 'vanishing_journey')).toBe(970_000);
		expect(arcaneMesoToNextLevel(2, 'vanishing_journey')).toBe(1_230_000); // float math gives 1,220,000
		expect(arcaneMesoToNextLevel(10, 'vanishing_journey')).toBe(9_990_000);
		expect(arcaneMesoToNextLevel(19, 'vanishing_journey')).toBe(36_820_000);
		expect(arcaneMesoToReach(20, 'vanishing_journey')).toBe(252_470_000);
	});

	it('matches the published totals for every region', () => {
		const totals: Record<ArcaneRegion, number> = {
			vanishing_journey: 252_470_000,
			chu_chu_island: 306_050_000,
			lachelein: 359_630_000,
			arcana: 413_210_000,
			morass: 466_790_000,
			esfera: 520_370_000
		};
		for (const [region, total] of Object.entries(totals)) {
			expect(arcaneMesoToReach(20, region as ArcaneRegion)).toBe(total);
		}
		const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);
		expect(grandTotal).toBe(2_318_520_000);
		expect(arcaneMesoToNextLevel(1, 'esfera')).toBe(2_170_000);
		expect(arcaneMesoToNextLevel(19, 'esfera')).toBe(74_020_000);
	});

	it('knows the GMS region names and unlock levels', () => {
		expect(ARCANE_REGIONS.vanishing_journey.unlockLevel).toBe(200);
		expect(ARCANE_REGIONS.esfera.name).toBe('Esfera');
		expect(ARCANE_REGIONS.lachelein.weeklyContent).toBe('Midnight Chaser');
	});
});

describe('Sacred symbols', () => {
	// formulas.md §4B §3 B.2
	it('gives 10 Sacred Force per level and 110 at Lv11', () => {
		expect(sacredForce(1)).toBe(10);
		expect(sacredForce(11)).toBe(110);
		expect(sacredMainStat(1)).toBe(500);
		expect(sacredMainStat(11)).toBe(2500);
	});

	it('caps at 660 SAC from six symbols, 880 including both Grand symbols', () => {
		expect(sacredForce(11) * 6).toBe(660);
		expect(SACRED_FORCE_PRACTICAL_MAX).toBe(880);
	});

	it('grants the Lv11 EXP and region-boss bonuses', () => {
		expect(SACRED_MAX_LEVEL_BONUS).toEqual({ expPercent: 10, bossDamagePercent: 20 });
		expect(SACRED_REGIONS.cernium.maxLevelBoss).toBe('Chosen Seren');
		expect(SACRED_REGIONS.carcion.maxLevelBoss).toBe('Limbo');
	});

	// formulas.md §4B §3 B.3 — symbols per level-up = 9L² + 20L
	it('matches the published symbol-count table', () => {
		const perLevel = [29, 76, 141, 224, 325, 444, 581, 736, 909, 1100];
		expect(perLevel.map((_, i) => sacredSymbolsToNextLevel(i + 1))).toEqual(perLevel);
		expect(sacredSymbolsToReach(11)).toBe(SACRED_SYMBOLS_TO_MAX);
		expect(SACRED_SYMBOLS_TO_MAX).toBe(4565);
	});

	it('matches the published meso totals', () => {
		expect(sacredMesoToNextLevel(1, 'cernium')).toBe(36_500_000);
		expect(sacredMesoToNextLevel(10, 'cernium')).toBe(792_000_000);
		expect(sacredMesoToReach(11, 'cernium')).toBe(3_930_100_000);
		expect(sacredMesoToReach(11, 'arcus')).toBe(4_751_600_000);
		expect(sacredMesoToReach(11, 'odium')).toBe(5_573_300_000);
		expect(sacredMesoToReach(11, 'shangri_la')).toBe(6_395_000_000);
		expect(sacredMesoToReach(11, 'arteria')).toBe(7_216_900_000);
		expect(sacredMesoToReach(11, 'carcion')).toBe(8_038_600_000);
		expect(sacredMesoToReach(11, 'tallahart')).toBe(16_072_800_000);
		expect(sacredMesoToReach(11, 'geardock')).toBe(20_181_300_000);
	});
});

describe('Grand Sacred symbols', () => {
	// formulas.md §4B §3 C.2 — no main stat at all
	it('gives force plus EXP/meso/drop percentages', () => {
		expect(sacredForce(11)).toBe(110);
		expect(grandSacredExpPercent(1)).toBe(10);
		expect(grandSacredExpPercent(11)).toBe(50);
		expect(grandSacredMesoPercent(1)).toBe(5);
		expect(grandSacredMesoPercent(11)).toBe(15);
		expect(grandSacredDropPercent(11)).toBe(15);
	});

	it('unlocks at 290 / 295 and maps to Baldrix / Jupiter', () => {
		expect(GRAND_SACRED_REGIONS.tallahart.unlockLevel).toBe(290);
		expect(GRAND_SACRED_REGIONS.geardock.unlockLevel).toBe(295);
		expect(GRAND_SACRED_REGIONS.tallahart.maxLevelBoss).toBe('Baldrix');
		expect(GRAND_SACRED_REGIONS.geardock.maxLevelBoss).toBe('Jupiter');
	});
});

describe('acquisition rates and time-to-max', () => {
	// formulas.md §4B §3 A.5, B.4, E — the 2026-09-09 GMS rate change
	it('doubles Arcane rewards and adds 50% to Sacred dailies after 2026-09-09', () => {
		const before = SYMBOL_RATE_SETS.gms_pre_2026_09_09;
		const after = SYMBOL_RATE_SETS.gms_post_2026_09_09;
		expect(after.arcaneDaily).toBe(before.arcaneDaily * 2);
		expect(after.arcaneWeeklyPerClear).toBe(before.arcaneWeeklyPerClear * 2);
		expect(after.sacredDaily).toBe(15);
		expect(after.sacredDailyCernium).toBe(30);
		expect(SYMBOL_RATE_SETS.post_overdrive.arcaneWeeklyClears).toBe(1);
		expect(SYMBOL_RATE_SETS.post_overdrive.arcaneWeeklyPerClear).toBe(240);
	});

	it('yields 260 Arcane symbols/week now and 520/week after the change', () => {
		expect(arcaneSymbolsPerWeek('lachelein')).toBe(20 * 7 + 40 * 3);
		expect(arcaneSymbolsPerWeek('lachelein', { rateSet: 'gms_post_2026_09_09' })).toBe(
			40 * 7 + 80 * 3
		);
		// Overdrive keeps the same weekly total with a single weekly clear
		expect(arcaneSymbolsPerWeek('lachelein', { rateSet: 'post_overdrive' })).toBe(520);
		// VJ / Chu Chu pay half the daily until the side-area quest is done
		expect(arcaneSymbolsPerWeek('vanishing_journey', { sideAreaUnlocked: false })).toBe(
			10 * 7 + 120
		);
	});

	it('takes ~10.3 weeks per Arcane region at current GMS rates', () => {
		const days = arcaneDaysToReach('lachelein', 1, 20);
		expect(days).toBe(73); // 2,679 / 260 = 10.30 weeks = 72.1 days, rounded up
		expect(arcaneDaysToReach('lachelein', 1, 20, { rateSet: 'gms_post_2026_09_09' })).toBe(37);
		expect(arcaneDaysToReach('lachelein', 5, 5)).toBe(0);
	});

	it('matches the published Sacred time-to-max figures', () => {
		expect(sacredDaysToReach('cernium', 1, 11)).toBe(229); // 4,565 / 20
		expect(sacredDaysToReach('odium', 1, 11)).toBe(457); // 4,565 / 10
		expect(sacredDaysToReach('cernium', 1, 11, { rateSet: 'gms_post_2026_09_09' })).toBe(153);
		expect(sacredDaysToReach('odium', 1, 11, { rateSet: 'gms_post_2026_09_09' })).toBe(305);
		expect(sacredDaysToReach('tallahart', 1, 11)).toBe(457);
	});
});
