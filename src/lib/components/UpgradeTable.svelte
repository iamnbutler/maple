<script lang="ts">
	import type { RankedUpgrade } from '$lib/analysis/types';
	import { compact, days as fmtDays, decimal, humanize, int, signedPercent } from '$lib/ui/format';
	import { SLOT_LABELS } from '$lib/ui/slots';
	import type { Slot } from '$lib/schema';
	import ConfidenceBadge from './ConfidenceBadge.svelte';

	let { upgrades }: { upgrades: RankedUpgrade[] } = $props();

	type Mode = 'gain' | 'mesos' | 'days';

	let mode = $state<Mode>('gain');
	let grouped = $state(false);

	const MODES: { id: Mode; label: string }[] = [
		{ id: 'gain', label: 'Gain %' },
		{ id: 'mesos', label: 'Gain / 1B mesos' },
		{ id: 'days', label: 'Gain / day' }
	];

	function sortKey(u: RankedUpgrade, m: Mode): number | undefined {
		if (m === 'gain') return u.gainPercent;
		if (m === 'mesos') return u.gainPerBillionMesos;
		return u.gainPerDay;
	}

	function compare(a: RankedUpgrade, b: RankedUpgrade, m: Mode): number {
		const av = sortKey(a, m) ?? Number.NEGATIVE_INFINITY;
		const bv = sortKey(b, m) ?? Number.NEGATIVE_INFINITY;
		if (av !== bv) return bv - av;
		return b.gainPercent - a.gainPercent;
	}

	const sorted = $derived([...upgrades].sort((a, b) => compare(a, b, mode)));
	const best = $derived(sorted[0]);
	const maxGain = $derived(Math.max(1e-9, ...upgrades.map((u) => u.gainPercent)));

	function groupLabel(u: RankedUpgrade): string {
		if (u.slot) return SLOT_LABELS[u.slot as Slot] ?? humanize(u.slot);
		return humanize(u.kind);
	}

	const groups = $derived.by(() => {
		const byLabel = new Map<string, RankedUpgrade[]>();
		for (const u of sorted) {
			const label = groupLabel(u);
			const list = byLabel.get(label);
			if (list) list.push(u);
			else byLabel.set(label, [u]);
		}
		// Groups follow the sorted order of their own best row.
		return [...byLabel.entries()].map(([label, rows]) => ({ label, rows }));
	});

	function costCell(u: RankedUpgrade): string {
		const parts: string[] = [];
		if (u.cost.mesos !== undefined) parts.push(`${compact(u.cost.mesos)} mesos`);
		if (u.cost.days !== undefined) parts.push(fmtDays(u.cost.days));
		if (u.cost.points !== undefined) parts.push(`${int(u.cost.points)} pts`);
		return parts.length ? parts.join(' · ') : '—';
	}

	function perCost(u: RankedUpgrade): string {
		if (mode === 'days') return u.gainPerDay === undefined ? '—' : `${decimal(u.gainPerDay)}%/d`;
		return u.gainPerBillionMesos === undefined ? '—' : `${decimal(u.gainPerBillionMesos)}%/B`;
	}
</script>

<div class="controls">
	<span class="label">Sort</span>
	{#each MODES as m (m.id)}
		<button type="button" class:active={mode === m.id} onclick={() => (mode = m.id)}>
			{m.label}
		</button>
	{/each}
	<label class="check">
		<input type="checkbox" bind:checked={grouped} />
		Group by slot
	</label>
	<span class="count">{upgrades.length} candidates</span>
</div>

{#snippet row(u: RankedUpgrade, isBest: boolean, isGroupBest: boolean)}
	<tr class:best={isBest} class:groupbest={isGroupBest && !isBest}>
		<td class="what">
			<div class="line">
				{#if isBest}<span class="tag">best</span>{/if}
				<span class="label">{u.label}</span>
			</div>
			<div class="sub">
				<span class="kind">{humanize(u.kind)}</span>
				{#if u.detail}<span>{u.detail}</span>{/if}
				{#if u.notes?.length}<span class="note" title={u.notes.join('\n')}>⚑ {u.notes[0]}</span
					>{/if}
			</div>
		</td>
		<td class="right num gain">
			<span class="bar" style:--w="{Math.min(100, (u.gainPercent / maxGain) * 100)}%"></span>
			<span>{signedPercent(u.gainPercent)}</span>
		</td>
		<td class="right num dim" title={u.cost.note ?? ''}>{costCell(u)}</td>
		<td class="right num">{perCost(u)}</td>
		<td><ConfidenceBadge confidence={u.confidence} compact /></td>
	</tr>
{/snippet}

<table>
	<thead>
		<tr>
			<th>Upgrade</th>
			<th class="right">Gain</th>
			<th class="right">Cost</th>
			<th class="right">{mode === 'days' ? 'Gain / day' : 'Gain / 1B'}</th>
			<th>Conf.</th>
		</tr>
	</thead>
	{#if grouped}
		{#each groups as group (group.label)}
			<tbody>
				<tr class="grouphead">
					<td colspan="5">{group.label}</td>
				</tr>
				{#each group.rows as u, i (u.id)}
					{@render row(u, u.id === best?.id, i === 0)}
				{/each}
			</tbody>
		{/each}
	{:else}
		<tbody>
			{#each sorted as u (u.id)}
				{@render row(u, u.id === best?.id, false)}
			{/each}
		</tbody>
	{/if}
</table>

{#if !upgrades.length}
	<p class="empty">No candidates generated.</p>
{/if}

<style>
	.controls {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 6px;
		flex-wrap: wrap;
	}

	.controls > .label {
		font-size: 10px;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--text-faint);
	}

	.controls button {
		padding: 2px 7px;
		font-size: 11px;
		background: var(--panel-2);
	}

	.controls button.active {
		background: var(--accent-dim);
		border-color: var(--accent);
		color: #fff;
	}

	.check {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 11px;
		color: var(--text-dim);
		margin-left: 6px;
	}

	.count {
		margin-left: auto;
		font-size: 11px;
		color: var(--text-faint);
	}

	.what .line {
		display: flex;
		align-items: baseline;
		gap: 6px;
	}

	.what .label {
		font-size: 12px;
	}

	.tag {
		font-size: 9px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		background: var(--accent);
		color: #06202a;
		border-radius: 2px;
		padding: 0 4px;
		font-weight: 700;
	}

	.sub {
		display: flex;
		gap: 8px;
		font-size: 10px;
		color: var(--text-faint);
		flex-wrap: wrap;
	}

	.kind {
		color: var(--text-dim);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.note {
		color: var(--warn);
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
		background: #58c8e820;
		border-right: 1px solid #58c8e850;
		pointer-events: none;
	}

	.gain span:last-child {
		position: relative;
	}

	tr.best td {
		background: #58c8e814;
	}

	tr.best td:first-child {
		box-shadow: inset 2px 0 0 var(--accent);
	}

	tr.best .gain {
		color: var(--accent);
		font-size: 14px;
	}

	tr.groupbest td:first-child {
		box-shadow: inset 2px 0 0 var(--accent-dim);
	}

	.grouphead td {
		font-size: 10px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-dim);
		background: var(--panel-2);
		padding-top: 5px;
	}

	.dim {
		color: var(--text-dim);
	}

	.empty {
		color: var(--text-faint);
	}
</style>
