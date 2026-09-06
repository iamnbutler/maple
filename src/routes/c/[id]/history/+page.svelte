<script lang="ts">
	import HistoryChart from '$lib/components/HistoryChart.svelte';
	import Section from '$lib/components/Section.svelte';
	import { compact, int, since, timestamp } from '$lib/ui/format';
	import type { ChartPoint, HistoryPoint } from '$lib/ui/types';

	let { data } = $props();

	function series(pick: (p: HistoryPoint) => number | undefined): ChartPoint[] {
		return data.points
			.map((p) => ({ at: p.at, value: pick(p) }))
			.filter((p): p is ChartPoint => p.value !== undefined);
	}

	const damage = $derived(series((p) => p.damageIndex ?? p.damageIndexGrandis));
	const arcane = $derived(series((p) => p.damageIndexArcane));
	const cp = $derived(series((p) => p.combatPower));
	const level = $derived(series((p) => p.level));
	const equipped = $derived(series((p) => p.equipped));

	const hasSummary = $derived(damage.length > 0 || cp.length > 0);

	/** Whole-number axis labels, without JavaScript's `-0`. */
	const whole = (n: number) => String(Math.round(n) || 0);
	const missing = $derived(data.points.length - Math.max(damage.length, cp.length));
</script>

<svelte:head><title>{data.character.name} — history</title></svelte:head>

<div class="crumbs">
	<a href="/c/{data.character.id}">← {data.character.name}</a>
	<span class="dim">{data.total} snapshots{data.truncated ? ' (charting the newest 200)' : ''}</span
	>
</div>

{#if !data.points.length}
	<Section title="History" subtitle="nothing recorded yet">
		<p class="dim">
			Snapshots are appended on every write to the character document. Nothing has been written
			since this character was created.
		</p>
	</Section>
{:else}
	<Section
		title="Trends"
		subtitle={hasSummary ? 'from the computed summary in each snapshot' : 'document fields only'}
	>
		{#if !hasSummary}
			<div class="notice">
				No snapshot carries a computed summary, so there is no damage index or Combat Power to
				chart. Everything below comes from the character document itself.
			</div>
		{:else if missing > 0}
			<div class="notice">
				{missing} of {data.points.length} snapshots have no computed summary and are absent from the damage
				/ CP charts.
			</div>
		{/if}

		{#if damage.length}
			<HistoryChart
				title="Damage index"
				points={damage}
				format={(n) => compact(n, 3)}
				note="relative scalar — comparable to itself only"
			/>
		{/if}
		{#if arcane.length}
			<HistoryChart
				title="Damage index (arcane preset)"
				points={arcane}
				color="var(--info)"
				format={(n) => compact(n, 3)}
			/>
		{/if}
		{#if cp.length}
			<HistoryChart title="Combat Power" points={cp} color="var(--warn)" format={(n) => int(n)} />
		{/if}
		<HistoryChart title="Level" points={level} color="var(--good)" format={whole} />
		<HistoryChart title="Equipped slots" points={equipped} color="var(--muted)" format={whole} />
	</Section>

	<Section title="Snapshots" subtitle="newest last">
		<table>
			<thead>
				<tr>
					<th>Taken</th>
					<th>Age</th>
					<th class="right">Level</th>
					<th class="right">Equipped</th>
					<th class="right">Damage index</th>
					<th class="right">Combat Power</th>
					<th>Raw</th>
				</tr>
			</thead>
			<tbody>
				{#each data.points as p (p.ts)}
					<tr>
						<td class="num">{timestamp(p.at)}</td>
						<td class="num dim">{since(p.at)}</td>
						<td class="right num">{p.level}</td>
						<td class="right num">{p.equipped}</td>
						<td class="right num"
							>{p.damageIndex === undefined ? '—' : compact(p.damageIndex, 3)}</td
						>
						<td class="right num">{p.combatPower === undefined ? '—' : int(p.combatPower)}</td>
						<td>
							<a href="/api/characters/{data.character.id}/history/{p.ts}">json</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</Section>
{/if}

<style>
	.crumbs {
		display: flex;
		align-items: baseline;
		gap: 10px;
		margin-bottom: 10px;
		font-size: 12px;
	}

	.dim {
		color: var(--text-faint);
		font-size: 11px;
	}

	.notice {
		border: 1px solid var(--line);
		background: var(--panel-2);
		border-radius: var(--radius);
		padding: 5px 7px;
		margin-bottom: 8px;
		font-size: 11px;
		color: var(--text-dim);
	}
</style>
