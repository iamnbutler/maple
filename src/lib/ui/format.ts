// Display formatting. Pure functions, unit-tested in format.spec.ts.
//
// House rules:
//   * absent (`undefined`) renders as an em dash, never as `0`.
//   * every "...Percent" input is already a WHOLE percent (analysis contract).
//   * big counts (mesos, boss HP, damage index) get SI-style short units so a
//     column of them stays scannable: 22M, 1.66T, 12.09Q.

export const DASH = '—';

const UNITS = ['', 'K', 'M', 'B', 'T', 'Q', 'Qi', 'Sx', 'Sp'] as const;

const GROUPED = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** Trim `toFixed` padding without eating the integer part ("100" stays "100"). */
function fixed(value: number, digits: number): string {
	const s = value.toFixed(digits);
	if (!s.includes('.')) return s;
	return s.replace(/0+$/, '').replace(/\.$/, '');
}

/** `1234567` → `"1,234,567"`. */
export function int(value: number | undefined | null): string {
	if (value == null || !Number.isFinite(value)) return DASH;
	return GROUPED.format(Math.round(value));
}

/**
 * Short-unit form for large magnitudes: `22000000` → `"22M"`,
 * `1.664e12` → `"1.66T"`, `1.209e16` → `"12.09Q"`.
 */
export function compact(value: number | undefined | null, digits = 2): string {
	if (value == null || !Number.isFinite(value)) return DASH;

	const sign = value < 0 ? '-' : '';
	let n = Math.abs(value);
	if (n < 1000) return sign + fixed(n, n < 10 ? digits : 0);

	let unit = 0;
	while (n >= 1000 && unit < UNITS.length - 1) {
		n /= 1000;
		unit += 1;
	}
	// Rounding can push 999.999K to "1000K"; promote it instead.
	if (Number(n.toFixed(digits)) >= 1000 && unit < UNITS.length - 1) {
		n /= 1000;
		unit += 1;
	}
	return `${sign}${fixed(n, digits)}${UNITS[unit]}`;
}

/** Mesos always read better short. */
export function mesos(value: number | undefined | null): string {
	return compact(value);
}

/** A whole percent, e.g. `1.4` → `"1.40%"`. */
export function percent(value: number | undefined | null, digits = 2): string {
	if (value == null || !Number.isFinite(value)) return DASH;
	return `${value.toFixed(digits)}%`;
}

/** A whole percent with an explicit sign, e.g. `1.4` → `"+1.40%"`. */
export function signedPercent(value: number | undefined | null, digits = 2): string {
	if (value == null || !Number.isFinite(value)) return DASH;
	const sign = value > 0 ? '+' : '';
	return `${sign}${value.toFixed(digits)}%`;
}

/** A plain ratio/multiplier, e.g. `1.25` → `"1.25×"`. */
export function multiplier(value: number | undefined | null, digits = 2): string {
	if (value == null || !Number.isFinite(value)) return DASH;
	return `${value.toFixed(digits)}×`;
}

/** A number with a fixed number of decimals, or a dash. */
export function decimal(value: number | undefined | null, digits = 2): string {
	if (value == null || !Number.isFinite(value)) return DASH;
	return value.toFixed(digits);
}

/** Real-world days of daily-gated progress. */
export function days(value: number | undefined | null): string {
	if (value == null || !Number.isFinite(value)) return DASH;
	if (value >= 365) return `${fixed(value / 365, 1)}y`;
	return `${fixed(value, value < 10 ? 1 : 0)}d`;
}

/** `"2026-09-06T12:30:00.000Z"` → `"2026-09-06 12:30"` (UTC, stable across machines). */
export function timestamp(iso: string | undefined | null): string {
	if (!iso) return DASH;
	const ms = Date.parse(iso);
	if (Number.isNaN(ms)) return String(iso);
	return new Date(ms).toISOString().replace('T', ' ').slice(0, 16);
}

/** `"2026-09-06T..."` → `"3d ago"`, relative to `now`. */
export function since(iso: string | undefined | null, now: number = Date.now()): string {
	if (!iso) return DASH;
	const ms = Date.parse(iso);
	if (Number.isNaN(ms)) return String(iso);

	const seconds = Math.round((now - ms) / 1000);
	if (seconds < 0) return 'just now';
	if (seconds < 60) return `${seconds}s ago`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const d = Math.floor(hours / 24);
	if (d < 30) return `${d}d ago`;
	const months = Math.floor(d / 30);
	if (months < 12) return `${months}mo ago`;
	return `${Math.floor(d / 365)}y ago`;
}

/** Star force, e.g. `18` → `"18★"`. Zero stars still render (it is a real value). */
export function stars(value: number | undefined | null): string {
	if (value == null || !Number.isFinite(value)) return '';
	return `${value}★`;
}

/** Title-case a slot/kind id: `"bonus-potential"` → `"Bonus potential"`. */
export function humanize(id: string): string {
	const spaced = id
		.replace(/[-_]+/g, ' ')
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/([a-zA-Z])(\d)/g, '$1 $2')
		.trim();
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
