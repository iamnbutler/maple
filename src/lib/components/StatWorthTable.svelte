<script lang="ts">
	import type { StatWorth } from '$lib/analysis/types';
	import { decimal, int, signedPercent } from '$lib/ui/format';
	import { describeDelta } from '$lib/ui/delta';

	let { rows }: { rows: StatWorth[] } = $props();

	const maxGain = $derived(Math.max(1e-9, ...rows.map((r) => r.gainPercent)));
</script>

<table>
	<thead>
		<tr>
			<th>Worth</th>
			<th>Delta</th>
			<th class="right">Boss dmg</th>
			<th class="right" title="Main stat that buys the same gain right now">Main-stat eq.</th>
		</tr>
	</thead>
	<tbody>
		{#each rows as row (row.label)}
			<tr>
				<td>{row.label}</td>
				<td class="dim">{describeDelta(row.delta)}</td>
				<td class="right num gain">
					<span class="bar" style:--w="{Math.min(100, (row.gainPercent / maxGain) * 100)}%"></span>
					<span>{signedPercent(row.gainPercent, row.gainPercent < 0.1 ? 3 : 2)}</span>
				</td>
				<td class="right num">
					{row.mainStatEquivalent === undefined
						? '—'
						: row.mainStatEquivalent >= 10
							? int(row.mainStatEquivalent)
							: decimal(row.mainStatEquivalent, 1)}
				</td>
			</tr>
		{/each}
	</tbody>
</table>

{#if !rows.length}
	<p class="empty">No stat-worth rows.</p>
{/if}

<style>
	.dim {
		color: var(--text-faint);
		font-size: 11px;
	}

	.gain {
		position: relative;
		white-space: nowrap;
	}

	.gain .bar {
		position: absolute;
		left: 0;
		top: 3px;
		bottom: 3px;
		width: var(--w);
		background: #58d38a1f;
		border-right: 1px solid #58d38a55;
	}

	.gain span:last-child {
		position: relative;
	}

	.empty {
		color: var(--text-faint);
	}
</style>
