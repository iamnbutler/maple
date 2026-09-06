<script lang="ts">
	import type { ChartPoint } from '$lib/ui/types';

	let {
		title,
		points,
		color = 'var(--accent)',
		format,
		note
	}: {
		title: string;
		points: ChartPoint[];
		color?: string;
		format: (n: number) => string;
		note?: string;
	} = $props();

	const W = 640;
	const H = 150;
	const PAD = { top: 10, right: 8, bottom: 18, left: 62 };

	const parsed = $derived(
		points
			.map((p) => ({ t: Date.parse(p.at), value: p.value, at: p.at }))
			.filter((p) => Number.isFinite(p.t) && Number.isFinite(p.value))
			.sort((a, b) => a.t - b.t)
	);

	const bounds = $derived.by(() => {
		if (!parsed.length) return { minT: 0, maxT: 1, minY: 0, maxY: 1 };
		const ts = parsed.map((p) => p.t);
		const ys = parsed.map((p) => p.value);
		let minY = Math.min(...ys);
		let maxY = Math.max(...ys);
		if (minY === maxY) {
			// A flat series still needs a band; keep it tight so integer metrics
			// (level, slot counts) do not get absurd axis labels.
			const pad = Math.max(1, Math.abs(minY) * 0.005);
			minY -= pad;
			maxY += pad;
		} else {
			const pad = (maxY - minY) * 0.08;
			minY -= pad;
			maxY += pad;
		}
		const minT = Math.min(...ts);
		const maxT = Math.max(...ts);
		return { minT, maxT: maxT === minT ? minT + 1 : maxT, minY, maxY };
	});

	function x(t: number): number {
		const { minT, maxT } = bounds;
		return PAD.left + ((t - minT) / (maxT - minT)) * (W - PAD.left - PAD.right);
	}

	function y(v: number): number {
		const { minY, maxY } = bounds;
		return H - PAD.bottom - ((v - minY) / (maxY - minY)) * (H - PAD.top - PAD.bottom);
	}

	const path = $derived(
		parsed.map((p) => `${x(p.t).toFixed(2)},${y(p.value).toFixed(2)}`).join(' ')
	);

	const ticks = $derived.by(() => {
		const { minY, maxY } = bounds;
		return [0, 0.5, 1].map((f) => {
			const value = minY + (maxY - minY) * f;
			return { value, y: y(value) };
		});
	});

	function day(iso: string): string {
		return iso.slice(0, 10);
	}
</script>

<figure>
	<figcaption>
		<span class="title" style:--c={color}>{title}</span>
		{#if parsed.length}
			<span class="latest num">{format(parsed[parsed.length - 1].value)}</span>
		{/if}
		{#if note}<span class="note">{note}</span>{/if}
	</figcaption>

	{#if parsed.length < 1}
		<p class="empty">No data in these snapshots.</p>
	{:else}
		<svg viewBox="0 0 {W} {H}" width="100%" role="img" aria-label={title}>
			{#each ticks as tick (tick.value)}
				<line x1={PAD.left} x2={W - PAD.right} y1={tick.y} y2={tick.y} class="grid" />
				<text x={PAD.left - 6} y={tick.y + 3} class="axis" text-anchor="end">
					{format(tick.value)}
				</text>
			{/each}

			{#if parsed.length > 1}
				<polyline points={path} fill="none" stroke={color} stroke-width="1.5" />
			{/if}

			{#each parsed as p (p.at)}
				<circle cx={x(p.t)} cy={y(p.value)} r="2.5" fill={color}>
					<title>{p.at} — {format(p.value)}</title>
				</circle>
			{/each}

			<text x={PAD.left} y={H - 5} class="axis">{day(parsed[0].at)}</text>
			{#if parsed.length > 1}
				<text x={W - PAD.right} y={H - 5} class="axis" text-anchor="end">
					{day(parsed[parsed.length - 1].at)}
				</text>
			{/if}
		</svg>
	{/if}
</figure>

<style>
	figure {
		margin: 0 0 10px;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--panel-2);
		padding: 6px 8px 2px;
	}

	figcaption {
		display: flex;
		align-items: baseline;
		gap: 8px;
		margin-bottom: 2px;
	}

	.title {
		font-size: 11px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--c);
	}

	.latest {
		font-size: 13px;
	}

	.note {
		margin-left: auto;
		font-size: 10px;
		color: var(--text-faint);
	}

	svg {
		display: block;
		font-family: var(--mono);
	}

	.grid {
		stroke: var(--line);
		stroke-width: 1;
	}

	.axis {
		fill: var(--text-faint);
		font-size: 9px;
	}

	.empty {
		color: var(--text-faint);
		font-size: 11px;
	}
</style>
