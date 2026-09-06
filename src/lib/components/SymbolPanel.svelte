<script lang="ts">
	import type { Symbols } from '$lib/schema';
	import { int } from '$lib/ui/format';
	import { arcanePool, authenticPool, type SymbolPool } from '$lib/ui/symbols';

	let { symbols, characterId }: { symbols?: Symbols; characterId?: string } = $props();

	const pools = $derived([arcanePool(symbols), authenticPool(symbols)]);

	let active = $state<'arcane' | 'authentic'>('arcane');

	// Land on whichever pool actually has data, without fighting a manual choice.
	let touched = $state(false);
	const pool = $derived.by((): SymbolPool => {
		const chosen = pools.find((p) => p.id === active) ?? pools[0];
		if (touched || chosen.recorded > 0) return chosen;
		return pools.find((p) => p.recorded > 0) ?? chosen;
	});
</script>

<section class="symbols">
	<div class="tabs" role="tablist" aria-label="Symbol pools">
		{#each pools as p (p.id)}
			<button
				type="button"
				role="tab"
				class="tab"
				class:on={pool.id === p.id}
				aria-selected={pool.id === p.id}
				onclick={() => {
					active = p.id;
					touched = true;
				}}
			>
				{p.label}
				{#if p.recorded === 0}<span class="none">·</span>{/if}
			</button>
		{/each}
	</div>

	{#if pool.recorded === 0}
		<p class="empty">
			No {pool.label.toLowerCase()} symbols recorded for this character.
			{#if characterId}
				Add a <code>symbols.{pool.id === 'arcane' ? 'arcane' : 'sacred'}</code> block to the
				character document to see force and stat totals here.
			{/if}
		</p>
	{:else}
		<div class="totals">
			<div class="total">
				<span class="k">{pool.forceLabel}</span>
				<span class="v num">{int(pool.totalForce)}</span>
			</div>
			<div class="total">
				<span class="k">Main stat</span>
				<span class="v num">+{int(pool.totalStat)}</span>
			</div>
			<div class="total">
				<span class="k">Maxed</span>
				<span class="v num">{pool.maxedCount} / {pool.tiles.length}</span>
			</div>
		</div>

		<ul class="tiles">
			{#each pool.tiles as tile (tile.key)}
				<li class="tile" class:blank={tile.level === null} class:maxed={tile.maxed}>
					<span
						class="hex"
						class:grand={tile.grand}
						style:--fill={tile.level === null ? 0 : tile.progress}
					>
						<span class="lv num">{tile.level ?? '–'}</span>
					</span>
					<span class="body">
						<span class="name">{tile.name}{#if tile.grand}<em class="grand-tag">Grand</em>{/if}</span>
						<span class="lvl num">
							{#if tile.level === null}
								not recorded
							{:else if tile.maxed}
								<strong class="max">MAX</strong>
							{:else}
								Lv.{tile.level}
							{/if}
						</span>
						<span
							class="bar"
							title={tile.level === null
								? 'no level recorded'
								: `Lv ${tile.level} of ${tile.maxLevel}`}
						>
							<span class="fill" style:width="{Math.round(tile.progress * 100)}%"></span>
						</span>
						<span class="cost num">
							{#if tile.level === null}
								&nbsp;
							{:else if tile.nextCost !== null}
								{int(tile.nextCost)} to Lv.{tile.level + 1}
							{:else}
								{int(tile.force)} force
							{/if}
						</span>
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.symbols {
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--panel-2);
		padding: 6px 8px 8px;
		min-width: 0;
	}

	.tabs {
		display: flex;
		gap: 2px;
		border-bottom: 1px solid var(--line);
		margin-bottom: 6px;
	}

	.tab {
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		border-radius: 0;
		padding: 2px 8px 4px;
		font-size: 11px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-faint);
	}

	.tab:hover:not(:disabled) {
		color: var(--text-dim);
	}

	.tab.on {
		color: var(--text);
		border-bottom-color: var(--accent);
	}

	.tab .none {
		color: var(--text-faint);
		opacity: 0.6;
	}

	.empty {
		margin: 4px 0 2px;
		font-size: 11px;
		color: var(--text-dim);
	}

	.totals {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 16px;
		margin-bottom: 7px;
	}

	.total {
		display: flex;
		flex-direction: column;
		line-height: 1.2;
	}

	.total .k {
		font-size: 9px;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--text-faint);
	}

	.total .v {
		font-size: 14px;
		color: var(--text);
	}

	.tiles {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		/* Capped so the progress bars stay tile-sized in a wide panel. */
		grid-template-columns: repeat(auto-fill, minmax(150px, 210px));
		justify-content: start;
		gap: 5px 10px;
	}

	.tile {
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
	}

	.tile.blank {
		opacity: 0.45;
	}

	.hex {
		position: relative;
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 30px;
		clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
		/* Fills from the bottom in proportion to the symbol's level. */
		background:
			linear-gradient(to top, var(--accent-dim) calc(var(--fill) * 100%), #ffffff10 0)
				border-box;
		color: var(--text);
	}

	.hex.grand {
		background: linear-gradient(to top, #8a6bd0 calc(var(--fill) * 100%), #ffffff10 0) border-box;
	}

	.tile.maxed .hex {
		background: linear-gradient(to top, var(--warn), #b57c1e);
		color: #14171d;
	}

	.hex .lv {
		font-size: 11px;
		font-weight: 700;
		text-shadow: 0 1px 0 #00000060;
	}

	.tile.maxed .hex .lv {
		text-shadow: none;
	}

	.body {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0 6px;
		min-width: 0;
		flex: 1 1 auto;
	}

	.name {
		font-size: 11px;
		color: var(--text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
	}

	.grand-tag {
		margin-left: 4px;
		font-size: 8px;
		font-style: normal;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #b39ae8;
	}

	.lvl {
		font-size: 10px;
		color: var(--text-dim);
		text-align: right;
	}

	.max {
		color: var(--warn);
		font-size: 9px;
		letter-spacing: 0.08em;
	}

	.bar {
		grid-column: 1 / -1;
		height: 3px;
		border-radius: 2px;
		background: #ffffff12;
		overflow: hidden;
	}

	.fill {
		display: block;
		height: 100%;
		background: var(--accent);
	}

	.tile.maxed .fill {
		background: var(--warn);
	}

	.cost {
		grid-column: 1 / -1;
		font-size: 9px;
		color: var(--text-faint);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
