# Gear progression paths, stopping points, and boss gating

Scope: **GMS Heroic (Reboot), 2026**. Priority classes: Ren, Hero, Wind Archer, Battle Mage,
Night Walker — none of the material below is class-specific except armour item _names_ (§3).

This document exists to fix a specific defect: the tracker ranks what is _mathematically possible_
rather than what a real player would _do_. It answers three questions:

1. **What is the path through each slot?** (§3) — ordered stages, with the branch conditions
   where real options exist.
2. **Where do you stop on each stage?** (§3, §4) — the prescribed star / potential / flame
   investment per stage, and _why that number_. This is the core deliverable.
3. **What is each stage for?** (§5) — the boss that drops the next stage, its entry level, force
   requirement, published Combat Power gate, and the damage you must deal to receive loot at all.

## 0. The framing, stated once

**Investment in stepping-stone gear is required, not wasted.** You cannot get Arcane Umbra without
first gearing CRA/Fafnir and AbsoLab — Arcane Umbra drops from Lucid and Will, and you need the
range those tiers give to clear them. A tool that discourages CRA or AbsoLab investment is telling
the user not to build the exact gear that unlocks the next tier.

What a stepping stone has is a **stopping point**: a prescribed level of star force, potential and
flames past which the marginal meso is better spent on the next stage or the next slot. The
guides state these stopping points explicitly, and they state _why_:

> "Get Absolab and superior Gollux items to Epic with 6%+ stat or Unique+ with 15%+ stat.
> **The reason we don't need to surpass Epic/Unique here is because Abso items will be replaced
> with Arcane eventually** and, thus, holding less value in the long run." — `UG`, Phase 2

> "**It does not matter if the gear will be replaced**, this will help you to defeat enemies."
> — `GL`, on Star Forcing everything to 10–12★ early

Both sentences are true simultaneously. The first sets a ceiling; the second sets a floor. The
data module encodes the pair, per stage, as `stop`.

---

## 1. Sources, and how much each is worth

| Key    | Source                                                                                                                                                                                                | What it is                                                                                                                  | Trust notes                                                                                                                                       |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UG`   | [GMS Gear Progression Guide, UncappedGames, May 2024 (upd. 2024-06-11)](https://docs.google.com/document/d/1ITQx0vhNCiP9unJpV64AZgZDU-w2za4w-xcxGhbmXfY/edit)                                         | Phase 1–4 Reboot progression doc. Fetched via `…/export?format=txt`.                                                        | **The primary source.** The only guide that states _stopping points_ and _reasons_. Explicitly Kronos/Hyperion (Heroic).                          |
| `DTQ`  | [DigitalTQ MapleStory Progression Guide](https://www.digitaltq.com/maplestory-progression-guide)                                                                                                      | Early / Mid / End-game tables: item, slot, potential aim, **star-force aim**, source.                                       | Covers Reboot and Regular. Its star-force _mechanics_ section is **stale** (pre-2025 revamp, §4.1); its _targets_ still match community practice. |
| `GL`   | [Grandis Library — Progression Guide](https://grandislibrary.com/content/progression-guide), [Upgrading & Enhancing Equipment](https://www.grandislibrary.com/contents/upgrading-enhancing-equipment) | Content-ordering guide, full boss-reward list, gear-tier list.                                                              | Deliberately non-prescriptive. Star-force section also predates the 2025 revamp ("max. 25 stars", "Decrease Star Force level by 1").              |
| `WIKI` | [MapleStory Wiki](https://maplestorywiki.net), fetched as `?action=raw`                                                                                                                               | Per item: exact name, level, **`starForceEnhancements` hard cap**, source boss, set membership. Per set: full effect table. | Authoritative for names, levels, caps. Publishes **no** drop rates.                                                                               |
| `REPO` | `src/lib/data/starforce.ts`, `sets.json`, `items/catalogue.json`, `bosses.json`, `docs/research/bosses.md`, `docs/research/formulas.md` §4A                                                           | Already-researched in-repo tables.                                                                                          | Used for star-force rates, set effects, boss gates, and to verify every item name against the GMS v270 catalogue.                                 |

**Could not load:** the Google Slides _Heroic Beginner Guide_
(`docs.google.com/presentation/d/1qhdHK0GNK3qoKZUe_27yFWQ2hMAZy-ovkICKsH1-f2c`) — every export
endpoint (`/export/txt`, `/pdf`, `/pptx`, `/html`) returns **HTTP 401**. Nothing from it is used.
Nexon's pages return JS shells with no data, as predicted.

**Naming correction.** The "Radiant / Grandis" set is called the **Brilliant Boss Set** in GMS
(`gmsName=Brilliant Boss Set`, [wiki](https://maplestorywiki.net/w/Brilliant_Boss_Set); `sets.json`
agrees). "Radiant" is not a GMS item or set name.

---

## 2. How a stopping point is justified

Three independent signals fix where a stage ends. All three are checkable, none is opinion.

### 2.1 The guides name the number

`DTQ` publishes a star-force column per tier (10★ early / 17★ mid / 22★ end). `UG` publishes
phase-by-phase targets with reasons. §4.3 collates them.

### 2.2 The item's hard star cap

The wiki's per-item `starForceEnhancements` field is the mechanical cap set by item level, and it
agrees with `REPO` `MAX_STARS_BY_LEVEL` on every item checked. A stage whose cap is 20★ _cannot_
be the place you spend endgame mesos:

| Item                                        | Lv      | Hard cap | Next stage                               | Next cap |
| ------------------------------------------- | ------- | -------- | ---------------------------------------- | -------- |
| Aquatic Letter Eye Accessory                | 100     | **8★**   | Black Bean Mark                          | 20★      |
| Fairy Heart                                 | 100     | **8★**   | (none in practice)                       | —        |
| Silver Blossom Ring                         | 110     | **10★**  | Gollux / Kanna's Treasure / Meister Ring | 30★      |
| Condensed Power Crystal                     | 110     | **10★**  | Twilight Mark                            | 30★      |
| Royal Black Metal Shoulder                  | 120     | **15★**  | AbsoLab shoulder                         | 30★      |
| Chaos Horntail Necklace, Mechanator Pendant | 120     | **15★**  | Dominator / Superior Gollux Pendant      | 30★      |
| **Will o' the Wisps**                       | **130** | **20★**  | **Superior Gollux Earrings**             | **30★**  |
| Dea Sidus Earring                           | 130     | **20★**  | Superior Gollux Earrings                 | 30★      |
| Black Bean Mark                             | 135     | **20★**  | Papulatus Mark / Sweetwater Monocle      | 30★      |

Sources: [Will o' the Wisps](https://maplestorywiki.net/w/Will_o%27_the_Wisps) (`reqLevel=130`,
`starForceEnhancements=20`), [Superior Gollux Earrings](https://maplestorywiki.net/w/Superior_Gollux_Earrings)
(`reqLevel=150`, `starForceEnhancements=30`), [Dea Sidus Earring](https://maplestorywiki.net/w/Dea_Sidus_Earring),
[Silver Blossom Ring](https://maplestorywiki.net/w/Silver_Blossom_Ring),
[Aquatic Letter](https://maplestorywiki.net/w/Aquatic_Letter_Eye_Accessory),
[Royal Black Metal Shoulder](https://maplestorywiki.net/w/Royal_Black_Metal_Shoulder),
[Fairy Heart](https://maplestorywiki.net/w/Fairy_Heart).

### 2.3 Transfer hammer caps what carries forward

`UG` repeatedly says to keep spares of a stage in order to transfer-hammer its stars into the next
one ("Keep spare Dominator pendants for backups/transfer hammer"; "you will eventually be transfer
hammering from Pink Bean belts or even reinforced Gollux belts into superior in order to save
meso"). The mechanic caps what survives:

> "You will lose one Star Force while transferring and **any potentials above Epic will be dropped
> down to Epic Potential**." — `GL`, Upgrading & Enhancing

That is precisely why the prescribed potential on a hammer-source stage is **Epic 6%**, not
Legendary: anything above Epic is destroyed by the transfer. It is a mechanical stopping point,
not a preference.

### 2.4 The worked example the user gave

**Will o' the Wisps** (earrings, Lv 130, Hard Hilla, Boss Accessory Set, **20★ cap**)
→ **Superior Gollux Earrings** (Lv 150, Hell Gollux drop / 700 Gollux Coins from Lucia, Superior
Gollux Set, **30★ cap**) → _(out of scope)_ **Commanding Force Earring** (Lv 200, Hard Darknell,
Pitched Boss Set).

Prescribed stop on Will o' the Wisps: **10★, Epic, 6% main stat, no flames.** Reasons, in order of
strength: (a) it caps at 20★ so endgame stars are impossible; (b) `UG` Phase 1 says
_"Get all items except magnus cape, boots, and belt 10 star max"_ and _"Epic potential on
everything that is a Basic Boss Accessory and get to 6% main stat"_; (c) `DTQ`'s early table gives
earrings _Epic / 10 Stars_; (d) its successor is bought with Gollux Coins from a **daily** boss —
`hard-gollux` `reset: daily` (`bosses.json`), so the wait is weeks, not months.

Why Superior Gollux is worth the coins even though it leaves the Boss Accessory Set: the
**Superior Gollux 4-set is +30% Boss Damage and +30% IED** (screenshot-verified in `sets.json`,
`partial: false`) against the Boss Accessory Set's +10% IED at 7 pieces / +10% Boss Damage at 9 —
and you can still reach 9 Boss Accessory pieces without an earring (face, eye, three rings, second
pendant, shoulder, pocket, badge are all members —
[Boss Accessory Set](https://maplestorywiki.net/w/Boss_Accessory_Set)).

---

## 3. The paths, per slot

Notation per stage: **`N★ / <potential> / <flames>`** = the prescribed stopping point.
`†` = Pitched or Brilliant item — documented as a terminal endpoint, **never ranked** (§6).
Armour stages are _families_; the real item name is job-branch specific (the CRA hat is
`Royal Warrior Helm` / `Royal Dunwitch Hat` / `Royal Ranger Beret` / `Royal Assassin Hood` /
`Royal Wanderer Hat`). Branch names verified against `sets.json` and the v270 catalogue.

### Weapon — one path, no branches

1. Lv 140 `Utgard` / Pensalir weapon (mob drop) — **12★ / Epic / none**. `DTQ` early: _12 Stars_.
2. Lv 150 CRA weapon (`Fafnir …`, Chaos Vellum) — **17★ / Legendary ATT% / invest**.
3. Lv 160 AbsoLab weapon (AbsoLab dailies / Lomien) — **17★ / Unique-Legendary ATT% / opportunistic**.
   `DTQ` mid: _17 Stars_.
4. Lv 200 Arcane Umbra weapon (Lucid / Will) — **17★ / Legendary 3-line / invest (T6–T7 ATT)**.
   ⚠️ Star target disputed, §4.4.
5. Lv 200 **Genesis weapon** (Black Mage liberation, 8 monthly clears) — arrives at a **fixed 22★
   and cannot be enhanced** (`REPO` `rules.ts` `liberated-weapon-fixed-star`;
   [wiki](https://maplestorywiki.net/w/Genesis_Weapon)). Nothing to star; cube to 3-line ATT%.

**Skip rule, stated by the source:** _"If you have CRA wep, you can hold off on getting the Absolab
weapon until you are in Phase 2, doing HLotus / HDamien (HLomien) struggle or carry runs. Then, you
can likely get a weapon box drop and save the Absolab resources for a boss mule."_ — `UG` P1. So
stage 3 is **skippable when stage 2 is already invested and Lomien access is imminent**; the
AbsoLab coins go to a boss mule instead.

Weapon flames matter more than any other slot: _"always make sure your weapon has good ATT / M.ATT
flames"_ (`UG`, general tips); _"Arcane Weapon should have T6-T7 ATT / M.ATT flames"_ (`UG` P3).

### Secondary — one path. No star force, no flames. Cube only.

1. Lv 100 vendor secondary (Leafre, 500k) — **— / Unique-Legendary, 1–2 lines ATT% / n/a**.
2. Lv 140 `Princess No's …` secondary (Princess No fragments) — **— / Legendary / n/a**.

`DTQ`: _"This secondary is only slightly better than the Level 100 one, so you can just stick with
your current one for a while."_ Because it never takes stars or flames, cubing it early is _not_
over-investment — the potential transfers with you for the life of the character. `GL`: _"Your main
focus for this would be to try and get your Weapon, Secondary Weapon, and Emblem to unique first
as their potentials can provide stats like %Attack/Magic Attack, %Ignore DEF and %Boss Damage."_

### Emblem — one path. No star force, no flames. Cube only.

1. `Gold Maple Leaf Emblem` (Lv 100, quest) — **— / Legendary 2–3 lines ATT% / n/a**.
   `DTQ`: _"best-in-slot … you can cube this to perfect stats if you have the mesos."_
2. `†` `Mitra's Rage: <Job>` (Lv 200, Chosen Seren, Pitched Boss Set) —
   [wiki](https://maplestorywiki.net/w/Mitra%27s_Rage:_Warrior).

> ⚠️ `DTQ` writes "Gold Knight's Emblem". The catalogue and wiki name is **Gold Maple Leaf Emblem**.

### Hat / Top / Bottom (and Overall) — one path

1. Lv 140 Pensalir overall — **10★ / Epic / none**.
2. Lv 150 **CRA** hat / top / bottom (Chaos Pierre / Crimson Queen / Von Bon) —
   **17★ / Legendary 15%+ main stat / invest**, then **21–22★ once Arcane is done** (§4.3).
   `UG` P2: _"Get CRA to Legendary with 15%+ stat since they are going to be with you for a very
   long time and there's no ideal transferring items for this other than itself."_
3. Lv 250 **Eternal** hat / top / bottom (Kalos) — **22★ / Legendary 3-line / invest**.
   `DTQ`: _"In the mean time, keep your CRA gear and max it to 22 stars."_

CRA occupies these three slots from Lv 150 all the way to Kalos — the AbsoLab and Arcane Umbra
hat/overall pieces exist but are not taken, because the CRA 3-set gives +50 ATT and the 4-set
+30% Boss Damage (`sets.json`, screenshot-verified). This is why CRA gets Legendary and 21–22★
while AbsoLab does not: **CRA is a stepping stone that lasts 100 levels; AbsoLab lasts ~40.**

### Shoes / Gloves / Cape / Shoulder — one path

1. Lv 140 Pensalir shoes / gloves / cape, `Royal Black Metal Shoulder` (Lv 120, Magnus, 15★ cap) —
   **10★ / Epic / none**.
2. Lv 160 **AbsoLab** shoes / gloves / cape / shoulder — **17★ / Epic 6%+ (Unique 15%+ if cubes are
   free) / opportunistic**. See §4.2 — this is the AbsoLab case.
3. Lv 200 **Arcane Umbra** shoes / gloves / cape / shoulder — **17★ then 22★ / Legendary 3-line
   23%+ / invest**. `DTQ`: _"This gear is quite easy to get, so getting it to 22 Star should be the
   priority as soon as possible."_
4. Lv 250 **Eternal** cape / shoes / gloves / shoulder — **22★**. ⚠️ Disputed, §7.

Note on slot scope: AbsoLab and Arcane Umbra also make hats and overalls, and some characters wear
them instead of CRA in those slots (`sets.json`; e.g. `AbsoLab Knight Helm`,
`Arcane Umbra Knight Hat`, `Arcane Umbra Knight Suit`). The stopping point is the same wherever the
piece sits, so the data module's AbsoLab and Arcane armour stages claim every armour slot, while
the Pensalir / CRA / Eternal stages stay split between hat-top-bottom-overall and
shoes-gloves-cape-shoulder.

Gloves are the crit-damage slot: `UG` P2 _"Get your Absolab Gloves to at least 1 line of % Crit
Damage and, ideally, 1 line of % stat. 2 lines of % Crit Damage shouldn't be a goal due to cost for
these gloves"_, then P3 _"2 Line % Crit Damage on your Gloves"_ — an explicit, sourced example of
a stopping point that _moves_ between phases. `DTQ` potential-aim table: GLOVES → Critical Damage %,
perfect = Critical Damage % ×3.

### Earrings — one path, one late branch

1. `Will o' the Wisps` (Lv 130, Hard Hilla, 20★ cap) **or** `Dea Sidus Earring` (Lv 130, Horntail,
   20★ cap) — **10★ / Epic 6% / none**. _Whichever drops first; they are interchangeable._
2. `Superior Gollux Earrings` (Lv 150, Hell Gollux / 700 Gollux Coins) — **17★ / Epic 6%+ or
   Unique 15%+ / invest**, → **22★ / Legendary** at endgame.
   `UG` P2: _"If you are getting consistent Hellux carries, you can get your superior Gollux
   Earring and Belt to Legendary since you would then have backups and wouldn't need to transfer
   (optional). Transfer hammering is still ideal, but you can take either route here."_
   **Branch condition, stated by the source: consistent Hell Gollux access ⇒ cube to Legendary;
   otherwise stay Epic/Unique and transfer-hammer in.**
3. _Branch:_ `Estella Earrings` (Lv 160, Gloom / Darknell, **Dawn Boss Set**) — only if you are
   assembling the Dawn 4-set, and it costs you the Superior Gollux 4-set. Neither guide takes it;
   both keep Superior Gollux.
4. `†` `Commanding Force Earring` (Lv 200, Hard Darknell, Pitched).

### Face accessory — one path, one accessibility branch

1. `Condensed Power Crystal` (Lv 110, Zakum, 10★ cap) — **10★ / Epic main stat / none**.
2. `Twilight Mark` (Lv 140, Normal or Hard Lucid **and** Normal or Hard Will — wiki `mob` list;
   `GL`: "[Lucid / Will] [Lv. 140 Face]"), Dawn Boss Set — **17★ / Legendary / invest** → 22★.
   _Branch:_ `Sweetwater Tattoo` (Lv 160, Commerci dailies) **if you cannot get into Lucid/Will
   parties** — `DTQ`: _"another daily grind, but more accessible to those who don't get into
   Lucid/Will parties."_
3. `†` `Berserked` (Lv 160, Hard/Extreme Lotus, Pitched); `†` `Original Sin of Pride` (Lv 250,
   Brilliant).

> ⚠️ `DTQ`'s mid-game **table** gives Twilight Mark's source as "Guardian Angel Slime". Its own
> prose and the wiki both say Lucid / Will. The table cell is wrong — Guardian Angel Slime drops
> the _Guardian Angel Ring_.

### Eye accessory — one path with a genuine fork

1. `Aquatic Letter Eye Accessory` (Lv 100, Zakum, 8★ cap) — **8★ / Epic main stat / none**.
2. `Black Bean Mark` (Lv 135, Pink Bean, 20★ cap) — **10★ / Epic 6% / none**.
3. Fork, and the condition is drop luck rather than choice:
   - `Papulatus Mark` (Lv 145, Chaos Papulatus, 30★) — best, but `DTQ`: _"a super rare drop that
     not many people get."_ Can be **transposed onto** `Sweetwater Monocle` for extra stats and
     higher-tier potential.
   - `Sweetwater Monocle` (Lv 160, Commerci dailies) — the reliable route; grind-gated, not
     luck-gated.
     Either way: **17★ / Legendary / invest** → 22★.
4. `†` `Magic Eyepatch` (Lv 160, Hard Damien, Pitched).

### Pendant ×2 — two paths, one per slot

**Slot 1:** `Chaos Horntail Necklace` (Lv 120, 15★ cap, **10★ / Epic**) → `Superior Engraved Gollux
Pendant` (Lv 150, 30★, **17★ → 22★ / Epic-Unique → Legendary**).

**Slot 2:** `Mechanator Pendant` (Lv 120, Arkarium, 15★ cap) → `Dominator Pendant` (Lv 140,
Arkarium, 30★) **or** `Daybreak Pendant` (Lv 140, Verus Hilla / Chosen Seren, Dawn Boss Set).
Stop: **15★, stretch 17★ / Epic-Unique / none (pendants take flames, but see the drop-gear note)**.
`UG` P1: _"the Arkarium pendants can go to 15-17 stars if you really want to since they will be
around forever potentially as drop gear after they're used to get you to better equips. You can
safeguard the Dominator's pendant if you'd like."_
`DTQ`: _"Equipping two Superior Gollux Pendants no longer contributes to the set effect, so you're
better off with Dominator for the boss flames."_ — the branch condition for slot 2 is
**set-effect accounting, not raw stats**.

`†` `Source of Suffering` (Lv 160, Hard Verus Hilla, Pitched); `†` `Oath of Death` (Lv 250,
Brilliant).

### Rings ×4 — the one slot with a genuine menu

Four slots, and the candidates are not ordered into a single ladder. Stated options:

- Early fillers: `Silver Blossom Ring` (Lv 110, Horntail, 10★ cap), `Noble Ifia's Ring` (Lv 120),
  **event rings** (`UG`: _"definitely get 2-3 on your character for damage at first, then
  eventually to re-utilize as drop gear"_). Stop: **10★ / Epic / n-a**.
- Mid/late keepers, all 30★-capable, all worth 17★ → 21–22★:
  `Superior Gollux Ring` (Lv 150), `Reinforced Gollux Ring` (Lv 140),
  `Kanna's Treasure` (Lv 140, Princess No), `Dawn Guardian Angel Ring` (Lv 160, Guardian Angel
  Slime + `Guardian Angel Ring Set Conversion Scroll`), `Meister Ring` (Lv 140, Accessory-crafting
  Meister). `UG` P3 targets **21–22★ on Kanna's Treasure and the Meister Ring** by name.
- `†` `Endless Terror` (Lv 200, Chaos Gloom, Pitched); `†` `Whisper of the Source`,
  `†` `Blissful Nightmare` (Lv 250, Brilliant).

**Branch conditions:** Superior + Reinforced Gollux together feed the Gollux set counts; Dawn
Guardian Angel Ring + Twilight Mark give the **Dawn 2-set (+10% Boss Damage)** (`DTQ`, wiki);
Kanna's Treasure and Meister Ring are pure stat sticks with no set. Event rings are availability-
gated and later become drop gear.

**Rings never take flames** (`REPO` `rules.ts` `flame-ineligible-slot`; `DTQ`: _"Some item slots
cannot gain bonus stats: Emblem, Badge, Medal, Secondary, Shoulder, Rings"_). Stars + cubes only.

### Belt — one path

1. `Cracked` → `Solid` → `Reinforced Engraved Gollux Belt` (Lv 120/130/140), or `Golden Clover
Belt` (Lv 140, Pink Bean) — **10★ / Epic / none**. `UG`: _"Keep spare belts for transfer
   hammering"_ — these exist to be hammered into the next stage.
2. `Superior Engraved Gollux Belt` (Lv 150, 30★) — **17★ / Epic-Unique → Legendary / invest** → 22★.
3. `†` `Dreamy Belt` (Lv 200, Hard Lucid, Pitched).

### Heart (android heart) — one path, event-gated

1. `Lidium Heart` (Lv 30, event or craftable-and-expiring) — **5★ / Epic / n-a**. `DTQ` early: _5 Stars_.
2. `Fairy Heart` (Lv 100, event) — **8★ (its hard cap) / Legendary / n-a**. `DTQ`: _"This item has
   the level 120+ Potential, which is much better than the Level 30 Lidium heart."_
   **Branch condition: event availability.** `DTQ`: _"an event only Android Heart that comes around
   every other event."_
3. `†` `Black Heart` (Lv 120, Hard Lotus, Pitched) — **time-limited, 20 days, cannot be extended**
   (`DTQ`, `GL`), which is why `DTQ` says _"You'll likely want to keep your Fairy Heart as your
   main item."_ `†` `Total Control` (Lv 200, Pitched).

> ⚠️ `DTQ`'s tables give Fairy Heart **17★ / 22★**. The wiki caps it at **8★**. Wiki wins; `DTQ` is
> applying a blanket row value. Hearts also take no flames (`REPO` `rules.ts`).

### Badge — one path. No star force, no potential, no flames.

1. `Crystal Ventus Badge` (Lv 130, Magnus). `DTQ`: _"It cannot be cubed or Star Force'd, so you're
   not missing out too much."_
2. `†` `Genesis Badge` (Lv 200, Black Mage, Pitched).

### Pocket — one path. No star force, no potential; **does** take flames.

1. `Stone of Eternal Life` (Hilla).
2. `Pink Holy Cup` (Lv 140, Pink Bean).
3. `†` `Cursed Red / Blue / Green / Yellow Spellbook` (Lv 160, Hard Will, Pitched).

Pocket items are explicitly _not_ in the flame-ineligible list (`REPO` `rules.ts`:
"Pocket items are NOT excluded — they do take flames").

### Medal — no star force, no potential, no flames

`World Tree Guardian` (Root Abyss questline) early, `Seven Day Monster Parker Medal` late (`DTQ`).
`†` `Immortal Legacy` (Lv 250, Brilliant) is the only medal with a damage set effect. Not a
progression lever; listed for completeness.

---

## 4. Star force: what is attainable, and the per-stage numbers

### 4.1 The system, and why both public guides are stale

GMS runs the post-2025 30★ system: cap 25★ → 30★, **failure no longer decreases stars**, rewritten
success/destruction table, safeguard cost 100% → 200%, safeguard extended to 17★
(`docs/research/formulas.md` §4A, "NEXT: Destiny Weapon & Star Force Reorganization
(ver. 1.2.401), KMS 2025-03-20"; encoded in `REPO` `starforce.ts`).

⚠️ `DTQ`'s star-force table still shows "Drop" on failure and stops at 22→23. `GL` still says
_"Decrease Star Force level by 1"_ and _"max. 25 stars"_. **Use `REPO` `starforce.ts` for rates.**
Their _targets_ are still current; their _mechanics_ are not.

### 4.2 Why 22★ is the ceiling and 30★ is mythical

**Mechanical reason.** `REPO` `starforce.ts` `LAST_STAT_STAR = 22`:

> "Class stat granted per star for stars 16-22 (all slot types…). **Stars 23-30 grant no class
> stat.**" — `formulas.md` §4A §1.4, from
> [Star Force Enhancement/Stat Tables](https://maplestorywiki.net/w/Star_Force_Enhancement/Stat_Tables)

A Lv 200 armour piece gains **+15 main stat per star** at 16–22★ and **0** at 23–30★.

**Probabilistic reason.** From `REPO` `STAR_RATES` (per attempt; Enhancement Mode 1, no Star Catch,
safeguard unavailable above 17★):

| Step          | Success | Destroy   | Booms per success | Attempts per success |
| ------------- | ------- | --------- | ----------------- | -------------------- |
| 15→16, 16→17  | 30%     | 2.1%      | 0.07              | 3.3                  |
| 17→18, 18→19  | 15%     | 6.8%      | 0.45              | 6.7                  |
| 20→21         | 30%     | 10.5%     | 0.35              | 3.3                  |
| 21→22         | 15%     | 12.75%    | 0.85              | 6.7                  |
| **22→23**     | 15%     | **17%**   | **1.13**          | 6.7                  |
| 23→24 … 25→26 | 10%     | 18%       | 1.80              | 10                   |
| 26→27         | 7%      | 18.6%     | 2.66              | 14.3                 |
| 27→28         | 5%      | 19%       | 3.80              | 20                   |
| 28→29         | 3%      | 19.4%     | 6.47              | 33.3                 |
| **29→30**     | **1%**  | **19.8%** | **19.8**          | **100**              |

A boom returns the item to its Equipment Trace star (`REPO` `TRACE_RECOVERY`: 20★ for a boom at
26–30★, 19★ at 23–25★, 17★ at 21–22★, 12★ at 15–19★), so the end-to-end expectation compounds.
Solving the Markov chain over `STAR_RATES` + `TRACE_RECOVERY` (Mode 1, no Star Catch, safeguard
off, destroyed item always restored from trace — derivation reproduced in
`gear-progression.spec.ts`):

| Climb         | Expected attempts | Expected booms  |
| ------------- | ----------------- | --------------- |
| 0★ → 17★      | 35                | 0.1             |
| 17★ → 21★     | 102               | 4.0             |
| **17★ → 22★** | **196**           | **8.2**         |
| 17★ → 23★     | 425               | 18.6            |
| 17★ → 25★     | 3,127             | 144             |
| **22★ → 30★** | **≈ 2.4 × 10⁷**   | **≈ 1.1 × 10⁶** |

**One item to 30★ costs about 24 million attempts and about 1.1 million destroyed copies, in
expectation.** 30★ exists in GMS; it is not a goal, and the tracker must never generate a 30★
candidate. 22★ is the real ceiling, and even that costs ~196 attempts and ~8 booms from 17★ —
which is why every guide treats 22★ as a _late_ activity done with backups, on events.

**The one real exception:** weapons get a discontinuity at 23★ — `REPO` `WEAPON_ATT_DELTA_16_25`
jumps from +12/+13/+14/+17 at 22★ to **+30/+31/+32/+34** at 23★. It is the only mechanical reason
anyone looks past 22★, and at 1.13 expected booms per success it is a lottery. No guide
recommends it.

**Why 17★ is the universal mid-tier number.** Safeguard exists at 15★, 16★, 17★ only, converts
destruction to maintain, and costs +200% base (`REPO` `SAFEGUARD_STARS`,
`SAFEGUARD_COST_SURCHARGE`). 0★→17★ is ~35 attempts and ~0.1 expected booms _without_ safeguard,
and boom-free _with_ it. The first unprotected attempt is 17→18. **17★ is where the risk profile
changes** — that is the whole reason "safeguard to 17, then decide" is the convention and why
every guide's mid-game column reads 17.

**Events.** `GL` documents Sunny Sunday variants: 30% star-force discount; guaranteed 5/10/15★;
"+2 stars below 10★"; and the **Shining Star Force Event** (discount + 5/10/15 together), which it
calls _"the best opportunity to Star Force your gear especially to 17-star"_. `UG`: _"Aim for
pitched items and star force them on event if you can."_ Any push past 17★ is an event activity —
encoded as `starsOnEvent`.

### 4.3 The AbsoLab case (the user's example), and the per-tier table

Neither guide ever puts AbsoLab at 22★:

- `DTQ` **mid-game** table: `Absolab / Cape, Shoes, Gloves, Weapon, Shoulder / Legendary /
**17 Stars** / Absolab Dailies-Lomien`.
- `DTQ` **end-game** table: **AbsoLab does not appear at all.** Those slots read
  `Arcane / … / 22 Stars / Lucid`. The 22★ row belongs to the item that replaced it.
- `DTQ`: _"It's time to replace all your Absolab Gear with Arcane Gear, which comes from defeating
  Lucid. This gear is quite easy to get, so getting it to 22 Star should be the priority as soon
  as possible."_
- `UG` P2 sets AbsoLab potential at Epic 6% / Unique 15% _because_ Arcane replaces it, with one
  carve-out: _"IF you are leveling very quickly and are being held back by the time gates behind
  arcane items, feel free to continue upgrading your Absolab set in order to keep up with damage
  so to keep progressing in levels/content."_

**Why Arcane "comes too fast" — the gating answer.** AbsoLab is farmed from Lv 190 Scrapyard and
Dark World Tree weeklies plus Lotus/Damien materials (`GL`). Arcane Umbra drops from Lucid, whose
**entry level is 220** and whose Easy mode has a published solo CP gate of **2,000,000** — the same
gate as Normal Guardian Angel Slime and Easy Will (`bosses.json`, §5). Those ~30 levels are the
same Arcane River levelling run during which AbsoLab is being farmed. You wear AbsoLab for the
stretch between Lomien and Lucid; you do not finish it.

**Prescribed: AbsoLab 17★, no event push, Epic 6%+ (Unique 15%+ only if cubes are free), flames
opportunistic.** Anything above 17★ on AbsoLab should be flagged as over-investment, not offered.

| Stage                                                                       | Item Lv   | Hard cap  | **Stop at**          | On event              | Potential                                   | Flames             | Sources                                                                                                                                                                     |
| --------------------------------------------------------------------------- | --------- | --------- | -------------------- | --------------------- | ------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pensalir / Lv 140 mob gear                                                  | 140       | 30★       | **10★** (weapon 12★) | —                     | Epic                                        | none               | `DTQ` early; `GL` "12-stars on each item is suggested"                                                                                                                      |
| Boss accessories Lv 100–120                                                 | 100–120   | 8–15★     | **8–10★**            | —                     | Epic 6%                                     | none               | `DTQ` early; `UG` P1 "Get all items except magnus cape, boots, and belt 10 star max"                                                                                        |
| Boss accessories Lv 128–137 (Will o' the Wisps, Dea Sidus, Black Bean Mark) | 128–137   | **20★**   | **10★**              | 12★                   | Epic 6%                                     | none               | as above                                                                                                                                                                    |
| Arkarium pendants                                                           | 120 / 140 | 15★ / 30★ | **15★**              | **17★**               | Epic-Unique                                 | none               | `UG` P1 "can go to 15-17 stars … around forever potentially as drop gear"                                                                                                   |
| **CRA (Lv 150)**                                                            | 150       | 30★       | **17★**              | **21–22★**            | **Legendary 15%+**                          | **invest**         | `UG` P2 "Get CRA to 17 stars (can push further to 21 stars if you'd like)"; `UG` P3 "21-22 star CRA items"; `DTQ` mid 17★ / end "keep your CRA gear and max it to 22 stars" |
| **AbsoLab (Lv 160)**                                                        | 160       | 30★       | **17★**              | **17★ — do not push** | Epic 6%+ / Unique 15%+                      | opportunistic      | §4.3                                                                                                                                                                        |
| **Superior Gollux (Lv 150)**                                                | 150       | 30★       | **17★**              | **22★**               | Epic-Unique → Legendary with Hellux backups | invest             | `DTQ` mid 17★ / end 22★; `UG` P2, P4 "22 star everything (other than pitched)"                                                                                              |
| Dawn Boss accessories                                                       | 140–160   | 30★       | **17★**              | **22★**               | Legendary                                   | invest             | `DTQ` mid 17★ (Twilight Mark) / end 22★ (Daybreak)                                                                                                                          |
| Kanna's Treasure / Meister Ring                                             | 140       | 30★       | **17★**              | **21–22★**            | Legendary                                   | n/a (rings)        | `UG` P3 "21-22 star Kanna's Treasure & Meister ring"                                                                                                                        |
| **Arcane Umbra armour (Lv 200)**                                            | 200       | 30★       | **17★**              | **22★**               | **Legendary 3-line 23%+**                   | invest             | `UG` P3 "Arcane items should all be 17 stars first, then 3 Line Legendary with 23%+ Stat each"; `DTQ` end 22★                                                               |
| **Arcane Umbra weapon**                                                     | 200       | 30★       | **17★**              | ⚠️ disputed           | Legendary, 2+ ATT% lines + IED/Boss         | invest (T6–T7 ATT) | §4.4                                                                                                                                                                        |
| Genesis weapon                                                              | 200       | fixed 22★ | **22★, granted**     | n/a                   | Legendary 3-line ATT%                       | invest             | `REPO` `rules.ts`; wiki                                                                                                                                                     |
| **Eternal (Lv 250)**                                                        | 250       | 30★       | **22★**              | 22★                   | Legendary 3-line                            | invest             | `DTQ` end table                                                                                                                                                             |
| Pitched / Brilliant                                                         | 160–250   | 30★       | **out of scope**     | —                     | —                                           | —                  | §6                                                                                                                                                                          |

### 4.4 The one real disagreement: the Arcane Umbra weapon

`UG` Phase 3: _"**Arcane Weapon should be 17 stars (DO NOT SURPASS 17)** 3 Line Legendary with
2+ Lines of ATT% / M.ATT% and 1 Line of IED or Boss%, if not 3 Lines of ATT% / M.ATT%."_
The reasoning is replacement: the Genesis weapon arrives at a **fixed 22★** after 8 monthly Black
Mage clears, so every star bought on the Arcane weapon is discarded.

`DTQ`'s end-game table gives the weapon slot 22★, while its own prose says _"You can use the Arcane
Weapon also whilst you progress through the Genesis Weapon Liberation."_

**The module encodes `UG`'s 17★ as the prescribed stop, flagged `disputed`, with `DTQ`'s 22★
recorded.** `UG` is the more specific claim and the only one that reasons about replacement.

---

## 5. Gating — why each stage exists

This is what makes the path a path. Each stage is the gear you wear to clear the boss that drops
the next stage.

### 5.1 What is a _real_ gate, and what is not

`docs/research/bosses.md` §2.1 is blunt about this, and it is the reason this section does **not**
publish range numbers:

> "**There is no published, validated conversion from a character's stats to a boss clear.**
> What exists is a handful of blog charts by individual authors that **disagree with each other by
> up to 2×** …"
> "Attack range is a poor measurement, as are all other forms to measure damage based on visual
> numbers" — [GMS forum thread](https://forums.maplestory.nexon.net/discussion/33633/recommended-attack-range-for-bosses)

So: **no range thresholds.** Four gates _are_ hard and sourced:

1. **Entry level** — in-game hard requirement (`bosses.json`).
2. **Arcane / Sacred Force requirement** — in-game hard requirement, with a documented penalty
   curve (`bosses.json` `force`, `formulas.md` §1.11–1.12).
3. **Published minimum Combat Power** — from
   [maplestorywiki.net/w/Combat_Power](https://maplestorywiki.net/w/Combat_Power), transcribed in
   `bosses.md` §3.2 (solo) and §3.3 (per party size), in `bosses.json` as `cpGate`.
   ⚠️ These are _published minimums_, not clear predictions, and CP itself omits IED, crit rate,
   level and force (design doc §2). Advisory only.
4. **The 5%-of-total-HP loot contribution rule** — `bosses.md` §2.2 calls it _"the single
   best-behaved dataset in this document"_ because it is arithmetic, not opinion:
   > "you must deal at least **5% of the boss's total HP** to receive any loot."
   > — [GMS forums](https://forums.maplestory.nexon.net/discussion/34059/5-minimum-damage-requirement-for-bosses)
   > This is the gate that matters for a Heroic player being carried, and `UG` uses it directly:
   > _"Doing 5 Root Abyss runs to unlock CRA for phase 2, then try to manage 5% damage runs solo to
   > get carries/struggle runs (requires decent IED)"_, and _"Try to manage 5% of damage in Hellux
   > and get a carry for the rest… For Hellux carry, do 18% of phase 1 to get a carry (blue)."_

### 5.2 The gate table

All figures from `src/lib/data/bosses.json` (sourced from `bosses.md` §1.2, §3.2, §4).

| Gear stage unlocked                      | Boss(es)                                                            | Entry Lv      | Reset       | Force                      | Solo CP gate                           | 5%-of-HP loot floor  |
| ---------------------------------------- | ------------------------------------------------------------------- | ------------- | ----------- | -------------------------- | -------------------------------------- | -------------------- |
| Basic boss accessories (face, eye, belt) | Chaos Zakum                                                         | 90            | weekly      | —                          | 300,000                                | 8.4B                 |
| Earrings, ring, pendant (Horntail line)  | Chaos Horntail                                                      | 135           | daily       | —                          | 50,000                                 | 336M                 |
| Shoulder, badge                          | Normal Magnus                                                       | 155           | daily       | —                          | 100,000                                | —                    |
| Will o' the Wisps                        | Hard Hilla                                                          | 170           | weekly      | —                          | 100,000                                | 840M                 |
| Pendant (Mechanator / Dominator)         | Normal Arkarium                                                     | 140           | daily       | —                          | 100,000                                | —                    |
| Eye (Black Bean Mark), belt, pocket      | Normal Pink Bean                                                    | 140           | daily       | —                          | 50,000                                 | 105M                 |
| **Gollux tiers → Superior Gollux 4-set** | Hard Gollux (Hell)                                                  | 180           | **daily**   | —                          | (none published)                       | 8.25B                |
| Kanna's Treasure, secondary              | Normal Princess No                                                  | 180           | weekly      | —                          | 300,000                                | 25B                  |
| **CRA (Lv 150 hat/top/bottom/weapon)**   | Chaos Pierre / Von Bon / Crimson Queen / Vellum                     | 180           | weekly      | —                          | 300,000 (Vellum 500,000)               | 4–10B                |
| Eye (Papulatus Mark)                     | Chaos Papulatus                                                     | 190           | weekly      | —                          | 800,000                                | 25.2B                |
| **AbsoLab (Lv 160)**                     | Normal Lotus / Normal Damien + Scrapyard & Dark World Tree weeklies | 190           | weekly      | —                          | 1,500,000 / 2,000,000                  | 78.8B / 60B          |
| Ring (Guardian Angel), Dawn ring         | Normal Guardian Angel Slime                                         | 210           | weekly      | —                          | 2,000,000                              | 250B                 |
| **Arcane Umbra (Lv 200)**                | Easy/Normal Lucid, Easy/Normal Will                                 | **220 / 235** | weekly      | **Arcane 360 / 560–760**   | 2,000,000 / 3,500,000                  | 600B–1.26T           |
| Face (Twilight Mark)                     | Normal Lucid / Normal Will                                          | 220 / 235     | weekly      | Arcane 360 / 760           | 3,500,000                              | 1.2T                 |
| Pendant (Daybreak)                       | Normal Verus Hilla / Normal Chosen Seren                            | 250 / 260     | weekly      | Arcane 820 / Sacred 150    | 12,000,000 / 50,000,000                | 4.5T / 10.4T         |
| Earrings (Estella)                       | Normal Gloom / Normal Darknell                                      | 245 / 255     | weekly      | Arcane 730 / 850           | 3,500,000 / 4,000,000                  | 1.3T                 |
| **Genesis weapon** (8 clears)            | Hard Black Mage                                                     | 255           | **monthly** | Arcane 1320                | 50,000,000                             | 23.6T                |
| Emblem (Mitra's Rage) `†`                | Chosen Seren                                                        | 260           | weekly      | Sacred 150                 | 50,000,000                             | 10.4T                |
| **Eternal (Lv 250)**                     | Easy / Normal / Chaos Kalos                                         | 265           | weekly      | **Sacred 200 / 250 / 330** | 35,000,000 / 120,000,000 / 550,000,000 | 17.9T / 52.8T / 256T |

`UG` adds two soft gates in its own words: _"Level up to 220+ so you can at least do Lucid when you
get strong enough"_ (P1 goal), _"Level 260 allows for your origin level which will help both with
providing something to boss runs and getting your damage requirement in for carries"_ (P2), and
_"Starting working on eKalos (**80m+ CP at least**)"_ (P3) — note `UG`'s 80M CP for Easy Kalos is
**more than double** the published 35M minimum, i.e. the published gate is a floor to _enter_, not
a number at which you clear. Both are recorded.

### 5.3 The prescription this produces

For a character at a given level with a given clear list:

1. Find the highest stage whose gating boss you can already clear or be carried in (5%-of-HP rule).
2. Take every slot on that stage to its **stop point** — not further.
3. Spend the remainder on the _next_ gate's blockers: level (for entry), symbols (for force),
   and the WSE potential lines that raise damage everywhere at once.
4. When the next gate opens, move the slot forward and re-apply its stop point. Only after the
   final stage of a slot is reached does the event push to 21–22★ become the right spend.

---

## 6. Pitched / Dawn / Brilliant boss accessories

### 6.1 What each set is

| Set               | GMS name               | Items                                                                                                                                                                                                                                   | Full-set effect                                                                         | In scope?                                                          |
| ----------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Dawn              | **Dawn Boss Set**      | `Daybreak Pendant` (140), `Twilight Mark` (140), `Estella Earrings` (160), `Dawn Guardian Angel Ring` (160)                                                                                                                             | 4-set: +30 All Stats, +30 ATT/MATT, **+10% Boss Damage, +10% IED**                      | **Yes** — all four drop from _normal-mode_ bosses on the main path |
| Pitched           | **Pitched Boss Set**   | 11 items, Lv 120–200: `Black Heart`, `Berserked`, `Magic Eyepatch`, `Source of Suffering`, `Cursed …Spellbook` ×4, `Commanding Force Earring`, `Endless Terror`, `Dreamy Belt`, `Genesis Badge`, `Mitra's Rage: <Job>`, `Total Control` | 10-set: +130 All Stats, +130 ATT/MATT, **+40% Boss Damage, +19% IED, +15% Crit Damage** | **No** — §6.2                                                      |
| "Radiant"/Grandis | **Brilliant Boss Set** | `Original Sin of Pride` (face), `Whisper of the Source` (ring), `Blissful Nightmare` (ring), `Oath of Death` (pendant), `Immortal Legacy` (medal) — all Lv 250                                                                          | 5-set: +80 All Stats, +80 ATT/MATT, **+30% Boss Damage, +15% IED, +5% Crit Damage**     | **No** — §6.2                                                      |

Effects from [Dawn Boss Set](https://maplestorywiki.net/w/Dawn_Boss_Set),
[Pitched Boss Set](https://maplestorywiki.net/w/Pitched_Boss_Set),
[Brilliant Boss Set](https://maplestorywiki.net/w/Brilliant_Boss_Set) (raw wikitext).
`sets.json` carries these as `partial: true` — its upstream manifest **drops boss damage, IED and
crit damage**, so the wiki tables above are the complete ones.

### 6.2 Why Pitched and Brilliant are goals, not upgrades

**Sourced statements:**

- `DTQ`: _"Many of the end-game equips have super low drop rates, so even if you have all the mesos
  in the world, you can get stuck looking for these items for **months if not years** if you're on
  Reboot Servers."_
- `DTQ`: _"The Pitched-Boss Set replaces many equipment pieces, but the **drop-rate is terrible**.
  Some players have gone **several months without a single item drop**."_
- `DTQ`, which is exactly the behaviour the tracker should have:
  > _"The Pitch-Boss Set replaces many items in mid-game tier list. But, as mentioned, their drop
  > rate is super low, so **you may find starring your current equipment to 22 stars will give you
  > more damage whilst you wait for the item to drop**."_
- `GL`, Pitched Boss Accessories: _"Items here at very rare and hard to get."_
- `UG` puts Pitched in **Phase 4**, behind Phase 3's _"Aim for level 270-275"_, _"Leveling Legion
  (8k+)"_ and _"Starting working on eKalos (80m+ CP at least)"_. It is a phase, not a step.
- `UG` on investing in them: _"backups not always necessary for pitched items. They're only really
  worth using if they're 22star in most\* cases anyway."_

**The structural argument — where "1–2 years" comes from.** Every Pitched source is a
**weekly-reset** boss (`bosses.json`, from `bosses.md` §1.7):

| Item                     | Boss               | Reset       | Entry Lv | Solo CP gate |
| ------------------------ | ------------------ | ----------- | -------- | ------------ |
| Berserked, Black Heart   | `hard-lotus`       | weekly      | 190      | 5,000,000    |
| Magic Eyepatch           | `hard-damien`      | weekly      | 190      | 6,000,000    |
| Dreamy Belt              | `hard-lucid`       | weekly      | 220      | 18,000,000   |
| Cursed Spellbook         | `hard-will`        | weekly      | 235      | 20,000,000   |
| Endless Terror           | `chaos-gloom`      | weekly      | 245      | 20,000,000   |
| Source of Suffering      | `hard-verus-hilla` | weekly      | 250      | 24,000,000   |
| Commanding Force Earring | `hard-darknell`    | weekly      | 255      | 22,000,000   |
| Genesis Badge            | `hard-black-mage`  | **monthly** | 255      | 50,000,000   |

So a character gets **at most 52 rolls a year** on any one Pitched item, and **12 a year** on the
Genesis Badge. Under a geometric model with per-clear probability _p_, expected clears to first
drop is `1/p`:

| _p_ per clear | Expected clears | Weekly boss ⇒ | Monthly boss ⇒ |
| ------------- | --------------- | ------------- | -------------- |
| 5%            | 20              | 4.6 months    | 1.7 years      |
| 2%            | 50              | 11.5 months   | 4.2 years      |
| **1%**        | **100**         | **1.9 years** | 8.3 years      |
| 0.5%          | 200             | 3.8 years     | 16.7 years     |

This is the arithmetic behind "1–2 years", and it holds for any _p_ at or below ~1%, which is where
every qualitative statement above points.

**⚠️ UNVERIFIED: the actual per-clear drop probability.** I could not source a number.
MapleStory Wiki publishes item sources but no rates;
`maplestory.nexon.com/Guide/OtherProbability/DropItem` returns a JS shell with no data to a
non-browser client; GMS Nexon pages 403; the session's WebSearch quota was exhausted before
community trackers could be swept, and DuckDuckGo / Bing HTML endpoints both refuse scripted
requests. The module encodes the **sensitivity table**, not a drop rate, with
`dropRatePercent: undefined`.

**A third argument, which is cheaper and does not need a drop rate:** the marginal value of _one_
Pitched piece is small and can be negative. The Pitched 2-set is +10 All Stats / +10 ATT /
**+10% Boss Damage** — identical Boss Damage to the **Dawn 2-set**, which is reachable from
_normal-mode_ Lucid/Will (Twilight Mark) plus Verus Hilla/Seren (Daybreak Pendant). And a single
Pitched item usually _breaks_ an existing set: a Commanding Force Earring displaces Superior Gollux
Earrings, costing the Superior Gollux 4-set's +30% Boss / +30% IED unless four other Gollux pieces
are already equipped. `UG`'s "only really worth using if they're 22star" is the same observation.

### 6.3 How the tracker must present them

- **Never** as a ranked candidate, never with a `gainPct`, never with a cost.
- A separate, unranked **"Long-term goals"** list: item, slot, source boss + difficulty, reset
  cadence, set completed, and the reason it is not ranked.
- When a Pitched item **is already equipped**, treat it as normal gear — star force / cube / flame
  candidates for it are legitimate (`UG`: 22★ on pitched).
- **Never suppress the upgrade it would replace.** `DTQ`'s advice is literally to keep starring
  what you have while you wait.

---

## 7. Investment order

### 7.1 The order, per phase

Reconstructed from `UG`'s four phases plus `DTQ`/`GL`. Everything is a quote or a direct paraphrase.

**Phase 0 — fill every slot, cheaply.** `GL`: _"Upon reaching Lv. 140, remember to fill all
equipment slots and Star Force each equipment to at least 12 Stars … reveal all the potentials on
your equipment and to use cubes to reroll for some %Main Stat or Epic Potential."_ And:
_"It does not matter if the gear will be replaced, this will help you to defeat enemies."_

**Phase 1 — cheap stars everywhere; Epic 6%; WSE first and furthest.**

- 10★ on everything, 12★ on the weapon (`DTQ` early; `UG` P1 _"Get all items except magnus cape,
  boots, and belt 10 star max"_).
- _"Epic potential on everything that is a Basic Boss Accessory and get to 6% main stat"_ (`UG` P1).
- **Weapon / Secondary / Emblem are the exception to every stopping rule.** `GL`: _"Your main focus
  … Weapon, Secondary Weapon, and Emblem to unique first as their potentials can provide stats like
  %Attack/Magic Attack, %Ignore DEF and %Boss Damage."_ `UG` P1: the Lv 100 emblem and secondary
  _"can be potentially to Unique-Legendary with 1-2 lines of ATT% each."_ They take no stars and no
  flames, and the emblem and Princess No secondary are never replaced — cubing them early is
  permanent value.
- Flames: not yet (`GL`: _"For now don't worry too much about Bonus Stats and Rebirth Flames"_).

**Phase 2 — 17★ across the board; Legendary on CRA; Epic/Unique on AbsoLab and Gollux.**

- CRA → 17★ (21★ optional), **Legendary 15%+**, because it lasts to Kalos.
- AbsoLab + Superior Gollux → 17★, **Epic 6%+ / Unique 15%+**, explicitly because AbsoLab is
  replaced and Gollux is transfer-hammered into.
- Gloves → 1 line % Crit Damage (2 lines is _not_ a Phase 2 goal — cost).
- Flames enter here, on keepers: _"All/most items should have decent → good flames, ideally high
  stat comparatively with 3%+ stat"_ (`UG` P2).
- WSE: _"should now have at least 5 total lines of ATT% / M.ATT% and some IED / Boss %."_

**Phase 3 — replace first, then stars, then potential.**
`UG`: _"Arcane items should all be **17 stars first, then** 3 Line Legendary with 23%+ Stat each."_
— **stars before cubes at a tier transition.** Then _"Arcane Weapon should have T6-T7 ATT / M.ATT
flames"_, _"21-22 star CRA items"_, _"21-22 star Kanna's Treasure & Meister ring"_.

**Phase 4 — 22★ on everything terminal, 3-line stat, high flames everywhere.**
`UG` P4: _"22 star everything (other than pitched) that's not meant for farming / 3L stat items /
Full farming gear / High flames on ALL items."_

### 7.2 Where flames fit

After the cheap star floor and after WSE potential, and **on gear you are keeping**:

> "When you get extra flames, try using them on items you'd be keeping for a while like CRA and
> always make sure your weapon has good ATT / M.ATT flames" — `UG`, general tips

Mechanically constrained: **secondary, emblem, badge, medal, rings, androids, hearts, shoulders and
totems take no flames at all** (`REPO` `rules.ts` `flame-ineligible-slot`, three named exceptions:
Immortal Legacy, Scarlet Shoulder, Ancient Slate Replica). `DTQ`'s shorter list ("Emblem, Badge,
Medal, Secondary, Shoulder, Rings") is consistent as far as it goes.

Flame tiers (`DTQ`): Powerful Rebirth Flame → T1–4 normal / **T3–6 boss** gear; Eternal and Black
Eternal Rebirth Flame → T2–5 normal / **T4–7 boss** gear. Boss-dropped equipment gets 4 guaranteed
lines vs 1–4 random, which is a second independent reason flames go on CRA / AbsoLab / Arcane /
Gollux rather than Pensalir.

### 7.3 The legitimate reason to over-invest in gear you have "passed"

Old accessories get a second life as **drop / meso gear** — a different build, not a damage upgrade:

> "IF ACTIVELY GRINDING & KILLING MOBS, get 100% meso rate and at least 60% Item drop rate on your
> accessories (rings(4), earrings, pendants (2) face, and eye). **Items must be Legendary** to get
> meso or drop rate." — `UG`, general tips
> "the Arkarium pendants can go to 15-17 stars … since they will be around forever potentially as
> drop gear after they're used to get you to better equips" — `UG` P1

Max from equipment: **100% meso rate (5 lines)**, **200% drop rate (10 lines)** (`UG`). This module
does not model the drop-gear build; it only records that a Legendary roll on a passed accessory is
not necessarily a mistake.

---

## 8. What is UNVERIFIED / disputed

1. **Pitched / Brilliant per-clear drop rates.** No number found (§6.2). Encoded as `undefined`
   with a sensitivity table instead.
2. **The Google Slides "Heroic Beginner Guide"** — HTTP 401 on every export endpoint. Not used.
3. **Range-to-boss thresholds.** Do not exist in validated form; `bosses.md` §2.1 records charts
   that disagree by up to 2× and community rejection of range as a proxy. Only entry level, force,
   published CP minimums and the 5%-HP rule are encoded.
4. **Eternal cape / shoes / gloves / shoulder in GMS Heroic today.** The items exist at Lv 250 /
   30★ ([cape](https://maplestorywiki.net/w/Eternal_Knight_Cape),
   [gloves](https://maplestorywiki.net/w/Eternal_Knight_Gloves)) and `sets.json` lists them in the
   8-piece Eternal set, but `DTQ`'s end-game table keeps Arcane in those four slots. Flagged
   `disputed`.
5. **Arcane Umbra weapon star target** — `UG` 17★ hard stop vs `DTQ` 22★ (§4.4). `UG` default.
6. **`DTQ`'s Fairy Heart 17★ / 22★** contradicts the wiki's 8★ hard cap. Wiki used.
7. **`DTQ`'s "Gold Knight's Emblem"** — not a GMS item name; it is `Gold Maple Leaf Emblem`.
8. **`DTQ`'s Twilight Mark source** ("Guardian Angel Slime") contradicts its own prose and the
   wiki (Lucid / Will).
9. **`UG`'s 80M CP for Easy Kalos** vs the published 35M minimum (§5.2). Both recorded; they
   measure different things (comfortable clear vs published floor).
10. **Meso / day cost of any of this.** Out of scope here; `starforce.ts` owns the meso model and
    no guide publishes flame or cube counts.
