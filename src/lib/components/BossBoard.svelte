<script lang="ts">
	import { onMount } from 'svelte';

	import type { BossAxis, BossBoard, BossRow, BossVerdict } from '$lib/analysis/types';
	import { compact, decimal, humanize, int } from '$lib/ui/format';
	import { rowTier, tierCounts } from '$lib/ui/types';

	let { board, characterId }: { board: BossBoard; characterId: string } = $props();

	const storageKey = $derived(`maple:boss-board:show-early:${characterId}`);

	let showEarly = $state(false);

	onMount(() => {
		try {
			showEarly = localStorage.getItem(storageKey) === '1';
		} catch {
			// Private mode / blocked storage: fall back to the default.
		}
	});

	function setShowEarly(next: boolean) {
		showEarly = next;
		try {
			localStorage.setItem(storageKey, next ? '1' : '0');
		} catch {
			// Ignore — the toggle still works for this page view.
		}
	}

	const counts = $derived(tierCounts(board));
	const rows = $derived(
		board.rows.filter((r) => {
			const tier = rowTier(r);
			if (tier === 'trivial') return false;
			return showEarly || tier !== 'early';
		})
	);

	const VERDICT_LABEL: Record<BossVerdict, string> = {
		comfortable: 'comfortable',
		possible: 'possible',
		minimum: 'minimum',
		'out-of-reach': 'out of reach',
		blocked: 'blocked',
		uncalibrated: 'uncalibrated'
	};

	function axisTitle(axis: BossAxis, calibrated: boolean): string {
		const bits: string[] = [];
		if (axis.ratio !== undefined) bits.push(`ratio ${decimal(axis.ratio)}× the damage needed`);
		if (axis.clearMinutes !== undefined) bits.push(`~${decimal(axis.clearMinutes, 1)} min clear`);
		if (axis.reason) bits.push(axis.reason);
		if (!calibrated) bits.push('DPM model is uncalibrated — treat as indicative only.');
		return bits.join('\n');
	}

	function forceDeficit(row: BossRow): number | undefined {
		const { forceRequired, forceHave } = row.gates;
		if (forceRequired === undefined || forceHave === undefined) return undefined;
		return forceHave - forceRequired;
	}
</script>

<div class="head">
	{#if !board.calibrated}
		<div class="banner">
			<strong>DPM verdicts are uncalibrated.</strong> No class DPM anchor exists yet, so solo /
			party / carried columns are indicative only. The hard gates below them — entry level, force
			multiplier and the 5%-of-HP carry number — are the meaningful numbers.
			{#if board.note}<span class="note">{board.note}</span>{/if}
		</div>
	{:else if board.note}
		<div class="note-line">{board.note}</div>
	{/if}

	<label class="toggle">
		<input
			type="checkbox"
			checked={showEarly}
			onchange={(e) => setShowEarly(e.currentTarget.checked)}
		/>
		Show early bosses
		{#if counts.early}
			<span class="count">({counts.early}{showEarly ? '' : ' hidden'})</span>
		{/if}
	</label>
	<span class="showing"
		>{rows.length} shown{counts.trivial
			? ` · ${counts.trivial} trivial filtered by the engine`
			: ''}</span
	>
</div>

{#snippet verdict(axis: BossAxis, calibrated: boolean)}
	<td class="axis">
		<span
			class="pill {axis.verdict}"
			class:uncal={!calibrated && axis.verdict !== 'blocked'}
			title={axisTitle(axis, calibrated)}
		>
			{VERDICT_LABEL[axis.verdict]}
		</span>
		{#if axis.ratio !== undefined}
			<span class="num ratio">{decimal(axis.ratio, axis.ratio >= 10 ? 0 : 2)}×</span>
		{/if}
		{#if axis.clearMinutes !== undefined}
			<span class="num mins">{decimal(axis.clearMinutes, 1)}m</span>
		{/if}
	</td>
{/snippet}

<table>
	<thead>
		<tr>
			<th>Boss</th>
			<th class="right">Lv</th>
			<th class="right">Total HP</th>
			<th class="right" title="5% of total HP — the damage you must personally deal for loot"
				>Carry (5%)</th
			>
			<th>Force</th>
			<th>Solo</th>
			<th>Party</th>
			<th>Carried</th>
			<th class="right">Crystal</th>
		</tr>
	</thead>
	<tbody>
		{#each rows as row (row.bossId)}
			<tr class:blocked={!row.gates.levelOk} class:early={rowTier(row) === 'early'}>
				<td class="boss">
					<span class="diff">{humanize(row.difficulty)}</span>
					<span class="name">{row.bossName}</span>
					{#if rowTier(row) === 'early'}<span class="tier">early</span>{/if}
					{#if row.notes?.length}<span class="note-mark" title={row.notes.join('\n')}>⚑</span>{/if}
				</td>
				<td
					class="right num"
					class:bad={!row.gates.levelOk}
					title={`entry level ${row.entryLevel}`}
				>
					{row.level}
					<span class="entry">/{row.entryLevel}</span>
				</td>
				<td class="right num">{compact(row.totalHp)}</td>
				<td class="right num">{compact(row.carryDamageRequired)}</td>
				<td class="force num">
					{#if row.gates.forceType === 'none'}
						<span class="dim">none</span>
					{:else}
						{@const deficit = forceDeficit(row)}
						<span class="ftype">{row.gates.forceType === 'arcane' ? 'AF' : 'SF'}</span>
						<span>{int(row.gates.forceHave)}/{int(row.gates.forceRequired)}</span>
						{#if deficit !== undefined && deficit < 0}
							<span class="bad">{int(deficit)}</span>
						{/if}
						{#if row.gates.forceMultiplier !== 1}
							<span
								class:bad={row.gates.forceMultiplier < 1}
								class:good={row.gates.forceMultiplier > 1}
							>
								{decimal(row.gates.forceMultiplier)}×
							</span>
						{/if}
					{/if}
					{#if row.gates.combatPowerOk === false}
						<span class="cp" title="Below the CMS-sourced Combat Power gate — advisory only"
							>CP</span
						>
					{/if}
				</td>
				{@render verdict(row.solo, board.calibrated)}
				{@render verdict(row.party, board.calibrated)}
				{@render verdict(row.carried, board.calibrated)}
				<td class="right num dim">{compact(row.crystalMesos)}</td>
			</tr>
		{/each}
	</tbody>
</table>

{#if !rows.length}
	<p class="empty">
		No boss rows at this tier{counts.early && !showEarly ? ' — try showing early bosses.' : '.'}
	</p>
{/if}

<style>
	.head {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
		margin-bottom: 6px;
	}

	.banner {
		flex-basis: 100%;
		border: 1px solid var(--warn);
		background: #f0b24a14;
		border-radius: var(--radius);
		padding: 6px 8px;
		font-size: 11px;
		color: #f3d6a2;
	}

	.banner strong {
		color: var(--warn);
	}

	.banner .note {
		display: block;
		color: var(--text-dim);
		margin-top: 2px;
	}

	.note-line {
		flex-basis: 100%;
		font-size: 11px;
		color: var(--text-dim);
	}

	.toggle {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 11px;
		color: var(--text-dim);
	}

	.toggle .count {
		color: var(--text-faint);
	}

	.showing {
		margin-left: auto;
		font-size: 10px;
		color: var(--text-faint);
	}

	.boss {
		white-space: nowrap;
	}

	.diff {
		font-size: 10px;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--text-faint);
		margin-right: 5px;
	}

	.tier {
		font-size: 9px;
		text-transform: uppercase;
		color: var(--muted);
		border: 1px solid var(--line);
		border-radius: 2px;
		padding: 0 3px;
		margin-left: 5px;
	}

	.note-mark {
		color: var(--warn);
		margin-left: 4px;
		cursor: help;
	}

	.entry {
		color: var(--text-faint);
		font-size: 10px;
	}

	.force {
		white-space: nowrap;
		font-size: 11px;
		display: flex;
		gap: 5px;
		align-items: baseline;
	}

	.ftype {
		font-size: 9px;
		letter-spacing: 0.06em;
		color: var(--text-faint);
	}

	.cp {
		color: var(--warn);
		font-size: 10px;
		border: 1px solid var(--warn);
		border-radius: 2px;
		padding: 0 3px;
		cursor: help;
	}

	.axis {
		white-space: nowrap;
	}

	.ratio {
		color: var(--text-dim);
		font-size: 10px;
		margin-left: 4px;
	}

	.mins {
		color: var(--text-faint);
		font-size: 10px;
		margin-left: 3px;
	}

	.pill {
		display: inline-block;
		font-size: 10px;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		padding: 0 5px;
		border-radius: 3px;
		border: 1px solid currentColor;
		line-height: 15px;
	}

	.pill.comfortable {
		color: var(--good);
	}
	.pill.possible {
		color: var(--info);
	}
	.pill.minimum {
		color: var(--warn);
	}
	.pill.out-of-reach {
		color: var(--muted);
	}
	.pill.blocked {
		color: #fff;
		background: #7a2020;
		border-color: var(--bad);
	}
	.pill.uncalibrated {
		color: var(--muted);
		border-style: dashed;
	}
	.pill.uncal {
		border-style: dashed;
		opacity: 0.75;
	}

	tr.blocked td {
		background: #ff6b6b0e;
	}

	tr.early td {
		color: var(--text-dim);
	}

	.bad {
		color: var(--bad);
	}
	.good {
		color: var(--good);
	}
	.dim {
		color: var(--text-faint);
	}

	.empty {
		color: var(--text-faint);
	}
</style>
