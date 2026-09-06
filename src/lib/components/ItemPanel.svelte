<script lang="ts">
	import { untrack } from 'svelte';

	import { CATEGORY_BY_SLOT, type Item, type Slot } from '$lib/schema';
	import { int, stars } from '$lib/ui/format';
	import { GRADE_COLORS, GRADE_LABELS, SLOT_LABELS, statEntries } from '$lib/ui/slots';

	let {
		characterId,
		slot,
		item,
		readOnly = false,
		onsaved,
		onclose
	}: {
		characterId: string;
		slot: Slot;
		item?: Item;
		/** Demo mode has no document to write to. */
		readOnly?: boolean;
		onsaved?: () => void;
		onclose?: () => void;
	} = $props();

	function template(s: Slot): string {
		return JSON.stringify(
			{
				name: '',
				category: CATEGORY_BY_SLOT[s],
				itemLevel: 200,
				starforce: 0,
				total: {},
				source: { kind: 'manual', at: new Date().toISOString() }
			},
			null,
			2
		);
	}

	const pristine = $derived(item ? JSON.stringify(item, null, 2) : template(slot));

	// Seeded once per mount; the parent keys this component on the slot, so
	// picking a different cell gives a fresh editor while a save that refreshes
	// the document leaves the panel (and its messages) alone.
	let draft = $state(untrack(() => (item ? JSON.stringify(item, null, 2) : template(slot))));
	let busy = $state(false);
	let error = $state<string | null>(null);
	let issues = $state<{ path?: string; message?: string }[]>([]);
	let warnings = $state<string[]>([]);
	let saved = $state(false);

	const dirty = $derived(draft !== pristine);
	const url = $derived(`/api/characters/${characterId}/equipment/${slot}`);

	async function send(method: 'PUT' | 'DELETE') {
		if (readOnly) {
			error = 'Demo mode — writes are disabled.';
			return;
		}
		busy = true;
		error = null;
		issues = [];
		warnings = [];
		saved = false;
		try {
			let body: string | undefined;
			if (method === 'PUT') {
				body = JSON.stringify(JSON.parse(draft));
			}
			const res = await fetch(url, {
				method,
				headers: body ? { 'content-type': 'application/json' } : undefined,
				body
			});
			const payload: unknown = await res.json().catch(() => null);
			const data = (payload ?? {}) as {
				error?: string;
				issues?: { path?: string; message?: string }[];
				warnings?: string[];
			};
			if (!res.ok) {
				error = data.error ?? `HTTP ${res.status}`;
				issues = data.issues ?? [];
				return;
			}
			warnings = data.warnings ?? [];
			saved = true;
			onsaved?.();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	const totals = $derived(statEntries(item?.total));
	const breakdown = $derived(
		(['base', 'flame', 'scroll', 'star', 'exceptional'] as const)
			.map((key) => ({ key, entries: statEntries(item?.[key]) }))
			.filter((row) => row.entries.length > 0)
	);
</script>

<aside class="panel">
	<header>
		<div>
			<div class="slot">{SLOT_LABELS[slot]}</div>
			<div class="name">{item?.name ?? 'Empty slot'}</div>
		</div>
		<button type="button" class="close" onclick={() => onclose?.()} title="Close">✕</button>
	</header>

	<div class="scroll">
		{#if item}
			<div class="meta num">
				{#if item.starforce !== undefined}<span class="star">{stars(item.starforce)}</span>{/if}
				{#if item.itemLevel !== undefined}<span>Lv {item.itemLevel}</span>{/if}
				<span class="dim">{item.category}</span>
				{#if item.setName}<span class="dim">{item.setName} set</span>{/if}
				{#if item.superior}<span class="star">Superior</span>{/if}
			</div>

			{#if totals.length}
				<h3>Total</h3>
				<ul class="stats total">
					{#each totals as entry (entry.label)}
						<li><span>{entry.label}</span><span class="num">{entry.value}</span></li>
					{/each}
				</ul>
			{/if}

			{#each breakdown as row (row.key)}
				<h3>{row.key}</h3>
				<ul class="stats">
					{#each row.entries as entry (entry.label)}
						<li><span>{entry.label}</span><span class="num">{entry.value}</span></li>
					{/each}
				</ul>
			{/each}

			{#each [{ key: 'potential', pot: item.potential }, { key: 'bonusPotential', pot: item.bonusPotential }] as block (block.key)}
				{#if block.pot}
					<h3>{block.key === 'potential' ? 'Potential' : 'Bonus potential'}</h3>
					<div class="pot" style:--grade={GRADE_COLORS[block.pot.grade]}>
						<div class="grade">{GRADE_LABELS[block.pot.grade]}</div>
						{#each block.pot.lines as line, i (i)}
							<div class="line">{line}</div>
						{/each}
					</div>
				{/if}
			{/each}

			{#if item.soul}
				<h3>Soul</h3>
				<div class="dim">
					{item.soul.name ?? 'unknown soul'} — {item.soul.option ?? 'no option'}
				</div>
			{/if}

			{#if item.scrollUpgrades !== undefined || item.remainingUpgrades !== undefined || item.hammers !== undefined}
				<h3>Scrolls</h3>
				<div class="dim num">
					{int(item.scrollUpgrades ?? 0)} applied · {int(item.remainingUpgrades ?? 0)} remaining ·
					{int(item.hammers ?? 0)} hammers
				</div>
			{/if}

			{#if item.notes}
				<h3>Notes</h3>
				<div class="dim">{item.notes}</div>
			{/if}

			{#if item.source}
				<div class="source dim">
					source: {item.source.kind} @ {item.source.at}{item.source.note
						? ` — ${item.source.note}`
						: ''}
				</div>
			{/if}
		{:else}
			<p class="dim">
				Nothing equipped here. Fill in the template below and save to <code>PUT {url}</code>.
			</p>
		{/if}

		<h3>Raw JSON</h3>
		<textarea
			bind:value={draft}
			spellcheck="false"
			rows="14"
			aria-label="Raw item JSON"
			disabled={readOnly}></textarea>

		<div class="actions">
			<button type="button" onclick={() => send('PUT')} disabled={busy || readOnly}>
				{busy ? 'Saving…' : 'Save (PUT)'}
			</button>
			<button type="button" onclick={() => (draft = pristine)} disabled={!dirty}>Reset</button>
			<div class="spacer"></div>
			{#if item}
				<button
					type="button"
					class="danger"
					onclick={() => send('DELETE')}
					disabled={busy || readOnly}>Remove</button
				>
			{/if}
		</div>

		{#if error}
			<div class="msg bad">
				{error}
				{#if issues.length}
					<ul>
						{#each issues as issue, i (i)}
							<li><code>{issue.path ?? '(root)'}</code> {issue.message}</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}
		{#if saved && !warnings.length}
			<div class="msg good">Saved.</div>
		{/if}
		{#if warnings.length}
			<div class="msg warn">
				Saved with warnings:
				<ul>
					{#each warnings as w, i (i)}<li>{w}</li>{/each}
				</ul>
			</div>
		{/if}
	</div>
</aside>

<style>
	.panel {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--panel-2);
		min-height: 0;
		max-height: 720px;
	}

	header {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		padding: 6px 8px;
		border-bottom: 1px solid var(--line);
	}

	.slot {
		font-size: 10px;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--text-faint);
	}

	.name {
		font-size: 14px;
		font-weight: 600;
	}

	.close {
		margin-left: auto;
		padding: 0 6px;
		background: none;
		border: none;
		color: var(--text-faint);
	}

	.scroll {
		overflow-y: auto;
		padding: 8px;
	}

	h3 {
		margin: 10px 0 3px;
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		font-size: 11px;
		color: var(--text-dim);
	}

	.star {
		color: var(--warn);
	}

	.dim {
		color: var(--text-dim);
		font-size: 11px;
	}

	.stats {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0 10px;
	}

	.stats li {
		display: flex;
		justify-content: space-between;
		gap: 6px;
		font-size: 11px;
		color: var(--text-dim);
		border-bottom: 1px solid var(--line-soft);
		padding: 1px 0;
	}

	.stats.total li {
		color: var(--text);
		font-size: 12px;
	}

	.pot {
		border: 1px solid var(--grade);
		border-radius: var(--radius);
		padding: 4px 6px;
	}

	.pot .grade {
		color: var(--grade);
		font-size: 10px;
		letter-spacing: 0.07em;
		text-transform: uppercase;
	}

	.pot .line {
		font-size: 11px;
	}

	.source {
		margin-top: 8px;
		font-size: 10px;
		color: var(--text-faint);
	}

	textarea {
		width: 100%;
		font-size: 11px;
		resize: vertical;
	}

	.actions {
		display: flex;
		gap: 6px;
		margin-top: 6px;
	}

	.actions .spacer {
		flex: 1;
	}

	.danger {
		color: var(--bad);
	}

	.msg {
		margin-top: 8px;
		padding: 5px 7px;
		border-radius: var(--radius);
		font-size: 11px;
		border: 1px solid;
	}

	.msg ul {
		margin: 4px 0 0;
		padding-left: 16px;
	}

	.bad {
		color: var(--bad);
		border-color: var(--bad);
		background: #ff6b6b12;
	}

	.good {
		color: var(--good);
		border-color: var(--good);
		background: #58d38a12;
	}

	.warn {
		color: var(--warn);
		border-color: var(--warn);
		background: #f0b24a12;
	}
</style>
