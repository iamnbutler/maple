<script lang="ts">
	import type { Calibration, Checksum } from '$lib/analysis/types';
	import { decimal, int, signedPercent } from '$lib/ui/format';

	let { calibration }: { calibration: Calibration } = $props();

	const mismatches = $derived(calibration.checksums.filter((c) => c.status === 'mismatch'));

	const STATUS_LABEL: Record<Checksum['status'], string> = {
		match: 'match',
		close: 'close',
		mismatch: 'MISMATCH',
		missing: 'not captured'
	};

	/** Checksums are big absolute numbers; keep them grouped, not abbreviated. */
	function value(n: number | undefined): string {
		if (n === undefined) return '—';
		return Math.abs(n) >= 1000 ? int(n) : decimal(n, 2);
	}
</script>

{#if mismatches.length}
	<div class="banner">
		<strong
			>{mismatches.length} checksum {mismatches.length === 1 ? 'mismatch' : 'mismatches'}</strong
		>
		— a captured number disagrees with what the engine reproduces. Re-read the stat window or the item
		tooltip behind
		{mismatches.map((m) => m.label).join(', ')}.
	</div>
{/if}

<div class="cols">
	<div>
		<h3>Checksums — computed vs displayed</h3>
		<table>
			<thead>
				<tr>
					<th></th>
					<th class="right">Computed</th>
					<th class="right">Displayed</th>
					<th class="right">Δ</th>
					<th>Status</th>
				</tr>
			</thead>
			<tbody>
				{#each calibration.checksums as c (c.label)}
					<tr class={c.status}>
						<td>{c.label}</td>
						<td class="right num">{value(c.computed)}</td>
						<td class="right num">{value(c.displayed)}</td>
						<td class="right num"
							>{c.deltaPercent === undefined ? '—' : signedPercent(c.deltaPercent)}</td
						>
						<td><span class="pill {c.status}">{STATUS_LABEL[c.status]}</span></td>
					</tr>
				{/each}
			</tbody>
		</table>
		{#if !calibration.checksums.length}
			<p class="empty">No checksums — capture <code>statWindow.displayed</code> to enable them.</p>
		{/if}
	</div>

	<div>
		<h3>Gear residual — what gear does not explain</h3>
		<table>
			<thead>
				<tr>
					<th></th>
					<th class="right">Gear</th>
					<th class="right">Stat window</th>
					<th class="right">Residual</th>
					<th class="right">Share</th>
				</tr>
			</thead>
			<tbody>
				{#each calibration.residuals as r (r.stat)}
					<tr>
						<td>{r.stat}</td>
						<td class="right num">{value(r.fromGear)}</td>
						<td class="right num">{value(r.fromStatWindow)}</td>
						<td class="right num" class:negative={r.residual < 0}>{value(r.residual)}</td>
						<td class="right num dim">
							{r.fromStatWindow ? `${((r.residual / r.fromStatWindow) * 100).toFixed(0)}%` : '—'}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<p class="foot">
			Residual is the class / link / legion / buff contribution. Negative means gear claims more
			than the stat window shows — that is a capture error, not a baseline.
		</p>
	</div>
</div>

{#if calibration.warnings.length}
	<h3>Warnings</h3>
	<ul class="warnings">
		{#each calibration.warnings as w, i (i)}
			<li>{w}</li>
		{/each}
	</ul>
{/if}

<style>
	.banner {
		border: 1px solid var(--bad);
		background: #ff6b6b1a;
		color: #ffc9c9;
		border-radius: var(--radius);
		padding: 6px 8px;
		margin-bottom: 8px;
		font-size: 12px;
	}

	.banner strong {
		color: var(--bad);
	}

	.cols {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
		gap: 14px;
	}

	h3 {
		margin-bottom: 4px;
	}

	.pill {
		display: inline-block;
		font-size: 10px;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		padding: 0 5px;
		border-radius: 3px;
		border: 1px solid currentColor;
		line-height: 15px;
	}

	.pill.match {
		color: var(--good);
	}
	.pill.close {
		color: var(--warn);
	}
	.pill.missing {
		color: var(--muted);
	}
	.pill.mismatch {
		color: #fff;
		background: var(--bad);
		border-color: var(--bad);
		font-weight: 700;
	}

	tr.mismatch td {
		background: #ff6b6b16;
	}

	.negative {
		color: var(--bad);
	}

	.dim {
		color: var(--text-faint);
	}

	.foot,
	.empty {
		font-size: 10px;
		color: var(--text-faint);
		margin: 4px 0 0;
	}

	.warnings {
		margin: 0;
		padding-left: 16px;
		font-size: 11px;
		color: var(--warn);
	}
</style>
