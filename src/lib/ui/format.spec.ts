import { describe, expect, it } from 'vitest';

import {
	DASH,
	compact,
	days,
	decimal,
	humanize,
	int,
	multiplier,
	percent,
	signedPercent,
	since,
	stars,
	timestamp
} from './format';

describe('int', () => {
	it('groups thousands', () => {
		expect(int(1234567)).toBe('1,234,567');
	});

	it('rounds and dashes on absent input', () => {
		expect(int(12.6)).toBe('13');
		expect(int(undefined)).toBe(DASH);
		expect(int(Number.NaN)).toBe(DASH);
	});
});

describe('compact', () => {
	it('renders the units the tool actually shows', () => {
		expect(compact(22_000_000)).toBe('22M');
		expect(compact(1.66e12)).toBe('1.66T');
		expect(compact(1.209e16)).toBe('12.09Q');
		expect(compact(4.5e9)).toBe('4.5B');
	});

	it('leaves small numbers alone and never mangles trailing zeros', () => {
		expect(compact(100)).toBe('100');
		expect(compact(999)).toBe('999');
		expect(compact(1000)).toBe('1K');
		expect(compact(7.5)).toBe('7.5');
	});

	it('promotes a value that rounds up into the next unit', () => {
		expect(compact(999_999_999)).toBe('1B');
	});

	it('keeps the sign and dashes on absent input', () => {
		expect(compact(-2_500_000)).toBe('-2.5M');
		expect(compact(undefined)).toBe(DASH);
	});
});

describe('percent helpers', () => {
	it('formats whole percents', () => {
		expect(percent(1.4)).toBe('1.40%');
		expect(signedPercent(1.4)).toBe('+1.40%');
		expect(signedPercent(-0.5)).toBe('-0.50%');
		expect(signedPercent(0)).toBe('0.00%');
		expect(percent(undefined)).toBe(DASH);
	});

	it('formats multipliers and decimals', () => {
		expect(multiplier(1.25)).toBe('1.25×');
		expect(decimal(0.5, 1)).toBe('0.5');
		expect(decimal(null)).toBe(DASH);
	});
});

describe('days', () => {
	it('abbreviates long horizons', () => {
		expect(days(6)).toBe('6d');
		expect(days(45)).toBe('45d');
		expect(days(730)).toBe('2y');
		expect(days(undefined)).toBe(DASH);
	});
});

describe('time', () => {
	it('formats an ISO timestamp to minutes', () => {
		expect(timestamp('2026-09-06T12:30:45.000Z')).toBe('2026-09-06 12:30');
		expect(timestamp(undefined)).toBe(DASH);
	});

	it('formats relative ages', () => {
		const now = Date.parse('2026-09-06T12:00:00.000Z');
		expect(since('2026-09-06T11:59:30.000Z', now)).toBe('30s ago');
		expect(since('2026-09-06T09:00:00.000Z', now)).toBe('3h ago');
		expect(since('2026-09-03T12:00:00.000Z', now)).toBe('3d ago');
		expect(since(undefined, now)).toBe(DASH);
	});
});

describe('labels', () => {
	it('renders star force and humanised ids', () => {
		expect(stars(18)).toBe('18★');
		expect(stars(undefined)).toBe('');
		expect(humanize('bonus-potential')).toBe('Bonus potential');
		expect(humanize('ring1')).toBe('Ring 1');
		expect(humanize('hyperStats')).toBe('Hyper Stats');
	});
});
