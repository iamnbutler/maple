<script lang="ts">
	import type { CharacterSummary, NamedTarget } from '$lib/analysis/types';
	import type { Character } from '$lib/schema';
	import { compact, decimal, int, percent, since, timestamp } from '$lib/ui/format';
	import ConfidenceBadge from './ConfidenceBadge.svelte';
	import Metric from './Metric.svelte';

	let {
		character,
		className,
		summary,
		target,
		targets,
		targetId,
		ontarget,
		generatedAt
	}: {
		character: Character;
		className: string;
		summary?: CharacterSummary;
		target?: NamedTarget;
		targets: { id: string; label: string; kind: 'preset' | 'boss' }[];
		targetId: string;
		ontarget: (id: string) => void;
		generatedAt?: string;
	} = $props();

	const presets = $derived(targets.filter((t) => t.kind === 'preset'));
	const bosses = $derived(targets.filter((t) => t.kind === 'boss'));
	const displayed = $derived(character.statWindow?.displayed);
</script>

<header class="head">
	<div class="top">
		<h1>{character.name}</h1>
		<span class="ident">
			{className}
			<span class="sep">·</span>
			<span class="num">Lv {character.level}</span>
			<span class="sep">·</span>
			{character.world}
		</span>

		<div class="spacer"></div>

		<label class="target">
			<span>Target</span>
			<select
				value={targetId}
				onchange={(e) => ontarget(e.currentTarget.value)}
				title="Recomputes the whole analysis against this monster"
			>
				<optgroup label="Presets">
					{#each presets as t (t.id)}
						<option value={t.id}>{t.label}</option>
					{/each}
				</optgroup>
				<optgroup label="Bosses">
					{#each bosses as t (t.id)}
						<option value={t.id}>{t.label}</option>
					{/each}
				</optgroup>
			</select>
		</label>

		<a class="link" href="/c/{character.id}/history">History</a>
	</div>

	{#if summary}
		<div class="metrics">
			<Metric
				label="Damage index @ {targetId}"
				value={compact(summary.damageIndex, 3)}
				sub="arcane {compact(summary.damageIndexArcane, 3)} · grandis {compact(
					summary.damageIndexGrandis,
					3
				)}"
				strong
			/>
			<Metric
				label="Range"
				value="{int(summary.range.min)} – {int(summary.range.max)}"
				sub={displayed?.rangeMax !== undefined
					? `displayed max ${int(displayed.rangeMax)}`
					: 'no displayed range captured'}
			/>
			<Metric
				label="Combat Power"
				value={int(summary.combatPower.value)}
				sub={displayed?.combatPower !== undefined
					? `displayed ${int(displayed.combatPower)}`
					: 'checksum only'}
			>
				{#snippet badge()}
					<ConfidenceBadge
						confidence={summary.combatPower.confidence}
						note={summary.combatPower.note}
						compact
					/>
				{/snippet}
			</Metric>
			<div class="rule"></div>
			<Metric
				label="Main stat"
				value={int(summary.totals.mainStat)}
				sub="sub {int(summary.totals.secondaryStat)}"
			/>
			<Metric
				label="ATT"
				value={int(summary.totals.attack)}
				sub="stat mult {compact(summary.totals.statMultiplier, 3)}"
			/>
			<Metric
				label="Boss / Dmg"
				value="{percent(summary.totals.bossDamagePercent, 0)} / {percent(
					summary.totals.damagePercent,
					0
				)}"
			/>
			<Metric label="Final dmg" value={percent(summary.totals.finalDamagePercent, 0)} />
			<Metric label="IED" value={percent(summary.totals.ignoreDefensePercent, 1)} />
			<Metric
				label="Crit"
				value="{percent(summary.totals.criticalRatePercent, 0)} / {percent(
					summary.totals.criticalDamagePercent,
					0
				)}"
				sub="rate / damage"
			/>
			{#if summary.totals.arcaneForce !== undefined || summary.totals.sacredForce !== undefined}
				<Metric
					label="Force"
					value="{int(summary.totals.arcaneForce ?? 0)} AF / {int(
						summary.totals.sacredForce ?? 0
					)} SF"
				/>
			{/if}
			{#if target}
				<Metric
					label="Target"
					value="{decimal(target.pdr * 100, 0)}% PDR"
					sub="lv {target.level}{target.arcaneReq
						? ` · ${target.arcaneReq} AF`
						: ''}{target.sacredReq ? ` · ${target.sacredReq} SF` : ''}"
				/>
			{/if}
		</div>
	{/if}

	<div class="foot">
		<span>document updated {since(character.updatedAt)}</span>
		<span class="dim">{timestamp(character.updatedAt)}</span>
		{#if generatedAt}
			<span class="sep">·</span>
			<span>analysis {since(generatedAt)}</span>
		{/if}
		{#if character.statWindow}
			<span class="sep">·</span>
			<span>stat window {since(character.statWindow.capturedAt)}</span>
		{:else}
			<span class="sep">·</span>
			<span class="warn">no stat window captured — the analysis has nothing to stand on</span>
		{/if}
	</div>
</header>

<style>
	.head {
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--panel);
		margin-bottom: 12px;
	}

	.top {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 10px;
		border-bottom: 1px solid var(--line);
		background: var(--panel-2);
		flex-wrap: wrap;
	}

	.ident {
		color: var(--text-dim);
		font-size: 12px;
	}

	.sep {
		color: var(--text-faint);
		margin: 0 2px;
	}

	.spacer {
		flex: 1;
	}

	.target {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 11px;
		color: var(--text-faint);
	}

	.target select {
		max-width: 260px;
	}

	.link {
		font-size: 12px;
	}

	.metrics {
		display: flex;
		flex-wrap: wrap;
		align-items: stretch;
		padding: 6px 10px;
		gap: 0 4px;
	}

	.rule {
		width: 1px;
		background: var(--line);
		margin: 2px 10px 2px 4px;
	}

	.foot {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		padding: 4px 10px 6px;
		font-size: 10px;
		color: var(--text-faint);
		border-top: 1px solid var(--line-soft);
	}

	.foot .dim {
		color: #4d5563;
	}

	.warn {
		color: var(--warn);
	}
</style>
