# Maple — agent guide

You are reading this because you are the import path. There is no GMS character
API: **screenshots read by an agent are the only way gear gets into this
tracker.** Your job is to turn a character's Stat window and equipment tooltips
into JSON documents and PUT them here. The app never calls an LLM itself — it
publishes this guide, a JSON Schema, and a set of endpoints, and trusts you.

Base URL below is `http://localhost:5173` (dev) or wherever the Node build runs.
If `MAPLE_TOKEN` is set on the server, every endpoint except `/api/docs` and
`/api/schema` needs `-H "Authorization: Bearer $MAPLE_TOKEN"`.

Machine-readable schema: `GET /api/schema` (JSON Schema 2020-12 for
`Character`, `CharacterCreate`, `Item`, `StatWindow`, `StatTriple`, `StatBlock`,
`Slot`). Slot ids and their categories: `GET /api/ref/slots`.

## The one rule that matters

**Absent means "not captured". Zero means "captured, and it is zero".**

Omit a key entirely rather than writing `0`, `""` or `null`. The calc engine
uses the difference to tell "this character has no boss damage on that ring"
from "nobody looked". Every schema below is `strict`: an unknown key is a hard
400, so a typo fails loudly instead of vanishing.

## Workflow

1. **Create the character** — `POST /api/characters`.
2. **Capture the stat window** — one panel screenshot plus three hover
   tooltips (see below) — `PUT /api/characters/:id/stat-window`.
3. **Capture each equipment tooltip** — one screenshot per slot,
   `PUT /api/characters/:id/equipment/:slot` for each.
4. **Ask the user for star force.** You cannot read it. Send the numbers back in
   a second `PUT` (or `PATCH`) per slot.
5. **Read the warnings** returned by every write. They tell you what to re-read.
6. **`GET /api/characters/:id/analysis`** for the ranked "what to work on next"
   list. (Lands next wave — see the last section.)

Order matters only in that the character must exist before anything else. Gear
and stat window are independent.

## Reading item tooltips

The GMS tooltip, top to bottom: star row · item name · `(Legendary Item)` ·
icon + REQ block · DEF / Boss / IED icons · job icons · stat block ·
`Remaining Enhancements` · Potential · Bonus Potential · Exceptional · soul ·
flavour text. These rules are distilled from every prior screenshot importer
that has been tried (see `docs/research/existing-tools.md` §6); they exist
because vision models fail in these specific ways.

1. **Hold the NPC chat / harvest key while screenshotting.** In the new UI the
   Star Force / scroll / add-option lines are collapsed into a summary and the
   detail only appears while that key is held (it is disabled inside boss
   fights). Without it you lose the breakdown entirely. It is _not_ Ctrl.
2. **Never read star force from the star sprites.** There is no numeric star
   count anywhere in the tooltip — 30 sprites in two rows of 15, with the
   unusable ones hidden. Do not count them, do not infer them from
   "Remaining Enhancements", do not confuse the scissors/tradeability number for
   stars. **Omit `starforce` and ask the user**, then send it in a follow-up
   write. The API warns you about every star-forceable slot that is missing it.
3. **Read the large leading total; ignore the parenthesised breakdown** unless
   it is clearly legible. `STR: +250 (100 +60 +90)` → `total.str = 250`. Fill
   `base`/`flame`/`scroll`/`star` _only_ when you can actually read the numbers.
   GMS classic merges scroll and star into one cyan number: put that merged
   value in `scroll` and leave `star` out. The newer KMS-style tooltip splits
   them four ways — then all four blocks are fair game.
4. **Potential arrays are exactly three strings whenever a grade is visible.**
   Models silently drop lines otherwise. If a line is unreadable, give your best
   guess rather than dropping it; if the item genuinely shows fewer than three
   lines, write the literal `"none"` for the missing ones. Lines are stored raw
   and parsed server-side, so copy them verbatim, including the leading `+` on
   bonus potential lines.
5. **Strip the crafter prefix.** A line like `NateTheGreat의` sits above the item
   name on crafted gear. The item name is the largest bold text only.
6. **Item level is not on the tooltip** — only `REQ LEV`, which a flame can
   reduce (it renders as `(200-25)`). Infer `itemLevel` from the item name
   (Arcane Umbra = 200, Absolab = 160, CRA/Fafnir = 150, Superior Gollux = 150,
   Pitched Boss accessories = 160, Genesis weapon = 200) and omit it if you are
   not sure. A missing `itemLevel` is a warning, not an error.
7. **Colour is a hint, not a key.** base = white, flame = yellow-green, merged
   upgrade (GMS classic) = cyan, scroll (KMS split) = lavender, star = gold.
   Legendary potential text is the same yellow-green as flames, and Rare
   potential is the same cyan as the classic upgrade number. Never decide from
   colour alone.
8. `(+N)` after the item name is **successful scroll upgrades**, not stars →
   `scrollUpgrades`. `Remaining Enhancements: N` → `remainingUpgrades`.
   `Hammers Applied: N` → `hammers`.
9. Zero lines are omitted from the in-game stat block already. Keep it that way.

### Item shape

```jsonc
{
	"name": "string", // required
	"slot": "hat", // required; filled from the URL if omitted
	"category": "armor", // required; defaulted from the slot if omitted
	"itemLevel": 150, // base item level, inferred from the name
	"setName": "Chaos Root Abyss",
	"starforce": 22, // ONLY when the user confirmed it
	"superior": false, // Tyrant gear
	"total": {/* StatBlock */}, // the big leading numbers
	"base": {/* StatBlock */}, // parenthesised breakdown, when legible
	"flame": {/* StatBlock */},
	"scroll": {/* StatBlock */}, // GMS classic: scroll+star merged here
	"star": {/* StatBlock */}, // KMS split only
	"potential": { "grade": "legendary", "lines": ["...", "...", "..."] },
	"bonusPotential": { "grade": "unique", "lines": ["...", "...", "..."] },
	"soul": { "name": "Mighty Lucid Soul", "option": "ATT +20" },
	"exceptional": {/* StatBlock */},
	"scrollUpgrades": 8,
	"remainingUpgrades": 0,
	"hammers": 1,
	"source": {
		"kind": "screenshot",
		"note": "hat tooltip 2026-09-06",
		"at": "2026-09-06T18:11:02.000Z"
	},
	"notes": "string"
}
```

`StatBlock` — every key optional, plain numbers, percents as whole numbers
(`40` = 40%):

```
str, dex, int, luk, maxHp, maxMp, att, matt, def, speed, jump,
allStatPct, bossDmgPct, iedPct, dmgPct, maxHpPct, maxMpPct
```

`grade` is one of `rare | epic | unique | legendary`.
`category` is one of `weapon | secondary | emblem | armor | accessory | heart |
badge | pocket | medal | android | totem`.

### A full worked item

Tooltip (CRA hat, KMS-style split breakdown, user says 22 stars):

```
★★★★★★★★★★★★★★★ ★★★★★★★
Royal Von Leon Warrior Hat (+8)
(Legendary Item)
REQ LEV 150
STR: +265 (100 +45 +40 +80)
DEX: +75 (40 +0 +10 +25)
MaxHP: +255 (255)
Attack Power: +5 (0 +2 +3 +0)
Defense: +550
Potential: Legendary
  STR: +12%
  STR: +9%
  Boss Damage: +30%
Bonus Potential: Unique
  +STR: +6%
  +All Stats: +3%
  +DEX: +4%
Remaining Enhancements: 0
Hammers Applied: 1 (MAX)
```

```json
{
	"name": "Royal Von Leon Warrior Hat",
	"slot": "hat",
	"category": "armor",
	"itemLevel": 150,
	"setName": "Chaos Root Abyss",
	"starforce": 22,
	"total": { "str": 265, "dex": 75, "maxHp": 255, "att": 5, "def": 550 },
	"base": { "str": 100, "dex": 40, "maxHp": 255, "def": 550 },
	"flame": { "str": 45, "att": 2 },
	"scroll": { "str": 40, "dex": 10, "att": 3 },
	"star": { "str": 80, "dex": 25 },
	"potential": {
		"grade": "legendary",
		"lines": ["STR: +12%", "STR: +9%", "Boss Damage: +30%"]
	},
	"bonusPotential": {
		"grade": "unique",
		"lines": ["+STR: +6%", "+All Stats: +3%", "+DEX: +4%"]
	},
	"scrollUpgrades": 8,
	"remainingUpgrades": 0,
	"hammers": 1,
	"source": { "kind": "screenshot", "at": "2026-09-06T18:11:02.000Z" }
}
```

Note what is _not_ there: no `matt: 0`, no `notes: ""`, no `superior: false`
guess, no invented `iedPct`. `dex` appears with `flame` absent because the
flame column showed `+0` — a zero component is omitted, and the identity check
below still passes (`40 + 10 + 25 = 75`).

## Reading the Stat window

The stat window is the **source of truth for totals**. Class passives, links,
legion and buffs contribute FD / IED / boss damage that cannot be reconstructed
from gear, so the calc trusts these numbers over the sum of your equipment.

**You need four screenshots**, because the base / % / %-not-applied split exists
only in the hover tooltips:

1. The **Character Info panel** itself — gives every percent field, ATT, the
   damage range and Combat Power.
2. **Hover the main stat** (e.g. STR) — the tooltip shows
   `STR increased by X` split into the flat pool, the `%` bonus, and the
   "% not applied" pool.
3. **Hover the secondary stat** (DEX for most warriors, and both of a
   Shadower's/DB's/Cadena's secondaries).
4. **Hover ATT** (and M.ATT for a mage) — same split.

Map each hover tooltip to a `StatTriple`:

```jsonc
{
	"base": 12345, // the "% applied" flat pool: AP + gear + flames + scrolls + stars
	"percent": 285, // whole percent; omit when zero
	"flat": 1830 // the "% not applied" pool: hyper stats, symbols, legion, inner ability
}
```

Capture all four of `str`, `dex`, `int`, `luk` even for a pure-STR class — the
calc needs the full vector. `hp` is only for Demon Avenger.

### Stat window shape and a worked example

```json
{
	"capturedAt": "2026-09-06T18:04:00.000Z",
	"str": { "base": 12345, "percent": 285, "flat": 1830 },
	"dex": { "base": 1830, "percent": 285, "flat": 460 },
	"int": { "base": 4, "flat": 60 },
	"luk": { "base": 4, "flat": 60 },
	"attack": { "base": 1720, "percent": 47, "flat": 155 },
	"magicAttack": { "base": 1010, "percent": 47 },
	"damagePercent": 82,
	"bossDamagePercent": 315,
	"finalDamagePercent": 55,
	"ignoreDefensePercent": 91,
	"criticalRatePercent": 100,
	"criticalDamagePercent": 76,
	"arcaneForce": 1320,
	"sacredForce": 340,
	"displayed": { "rangeMax": 18234567, "rangeMin": 15499382, "combatPower": 236118 }
}
```

`capturedAt` defaults to now if you omit it. `displayed` is a **checksum only** —
the app recomputes the range and Combat Power and shows them side by side; it
never feeds them into the ranking. `iedSources` is an optional array of
individually known IED percentages from outside gear, if you happen to know
them (IED composes multiplicatively, so a single total is not enough to
decompose).

## Validation: annotated, never rejected

Both captures have an arithmetic identity attached:

- **Stat window:** `total = floor(base × (1 + percent / 100)) + flat`. Check
  your reading of the hover tooltip against the panel's big number.
- **Item:** `total = base + flame + scroll + star` for the flat stats
  (`str dex int luk maxHp maxMp att matt def speed jump`). Percent stats do not
  decompose this way.

A mismatch does **not** fail the request. The write comes back with a
`warnings` array naming the slot, the stat and both numbers, and it is up to you
to re-read the tooltip or drop the component blocks and keep only `total`.
The current warnings are:

- `total.<stat>` disagrees with the sum of the component blocks that are present;
- `starforce` missing on a star-forceable slot (weapon, secondary, armour,
  accessories) — expected until the user tells you the star count;
- `itemLevel` missing — the star force / flame / potential tables are keyed on it.

Hard errors (`400`) come with `{ "error": "...", "issues": [{ "path", "message" }] }`
and mean the payload is malformed: an unknown key, a wrong type, a bad slot, a
potential array that is not exactly three strings.

## Endpoints

Errors are always `{ error, issues? }` with `400` (bad payload), `404` (no such
character / slot / snapshot) or `409` (id already taken). Every write returns
`{ character, warnings: string[] }`.

```sh
BASE=http://localhost:5173
# AUTH='-H "Authorization: Bearer $MAPLE_TOKEN"'   # only when MAPLE_TOKEN is set
```

### This guide and the schema (always unauthenticated)

```sh
curl -s $BASE/api/docs
curl -s $BASE/api/schema | jq 'keys'
curl -s "$BASE/api/schema?name=Item"
```

### Reference data

```sh
curl -s $BASE/api/ref/slots     # every slot id, its category, starForceable
curl -s $BASE/api/ref/classes   # [] for now — the class table lands next wave
```

### Characters

```sh
# create
curl -s -X POST $BASE/api/characters \
  -H 'content-type: application/json' \
  -d '{"name":"NateTheGreat","classId":"shadower","level":287,"world":"Kronos"}'
# -> 201 { "character": { "id": "natethegreat", ... }, "warnings": [] }
# id defaults to a slug of the name; pass "id" explicitly to choose it.
# 409 if that id already exists.

# list
curl -s $BASE/api/characters

# read one
curl -s $BASE/api/characters/natethegreat

# replace the whole document (id may be omitted; the path wins)
curl -s -X PUT $BASE/api/characters/natethegreat \
  -H 'content-type: application/json' \
  -d @character.json

# merge-patch (RFC 7396: null deletes a key, objects merge, arrays replace)
curl -s -X PATCH $BASE/api/characters/natethegreat \
  -H 'content-type: application/json' \
  -d '{"level":288,"equipment":{"badge":null}}'

# delete (removes the document and its history)
curl -s -X DELETE $BASE/api/characters/natethegreat
```

### Equipment

```sh
# upsert one slot; "slot" and "category" are filled in from the path
curl -s -X PUT $BASE/api/characters/natethegreat/equipment/hat \
  -H 'content-type: application/json' \
  -d '{"name":"Royal Von Leon Warrior Hat","itemLevel":150,"starforce":22,
       "total":{"str":265,"dex":75,"att":5},
       "potential":{"grade":"legendary","lines":["STR: +12%","STR: +9%","Boss Damage: +30%"]}}'
# -> { "character": {...}, "warnings": ["equipment.hat (...): itemLevel is missing", ...] }
# warnings here are scoped to the slot you just wrote.

# add the star count the user gave you, without resending the item
curl -s -X PATCH $BASE/api/characters/natethegreat \
  -H 'content-type: application/json' \
  -d '{"equipment":{"hat":{"starforce":22}}}'

# remove a slot
curl -s -X DELETE $BASE/api/characters/natethegreat/equipment/hat
```

### Stat window

```sh
curl -s -X PUT $BASE/api/characters/natethegreat/stat-window \
  -H 'content-type: application/json' \
  -d @stat-window.json
```

### History

Every write appends an immutable snapshot; history is read-only.

```sh
curl -s $BASE/api/characters/natethegreat/history
# -> { "id": "...", "snapshots": [{ "ts": "2026-09-06T18:11:02.431Z", "at": "..." }] }

curl -s "$BASE/api/characters/natethegreat/history/2026-09-06T18:11:02.431Z"
# -> { "at": "...", "character": { ... } }
```

The timestamp contains colons; quote the URL (curl does not need them escaped,
but a browser will percent-encode them to `%3A`, which also works).

## What the analysis returns — **landing next wave**

`GET /api/characters/:id/analysis?target=grandis|arcane|<bossId>` and
`POST /api/characters/:id/what-if` are **not implemented yet**. They will return:

- the derived stat multiplier, final ATT, IED composition and the **boss damage
  index** at the chosen target (default presets: `arcane` = 300% PDR at level
  255, `grandis` = 380% PDR at level 285);
- checksums: computed damage range and Combat Power next to the values you
  captured in `displayed`, so a mismatch tells you a capture is wrong;
- the **residual** — what the stat window has that your gear does not account
  for (class passives, links, legion, inner ability);
- a ranked list of upgrade candidates (star force, flames, potential, bonus
  potential, symbols, hyper stats), each expressed as an **absolute % boss
  damage gain**, plus gain per billion mesos and gain per day where a cost is
  known.

Until then, capture everything you can: the ranking is only as good as the gear
document, and star force, `itemLevel` and the potential lines are what move it
most.
