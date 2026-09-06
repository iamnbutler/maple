<script lang="ts">
	import type { Item, Slot } from '$lib/schema';
	import { GRADE_COLORS, SLOT_LABELS, gridSlots, gridTemplate } from '$lib/ui/slots';
	import { stars } from '$lib/ui/format';

	let {
		equipment,
		selected = null,
		onselect
	}: {
		equipment: Partial<Record<Slot, Item>>;
		selected?: Slot | null;
		onselect: (slot: Slot) => void;
	} = $props();

	const hasOverall = $derived(Boolean(equipment.overall));
	const slots = $derived(gridSlots(hasOverall));
	const template = $derived(gridTemplate(hasOverall));

	/** Items sitting in a slot the current layout has no cell for (e.g. a top worn alongside an overall). */
	const unplaced = $derived(
		(Object.keys(equipment) as Slot[]).filter((slot) => equipment[slot] && !slots.includes(slot))
	);

	function borderColor(item: Item | undefined): string {
		const grade = item?.potential?.grade;
		return grade ? GRADE_COLORS[grade] : 'var(--line)';
	}

	function bonusColor(item: Item | undefined): string {
		const grade = item?.bonusPotential?.grade;
		return grade ? GRADE_COLORS[grade] : 'transparent';
	}
</script>

{#snippet cell(slot: Slot)}
	{@const item = equipment[slot]}
	<button
		type="button"
		class="cell"
		class:filled={Boolean(item)}
		class:selected={selected === slot}
		style:grid-area={slot}
		style:--frame={borderColor(item)}
		style:--bonus={bonusColor(item)}
		onclick={() => onselect(slot)}
		title={item ? `${SLOT_LABELS[slot]} — ${item.name}` : `${SLOT_LABELS[slot]} — empty`}
	>
		<span class="slot">{SLOT_LABELS[slot]}</span>
		{#if item}
			<span class="name">{item.name}</span>
			<span class="meta num">
				{#if item.starforce !== undefined}<span class="stars">{stars(item.starforce)}</span>{/if}
				{#if item.potential}<span class="grade">{item.potential.grade.slice(0, 3)}</span>{/if}
			</span>
		{:else}
			<span class="empty">+ add</span>
		{/if}
	</button>
{/snippet}

<div class="grid" style:grid-template-areas={template}>
	{#each slots as slot (slot)}
		{@render cell(slot)}
	{/each}
</div>

{#if unplaced.length}
	<div class="unplaced">
		<span class="warn">Not in the layout (overall worn with separate pieces?)</span>
		<div class="strip">
			{#each unplaced as slot (slot)}
				{@render cell(slot)}
			{/each}
		</div>
	</div>
{/if}

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(5, minmax(92px, 1fr));
		gap: 3px;
	}

	.cell {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 1px;
		min-height: 58px;
		padding: 3px 5px 4px;
		text-align: left;
		background: var(--panel-2);
		border: 1px solid var(--line);
		border-left: 3px solid var(--line);
		border-radius: var(--radius);
		overflow: hidden;
	}

	.cell.filled {
		border-color: var(--frame);
		border-left-color: var(--frame);
		background: var(--panel-3);
	}

	.cell.filled::after {
		content: '';
		position: absolute;
		inset: auto 0 0 0;
		height: 2px;
		background: var(--bonus);
	}

	.cell:hover {
		background: #ffffff10;
	}

	.cell.selected {
		outline: 1px solid var(--accent);
		outline-offset: -1px;
		background: #ffffff14;
	}

	.slot {
		font-size: 9px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-faint);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.name {
		font-size: 11px;
		line-height: 1.2;
		color: var(--text);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.meta {
		margin-top: auto;
		display: flex;
		justify-content: space-between;
		gap: 4px;
		font-size: 10px;
		color: var(--text-dim);
	}

	.stars {
		color: var(--warn);
	}

	.grade {
		color: var(--frame);
		text-transform: uppercase;
	}

	.empty {
		margin-top: auto;
		font-size: 10px;
		color: var(--text-faint);
	}

	.unplaced {
		margin-top: 8px;
	}

	.unplaced .warn {
		font-size: 11px;
		color: var(--warn);
	}

	.strip {
		display: grid;
		grid-template-columns: repeat(5, minmax(92px, 1fr));
		gap: 3px;
		margin-top: 3px;
	}

	.strip .cell {
		grid-area: auto !important;
	}
</style>
