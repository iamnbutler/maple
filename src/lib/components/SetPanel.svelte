<script lang="ts">
	import type { SetProgress } from '$lib/analysis/sets';
	import { SLOT_LABELS } from '$lib/ui/slots';
	import type { Slot } from '$lib/schema';

	let { sets }: { sets: SetProgress[] } = $props();

	/** Effect keys worth showing, in the order the in-game panel lists them. */
	const LABELS: [keyof NonNullable<SetProgress['nextEffect']>, string, boolean][] = [
		['allStat', 'All Stats', false],
		['str', 'STR', false],
		['dex', 'DEX', false],
		['int', 'INT', false],
		['luk', 'LUK', false],
		['att', 'ATT', false],
		['matt', 'MATT', false],
		['maxHp', 'Max HP', false],
		['maxMp', 'Max MP', false],
		['maxHpPct', 'Max HP', true],
		['maxMpPct', 'Max MP', true],
		['def', 'DEF', false],
		['critRatePct', 'Crit Rate', true],
		['bossDmgPct', 'Boss Damage', true],
		['iedPct', 'Ignore DEF', true]
	];

	/** Boss damage and IED are the two that actually move damage — highlight them. */
	const DAMAGE_KEYS = new Set(['bossDmgPct', 'iedPct', 'att', 'matt']);

	function effectParts(effect: SetProgress['nextEffect']) {
		if (!effect) return [];
		return LABELS.filter(([key]) => (effect[key] ?? 0) !== 0).map(([key, label, pct]) => ({
			key,
			text: `${label} +${effect[key]}${pct ? '%' : ''}`,
			strong: DAMAGE_KEYS.has(key)
		}));
	}
</script>

<ul class="sets">
	{#each sets as s (s.name)}
		{@const max = s.thresholds.length ? Math.max(...s.thresholds) : s.count}
		<li class:complete={s.next === undefined}>
			<div class="head">
				<span class="name">{s.name}</span>
				<span class="count num">{s.count}<span class="dim">/{max}</span></span>
			</div>

			<div class="pips" aria-hidden="true">
				{#each Array(Math.max(max, s.count)) as _, i (i)}
					<span class="pip" class:on={i < s.count} class:mark={s.thresholds.includes(i + 1)}></span>
				{/each}
			</div>

			{#if s.next !== undefined}
				<div class="next">
					<strong class="num">+{s.missing}</strong>
					<span class="dim">
						{s.missing === 1 ? 'piece' : 'pieces'} → {s.next}-set:
					</span>
					{#each effectParts(s.nextEffect) as part (part.key)}
						<span class="eff" class:strong={part.strong}>{part.text}</span>
					{/each}
				</div>
			{:else}
				<div class="next dim">Complete.</div>
			{/if}

			<div class="slots dim">
				{s.slots.map((slot) => SLOT_LABELS[slot as Slot] ?? slot).join(' · ')}
			</div>

			{#if s.partial}
				<div class="warn" title="The item manifest omits boss damage and ignore-enemy-defence.">
					⚑ effect data incomplete — real bonus is larger
				</div>
			{/if}
		</li>
	{/each}
</ul>

{#if !sets.length}
	<p class="dim">No equipped item carries a set name.</p>
{/if}

<style>
	.sets {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 10px;
	}
	li {
		border: 1px solid var(--line);
		border-radius: 6px;
		padding: 8px 10px;
	}
	li.complete {
		opacity: 0.7;
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 8px;
	}
	.name {
		font-weight: 600;
	}
	.pips {
		display: flex;
		gap: 3px;
		margin: 6px 0;
	}
	.pip {
		width: 100%;
		height: 4px;
		border-radius: 2px;
		background: var(--line);
	}
	.pip.on {
		background: var(--accent, #6fc5e0);
	}
	/* A threshold pip is where an effect actually unlocks. */
	.pip.mark {
		box-shadow: inset 0 0 0 1px var(--text);
	}
	.next {
		font-size: 12px;
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: baseline;
	}
	.eff {
		color: var(--dim);
	}
	.eff.strong {
		color: var(--text);
		font-weight: 600;
	}
	.slots {
		font-size: 11px;
		margin-top: 4px;
	}
	.warn {
		font-size: 11px;
		margin-top: 4px;
		color: var(--warn, #d0a24c);
	}
	.dim {
		color: var(--dim);
	}
</style>
