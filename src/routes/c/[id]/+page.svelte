<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';

	import BossBoard from '$lib/components/BossBoard.svelte';
	import CalibrationPanel from '$lib/components/CalibrationPanel.svelte';
	import CharacterHeader from '$lib/components/CharacterHeader.svelte';
	import EquipmentGrid from '$lib/components/EquipmentGrid.svelte';
	import ItemPanel from '$lib/components/ItemPanel.svelte';
	import Section from '$lib/components/Section.svelte';
	import StatWorthTable from '$lib/components/StatWorthTable.svelte';
	import SymbolPanel from '$lib/components/SymbolPanel.svelte';
	import UpgradeTable from '$lib/components/UpgradeTable.svelte';
	import type { Slot } from '$lib/schema';
	import { int } from '$lib/ui/format';

	let { data } = $props();

	// The open item panel lives in the URL (`?slot=weapon`) so a particular item
	// can be linked to, reloaded, and screenshotted.
	const selected = $derived((page.url.searchParams.get('slot') as Slot | null) ?? null);

	function selectSlot(slot: Slot | null) {
		const params = new URLSearchParams(page.url.searchParams);
		if (slot === null) params.delete('slot');
		else params.set('slot', slot);
		const query = params.toString();
		void goto(query ? `?${query}` : page.url.pathname, { keepFocus: true, noScroll: true });
	}

	const character = $derived(data.character);
	const analysis = $derived(data.analysis);
	const equippedCount = $derived(Object.keys(character.equipment ?? {}).length);

	function selectTarget(id: string) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('target', id);
		void goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
	}

	function demoHref() {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('demo', '1');
		return `?${params.toString()}`;
	}
</script>

<svelte:head><title>{character.name} — maple</title></svelte:head>

{#if data.demo}
	<div class="demo">
		Showing the <strong>fixture</strong> from <code>src/lib/ui/fixtures.ts</code>, not this
		character's real document. Writes are disabled.
		<a href={page.url.pathname}>Exit demo</a>
	</div>
{/if}

<CharacterHeader
	{character}
	className={data.className}
	summary={analysis?.summary}
	target={analysis?.target}
	targets={data.targets}
	targetId={data.target}
	ontarget={selectTarget}
	generatedAt={analysis?.generatedAt}
/>

{#if data.analysisError}
	<div class="unavailable">
		<div class="title">Analysis unavailable</div>
		<p>
			<code>GET /api/characters/{character.id}/analysis</code>
			failed{data.analysisError.status ? ` with ${data.analysisError.status}` : ''}: {data
				.analysisError.message}
		</p>
		<p class="dim">
			The document below is live and editable; the ranking, stat worth, calibration and boss board
			need the engine. <a href={demoHref()}>Preview the sections with the fixture</a>.
		</p>
	</div>
{/if}

<Section title="Equipment" subtitle="{int(equippedCount)} of 29 slots filled">
	<div class="equip" class:open={selected !== null}>
		<div class="gear">
			<div class="grid-wrap">
				<EquipmentGrid
					equipment={character.equipment ?? {}}
					{selected}
					onselect={(slot) => selectSlot(selected === slot ? null : slot)}
				/>
				<div class="legend">
					<span class="key" style:--c="var(--grade-rare)">rare</span>
					<span class="key" style:--c="var(--grade-epic)">epic</span>
					<span class="key" style:--c="var(--grade-unique)">unique</span>
					<span class="key" style:--c="var(--grade-legendary)">legendary</span>
				</div>
				<div class="hint">border = potential grade · bottom stripe = bonus potential</div>
			</div>

			<div class="symbol-wrap">
				<SymbolPanel symbols={character.symbols} characterId={character.id} />
			</div>
		</div>

		{#if selected}
			{#key selected}
				<ItemPanel
					characterId={character.id}
					slot={selected}
					item={character.equipment?.[selected]}
					readOnly={data.demo}
					onsaved={() => invalidateAll()}
					onclose={() => selectSlot(null)}
				/>
			{/key}
		{/if}
	</div>
</Section>

{#if analysis}
	<Section title="Next upgrades" subtitle="absolute boss-damage gain at {analysis.target.label}">
		<UpgradeTable upgrades={analysis.upgrades} />
	</Section>

	<div class="two">
		<Section title="Stat worth" subtitle="marginal value at the current configuration">
			<StatWorthTable rows={analysis.statWorth} />
		</Section>

		<Section title="Calibration" subtitle="does the capture hang together?">
			<CalibrationPanel calibration={analysis.calibration} />
		</Section>
	</div>

	{#if analysis.bossBoard}
		<Section title="Boss board" subtitle="solo / party / carried">
			<BossBoard board={analysis.bossBoard} characterId={character.id} />
		</Section>
	{/if}
{/if}

<style>
	.demo {
		border: 1px solid var(--accent-dim);
		background: #58c8e814;
		border-radius: var(--radius);
		padding: 5px 8px;
		margin-bottom: 10px;
		font-size: 11px;
		color: var(--text-dim);
	}

	.unavailable {
		border: 1px solid var(--warn);
		background: #f0b24a10;
		border-radius: var(--radius);
		padding: 8px 10px;
		margin-bottom: 12px;
	}

	.unavailable .title {
		color: var(--warn);
		font-weight: 600;
		margin-bottom: 3px;
	}

	.unavailable p {
		margin: 0 0 4px;
		font-size: 12px;
	}

	.unavailable .dim {
		color: var(--text-dim);
	}

	.equip {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 12px;
		align-items: start;
	}

	.equip.open {
		grid-template-columns: minmax(0, 1fr) 360px;
	}

	/* Grid and symbols sit side by side, and wrap onto two rows when narrow. */
	.gear {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: flex-start;
	}

	.grid-wrap {
		flex: 0 0 auto;
	}

	.symbol-wrap {
		flex: 1 1 300px;
		min-width: 0;
	}

	.legend {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 4px 8px;
		margin-top: 6px;
		font-size: 10px;
		color: var(--text-faint);
	}

	.key {
		color: var(--c);
		border-left: 3px solid var(--c);
		padding-left: 4px;
	}

	.hint {
		margin-top: 2px;
		max-width: 298px;
		font-size: 10px;
		line-height: 1.3;
		color: var(--text-faint);
	}

	.two {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
		gap: 0 12px;
		align-items: start;
	}

	@media (max-width: 1100px) {
		.equip.open {
			grid-template-columns: 1fr;
		}
	}
</style>
