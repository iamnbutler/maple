<script lang="ts">
	import type { Item, Slot } from '$lib/schema';
	import { GRADE_COLORS, SLOT_LABELS, SLOT_TILE_LABELS, gridSlots, gridTemplate } from '$lib/ui/slots';

	import ItemIcon from './ItemIcon.svelte';

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

	/** Items sitting in a slot the current layout has no cell for. */
	const unplaced = $derived(
		(Object.keys(equipment) as Slot[]).filter((slot) => equipment[slot] && !slots.includes(slot))
	);

	/** Only the top/bottom-vs-overall case is a real conflict; totems just have no cell. */
	const conflict = $derived(unplaced.some((slot) => slot === 'top' || slot === 'bottom'));

	function borderColor(item: Item | undefined): string {
		const grade = item?.potential?.grade;
		return grade ? GRADE_COLORS[grade] : 'var(--line)';
	}

	function bonusColor(item: Item | undefined): string {
		const grade = item?.bonusPotential?.grade;
		return grade ? GRADE_COLORS[grade] : 'transparent';
	}

	function tooltip(slot: Slot, item: Item | undefined): string {
		if (!item) return `${SLOT_LABELS[slot]} — empty`;
		const bits = [`${SLOT_LABELS[slot]} — ${item.name}`];
		if (item.starforce !== undefined) bits.push(`${item.starforce}★`);
		if (item.potential) bits.push(item.potential.grade);
		return bits.join(' · ');
	}
</script>

{#snippet cell(slot: Slot, placed: boolean)}
	{@const item = equipment[slot]}
	<button
		type="button"
		class="cell"
		class:filled={Boolean(item)}
		class:selected={selected === slot}
		style:grid-area={placed ? slot : undefined}
		style:--frame={borderColor(item)}
		style:--bonus={bonusColor(item)}
		onclick={() => onselect(slot)}
		title={tooltip(slot, item)}
	>
		<span class="slot">{SLOT_TILE_LABELS[slot]}</span>
		{#if item}
			<span class="art"><ItemIcon {item} size={40} fallbackWidth={52} /></span>
			{#if item.starforce !== undefined && item.starforce > 0}
				<span class="sf num">★{item.starforce}</span>
			{/if}
		{:else}
			<span class="plus" aria-hidden="true">+</span>
		{/if}
	</button>
{/snippet}

<div class="grid" style:grid-template-areas={template}>
	{#each slots as slot (slot)}
		{@render cell(slot, true)}
	{/each}
</div>

{#if unplaced.length}
	<div class="unplaced">
		<span class="note" class:warn={conflict}>
			{conflict
				? 'Worn alongside an overall — no cell in this layout'
				: 'Equipped, but the equip window has no cell for it'}
		</span>
		<div class="strip">
			{#each unplaced as slot (slot)}
				{@render cell(slot, false)}
			{/each}
		</div>
	</div>
{/if}

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(5, 58px);
		grid-auto-rows: 58px;
		gap: 2px;
		width: max-content;
	}

	.cell {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		background: var(--panel-2);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		overflow: hidden;
	}

	.cell:not(.filled) {
		border-style: dashed;
		background: #ffffff05;
	}

	.cell.filled {
		border-color: var(--frame);
		background: var(--panel-3);
		box-shadow: inset 0 0 0 1px #00000060;
	}

	.cell.filled::after {
		content: '';
		position: absolute;
		inset: auto 0 0 0;
		height: 2px;
		background: var(--bonus);
	}

	.cell:hover {
		background: #ffffff12;
	}

	.cell:not(.filled):hover {
		border-color: var(--accent-dim);
		border-style: solid;
	}

	.cell.selected {
		outline: 1px solid var(--accent);
		outline-offset: -1px;
		background: #ffffff16;
	}

	.slot {
		position: absolute;
		top: 1px;
		left: 3px;
		right: 3px;
		font-size: 8px;
		line-height: 1.2;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--text-faint);
		text-align: left;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		pointer-events: none;
	}

	.art {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: 5px;
	}

	.sf {
		position: absolute;
		right: 2px;
		bottom: 2px;
		font-size: 9px;
		line-height: 1;
		padding: 1px 2px;
		border-radius: 2px;
		background: #000000a0;
		color: var(--warn);
		pointer-events: none;
	}

	.plus {
		font-size: 14px;
		color: var(--text-faint);
		margin-top: 6px;
	}

	.unplaced {
		margin-top: 8px;
	}

	.note {
		font-size: 10px;
		color: var(--text-faint);
	}

	.note.warn {
		color: var(--warn);
	}

	.strip {
		display: flex;
		flex-wrap: wrap;
		gap: 2px;
		margin-top: 3px;
	}

	.strip .cell {
		width: 58px;
		height: 58px;
	}
</style>
