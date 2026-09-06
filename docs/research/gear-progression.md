# Gear progression, transient vs terminal gear, and realistic star-force ceilings

Scope: **GMS Heroic (Reboot), 2026**. Written to fix a specific defect in the tracker: it ranks
what is *mathematically possible* rather than what a real player would *do*. Two concepts were
missing entirely — **which gear is a stepping stone**, and **how far you invest before moving on**.

Every claim below carries a source. Numbers I could not source are marked **UNVERIFIED** and are
not encoded in `src/lib/data/gear-progression.ts`.

Consumed by `src/lib/data/gear-progression.ts` (tables) and `…/gear-progression.spec.ts` (tests).

---

## 0. Sources, and how much each is worth

| Key | Source | What it is | Trust notes |
|---|---|---|---|
| `UG` | [GMS Gear Progression Guide, UncappedGames, May 2024 (upd. 2024-06-11)](https://docs.google.com/document/d/1ITQx0vhNCiP9unJpV64AZgZDU-w2za4w-xcxGhbmXfY/edit) | Phase 1–4 Reboot progression doc. Fetched via `…/export?format=txt`. | **The best source for this question.** It is the only guide that states *stopping points* and *why*. Explicitly Kronos/Hyperion (Heroic). |
| `DTQ` | [DigitalTQ MapleStory Progression Guide](https://www.digitaltq.com/maplestory-progression-guide) | Early / Mid / End-game tables: item, slot, potential aim, **star-force aim**, source. | Covers both Reboot and Regular. Its *star-force mechanics* section is **stale** (pre-2025 revamp — see §3.1); its *targets* still match community practice. |
| `GL` | [Grandis Library — Progression Guide](https://grandislibrary.com/content/progression-guide) and [Upgrading & Enhancing Equipment](https://www.grandislibrary.com/contents/upgrading-enhancing-equipment) | Content-ordering guide with a full boss-reward list and a gear-tier list. | Deliberately non-prescriptive ("not a step by step guide"). Its star-force section also predates the 2025 revamp ("Decrease Star Force level by 1", "max. 25 stars"). |
| `WIKI` | [MapleStory Wiki](https://maplestorywiki.net) item / set pages (fetched as `?action=raw`) | Per-item: exact name, level, **`starForceEnhancements` hard cap**, source boss, set membership. Per-set: full effect table. | Authoritative for names, levels and caps. Does **not** publish drop rates. |
| `REPO` | `src/lib/data/starforce.ts`, `src/lib/data/sets.json`, `src/lib/data/items/catalogue.json`, `src/lib/data/bosses.json` | Already-researched in-repo tables (`docs/research/formulas.md` §4A, `bosses.md`). | Used for star-force rates, set effects, boss reset periods, and to verify every item name. |

**Could not load:** the Google Slides *Heroic Beginner Guide*
(`docs/presentation/d/1qhdHK0GNK3qoKZUe_27yFWQ2hMAZy-ovkICKsH1-f2c`) — every export endpoint
(`/export/txt`, `/pdf`, `/pptx`, `/html`) returns **HTTP 401**. Nothing from it is used here.
Nexon's own pages return JS shells with no data (confirmed for `maplestory.nexon.com` and
`maplestory.com`), as the brief predicted.

**Naming correction.** The user's "Radiant / Grandis" set is called the **Brilliant Boss Set** in
GMS. `gmsName=Brilliant Boss Set` on
[maplestorywiki.net/w/Brilliant_Boss_Set](https://maplestorywiki.net/w/Brilliant_Boss_Set), and
`src/lib/data/sets.json` uses the same name. "Radiant" is not a GMS item or set name.

---

## 1. The core distinction: TRANSIENT vs TERMINAL

> "The reason we don't need to surpass Epic/Unique here is because Abso items will be **replaced
> with Arcane** eventually and, thus, **holding less value in the long run**." — `UG`, Phase 2

> "Get CRA to Legendary with 15%+ stat **since they are going to be with you for a very long time**
> and there's no ideal transferring items for this other than itself" — `UG`, Phase 2

That is the whole idea, stated by the source guide in two sentences. A piece is:

- **TRANSIENT** — a successor exists, is reachable on the normal progression path, and will
  arrive on a timescale of weeks-to-months. Invest the *minimum that keeps you killing things*.
- **TERMINAL** — no successor exists, or the only successor is out of scope (§4). This is where
  star force past 17★, Legendary 3-line potential, and good flames belong.

### 1.1 Three independent signals that a piece is transient

1. **A named successor in the guides.** `UG` and `DTQ` both lay the ladder out slot by slot (§2).
2. **A hard star-force cap below 30★.** The wiki's per-item `starForceEnhancements` field is the
   mechanical cap, set by item level (`REPO` `MAX_STARS_BY_LEVEL`, which agrees with the wiki on
   every item checked). A piece that physically cannot pass 20★ is a dead end by construction:

   | Item | Lv | Hard cap | Successor | Successor cap |
   |---|---|---|---|---|
   | Aquatic Letter Eye Accessory | 100 | **8★** | Black Bean Mark → Sweetwater Monocle / Magic Eyepatch | 20★ / 30★ |
   | Silver Blossom Ring | 110 | **10★** | Gollux / Kanna's Treasure / Meister Ring | 30★ |
   | Condensed Power Crystal | 110 | **10★** | Twilight Mark | 30★ |
   | Royal Black Metal Shoulder | 120 | **15★** | AbsoLab shoulder | 30★ |
   | Chaos Horntail Necklace, Mechanator Pendant | 120 | **15★** | Dominator Pendant / Superior Gollux Pendant | 30★ |
   | **Will o' the Wisps** | **130** | **20★** | **Superior Gollux Earrings** | **30★** |
   | Dea Sidus Earring | 130 | **20★** | Superior Gollux Earrings | 30★ |
   | Black Bean Mark | 135 | **20★** | Papulatus Mark / Sweetwater Monocle | 30★ |
   | Fairy Heart | 100 | **8★** | (none in practice — see §2 heart) | — |

   Sources: each item's wiki page, e.g.
   [Will o' the Wisps](https://maplestorywiki.net/w/Will_o%27_the_Wisps) (`reqLevel=130`,
   `starForceEnhancements=20`),
   [Superior Gollux Earrings](https://maplestorywiki.net/w/Superior_Gollux_Earrings)
   (`reqLevel=150`, `starForceEnhancements=30`),
   [Dea Sidus Earring](https://maplestorywiki.net/w/Dea_Sidus_Earring),
   [Silver Blossom Ring](https://maplestorywiki.net/w/Silver_Blossom_Ring),
   [Aquatic Letter Eye Accessory](https://maplestorywiki.net/w/Aquatic_Letter_Eye_Accessory),
   [Royal Black Metal Shoulder](https://maplestorywiki.net/w/Royal_Black_Metal_Shoulder),
   [Fairy Heart](https://maplestorywiki.net/w/Fairy_Heart).
3. **Transfer-hammer intent.** `UG` repeatedly says to keep *spares* of a piece specifically to
   transfer-hammer its stars/potential into the successor: "Keep spare Dominator pendants for
   backups/transfer hammer", "you will eventually be transfer hammering from Pink Bean belts or
   even reinforced Gollux belts into superior in order to save meso". An item you plan to hammer
   *out of* is by definition transient — but note the mechanic caps what you carry over:
   *"you will lose one Star Force while transferring and any potentials above Epic will be dropped
   down to Epic"* (`GL`, Upgrading & Enhancing). That is exactly why `UG` says Epic 6% on the
   transient piece and not Legendary.

### 1.2 The user's worked example, fully sourced

**Will o' the Wisps** (earrings, Lv 130, Hard Hilla, Boss Accessory Set, **20★ cap**)
→ **Superior Gollux Earrings** (Lv 150, Hell Gollux drop or 700 Gollux Coins from Lucia,
Superior Gollux Set, **30★ cap**)
→ *(out of scope)* Commanding Force Earring (Lv 200, Hard Darknell, Pitched Boss Set).

- Ladder positions: `DTQ` mid-game table lists **Superior Gollux Earrings / Earrings / Legendary /
  17 Stars / Gollux**; `DTQ` end-game table lists **Commanding Force Earring / Earrings /
  Legendary / 22 Stars / Hard Darknell**.
- `UG` Phase 2 items include "Gollux — Superior Belt, Superior Earring"; Phase 4 includes
  "CDarknell — Commanding Force Earring".
- Set membership from `sets.json` and the wiki: `Will o' the Wisps` and `Dea Sidus Earring` are both
  in the **Boss Accessory Set**; `Superior Gollux Earrings` is in the **Superior Gollux Set**;
  `Estella Earrings` (Lv 160, Gloom / Darknell) is the **Dawn Boss Set** earring;
  `Commanding Force Earring` is the **Pitched Boss Set** earring.
- Why Superior Gollux wins despite leaving the Boss Accessory Set: the **4-set Superior Gollux
  effect is +30% Boss Damage and +30% IED** (screenshot-verified in `sets.json`,
  `partial: false`), against the Boss Accessory Set's +10% IED at 7 pieces and +10% Boss Damage at
  9. You can still reach the 9-piece Boss Accessory threshold without an earring: face, eye,
  3 rings, second pendant, shoulder, pocket and badge are all Boss Accessory members
  ([Boss Accessory Set](https://maplestorywiki.net/w/Boss_Accessory_Set)).

So: 3-lining a Will o' the Wisps is exactly the failure the tracker was making. It is a
20★-capped Lv 130 stepping stone whose successor is a 30★ Lv 150 piece that carries a 30% boss /
30% IED set with it.

---

## 2. The gear ladder, per slot (GMS Heroic, ~Lv 140 → endgame)

Legend: **T** = transient (do not over-invest), **★T** = terminal (invest here).
`†` marks an out-of-scope Pitched/Brilliant item — listed so the ladder is complete, **never** as a
ranked upgrade (§4).

Armour rungs are *families*: the actual item name is job-branch specific (e.g. the CRA hat is
`Royal Warrior Helm` / `Royal Dunwitch Hat` / `Royal Ranger Beret` / `Royal Assassin Hood` /
`Royal Wanderer Hat`). Verified branch names are in `sets.json` and the data module's `examples`.

### Weapon
1. **T** Lv 140 Utgard / Pensalir weapon — mob drop. `DTQ` early: *12 Stars*.
2. **T** Lv 150 CRA weapon (`Fafnir …`) — Chaos Vellum. `UG` Phase 2 items.
3. **T** Lv 160 AbsoLab weapon — AbsoLab dailies / Lomien. `DTQ` mid: *17 Stars*.
4. **T** Lv 200 Arcane Umbra weapon — Lucid / Will. **Guides disagree on the target — see §3.3.**
5. **★T** Lv 200 Genesis weapon — Black Mage liberation, 8 monthly clears
   (`bosses.json`: `hard-black-mage` `reset: monthly`). Granted at a **fixed 22★, not
   enhanceable** (`REPO` `rules.ts` `liberated-weapon-fixed-star`,
   [Genesis Weapon](https://maplestorywiki.net/w/Genesis_Weapon)).

`UG` Phase 1 note: *"If you have CRA wep, you can hold off on getting the Absolab weapon until you
are in Phase 2 … you can likely get a weapon box drop and save the Absolab resources for a boss
mule."* — i.e. skip a rung entirely when the next one is close.

### Secondary (no star force, no flames)
1. **T** Lv 100 vendor secondary (Leafre, 500k) — `DTQ`: *Legendary, ATT/Boss %*.
2. **★T** Lv 140 `Princess No's …` secondary — Princess No fragments. Both guides keep this
   through endgame. `DTQ`: *"only slightly better than the Level 100 one, so you can just stick
   with your current one for a while."*

Secondaries take **no star force and no flames** (`REPO` `rules.ts` `flame-ineligible-slot`;
`DTQ` lists Secondary under both "cannot be Star Force'd" and "cannot gain bonus stats"). Cubing
is the *only* lever — which is why `UG` puts WSE potential first (§5).

### Emblem (no star force, no flames)
1. **★T** `Gold Maple Leaf Emblem` (Lv 100, quest). `DTQ`: *"best-in-slot … you can cube this to
   perfect stats"*. Cube only.
2. `†` `Mitra's Rage: <Job>` (Lv 200, Chosen Seren, **Pitched Boss Set**) —
   [wiki](https://maplestorywiki.net/w/Mitra%27s_Rage:_Warrior). Out of scope.

> ⚠️ `DTQ` calls it the "Gold Knight's Emblem". The catalogue and wiki name is
> **Gold Maple Leaf Emblem**. Use the wiki name.

### Hat / Top / Bottom (or Overall)
1. **T** Lv 140 Pensalir overall — `DTQ` early: *10 Stars*.
2. **★T** Lv 150 **CRA** hat / top / bottom (Chaos Pierre / Crimson Queen / Von Bon).
   `UG`: *"Get CRA to Legendary with 15%+ stat since they are going to be with you for a very long
   time"*. `DTQ` end-game: *"In the mean time, keep your CRA gear and max it to 22 stars."*
   Long-lived terminal-for-practical-purposes; only Eternal displaces it.
3. **★T** Lv 250 **Eternal** hat / top / bottom — Kalos (`Kalos's Residual Determination`, `GL`).
   `DTQ`: *"Defeating this boss will require an end-game party and you should already be pretty
   much maxed out."*

AbsoLab and Arcane Umbra also have hat/overall pieces, but both guides put CRA in these three
slots from Lv 150 onward (the CRA 3-set gives +50 ATT and the 4-set +30% Boss Damage —
`sets.json`, screenshot-verified).

### Shoes / Gloves / Cape / Shoulder
1. **T** Lv 140 Pensalir shoes/gloves/cape (+ `Royal Black Metal Shoulder`, Lv 120, Magnus,
   **15★ cap**). `DTQ` early: *10 Stars*.
2. **T** Lv 160 **AbsoLab** shoes / gloves / cape / shoulder — AbsoLab dailies (Scrapyard) +
   Dark World Tree weeklies, plus Lotus/Damien materials (`GL`). `DTQ` mid: *17 Stars*.
   **Transient — this is the AbsoLab case (§3.2).**
3. **★T** Lv 200 **Arcane Umbra** shoes / gloves / cape / shoulder — Lucid / Will.
   `DTQ` end: *22 Stars*; `DTQ`: *"This gear is quite easy to get, so getting it to 22 Star should
   be the priority as soon as possible."*
4. **★T** Lv 250 **Eternal** cape / shoes / gloves / shoulder — Kalos. These items exist and are
   Lv 250 / 30★ ([Eternal Knight Cape](https://maplestorywiki.net/w/Eternal_Knight_Cape),
   [Gloves](https://maplestorywiki.net/w/Eternal_Knight_Gloves)), but **`DTQ`'s end-game table
   keeps Arcane in these four slots** and puts Eternal only in hat/top/bottom. Treat Eternal
   cape/shoes/gloves/shoulder as a real but far rung. `GL` says only "[Kalos] [Lv. 250 Eternal
   Knight Gear]" without slot detail.

Gloves are the crit-damage slot: `UG` Phase 2 *"Get your Absolab Gloves to at least 1 line of
% Crit Damage … 2 lines … shouldn't be a goal due to cost for these gloves"*, then Phase 3
*"2 Line % Crit Damage on your Gloves"*. `DTQ`'s potential-aim table: GLOVES → Critical Damage %,
perfect = Critical Damage % ×3.

### Earrings
1. **T** `Will o' the Wisps` (Lv 130, Hard Hilla, **20★**) or `Dea Sidus Earring` (Lv 130,
   Horntail, **20★**).
2. **★T** `Superior Gollux Earrings` (Lv 150, Hell Gollux / 700 Gollux Coins, **30★**).
3. **T→** `Estella Earrings` (Lv 160, Gloom / Darknell, Dawn Boss Set) — only if you are chasing
   the Dawn 4-set; it costs you the Superior Gollux 4-set. Both guides keep Superior Gollux.
4. `†` `Commanding Force Earring` (Lv 200, Hard Darknell, Pitched).

### Face accessory
1. **T** `Condensed Power Crystal` (Lv 110, Zakum, **10★**). `DTQ` early: *10 Stars, Epic, Main Stat*.
2. **★T** `Twilight Mark` (Lv 140, Normal/Hard Lucid **and** Normal/Hard Will — wiki `mob` list;
   `GL`: "[Lucid / Will] [Lv. 140 Face]"). Dawn Boss Set. Alternative if you cannot party for
   Lucid/Will: `Sweetwater Tattoo` (Lv 160, Commerci) — `DTQ`.
3. `†` `Berserked` (Lv 160, Hard/Extreme Lotus, Pitched).
4. `†` `Original Sin of Pride` (Lv 250, Brilliant Boss Set).

> ⚠️ `DTQ`'s mid-game **table** lists Twilight Mark's source as "Guardian Angel Slime". Its own
> prose and the wiki both say Lucid / Will. The table cell is wrong; Guardian Angel Slime drops the
> *Guardian Angel Ring*.

### Eye accessory
1. **T** `Aquatic Letter Eye Accessory` (Lv 100, Zakum, **8★**). `DTQ` early: *8 Stars*.
2. **T** `Black Bean Mark` (Lv 135, Pink Bean, **20★**).
3. **★T** `Papulatus Mark` (Lv 145, Chaos Papulatus, **30★**) — `DTQ`: *"a super rare drop that not
   many people get"*, transposable onto `Sweetwater Monocle` (Lv 160, Commerci) for higher-tier
   potential. `Sweetwater Monocle` alone is the accessible terminal option.
4. `†` `Magic Eyepatch` (Lv 160, Hard Damien, Pitched).

### Pendant ×2
- Slot 1: **T** `Chaos Horntail Necklace` (Lv 120, **15★**) → **★T** `Superior Engraved Gollux
  Pendant` (Lv 150, **30★**).
- Slot 2: **T** `Mechanator Pendant` (Lv 120, Arkarium, **15★**) → **★T** `Dominator Pendant`
  (Lv 140, Arkarium, **30★**) or **★T** `Daybreak Pendant` (Lv 140, Verus Hilla / Chosen Seren,
  Dawn Boss Set).
- `†` `Source of Suffering` (Lv 160, Hard Verus Hilla, Pitched); `†` `Oath of Death` (Lv 250,
  Brilliant).

`DTQ`: *"Equipping two Superior Gollux Pendants no longer contributes to the set effect, so you're
better off with Dominator for the boss flames."*
`UG`: *"the Arkarium pendants can go to 15-17 stars if you really want to since they will be around
forever potentially as drop gear."* — the second-life-as-drop-gear argument, §5.4.

### Rings ×4
Ring slots are the messiest — event rings, farming rings and damage rings compete.
- **T** `Silver Blossom Ring` (Lv 110, Horntail, **10★**), `Noble Ifia's Ring` (Lv 120), event rings.
- **★T** `Superior Gollux Ring` (Lv 150, **30★**), `Reinforced Gollux Ring` (Lv 140, **30★**),
  `Kanna's Treasure` (Lv 140, Princess No, **30★**), `Dawn Guardian Angel Ring` (Lv 160,
  Guardian Angel Slime + `Guardian Angel Ring Set Conversion Scroll`, Dawn Boss Set, **30★**),
  `Meister Ring` (Lv 140, Accessory-crafting Meister, **30★**).
- `†` `Endless Terror` (Lv 200, Chaos Gloom, Pitched); `†` `Whisper of the Source`,
  `†` `Blissful Nightmare` (Lv 250, Brilliant).

`UG` Phase 3 targets **21–22★ on Kanna's Treasure and the Meister Ring** specifically — they are
terminal and there is nothing to replace them with short of Pitched.

**Rings never take flames** (`REPO` `rules.ts` `flame-ineligible-slot`; `DTQ`: *"Some item slots
cannot gain bonus stats: Emblem, Badge, Medal, Secondary, Shoulder, Rings."*). Star force + cube only.

### Belt
1. **T** `Cracked` → `Solid` → `Reinforced Engraved Gollux Belt` (Lv 120/130/140), or
   `Golden Clover Belt` (Lv 140, Pink Bean — `UG`: *"Keep spare belts for transfer hammering"*).
2. **★T** `Superior Engraved Gollux Belt` (Lv 150, **30★**).
3. `†` `Dreamy Belt` (Lv 200, Hard Lucid, Pitched).

### Heart (android heart)
1. **T** `Lidium Heart` (Lv 30, event / craftable & expiring).
2. **★T** `Fairy Heart` (Lv 100, event) — `DTQ`: *"This item has the level 120+ Potential, which is
   much better than the Level 30 Lidium heart."* **Hard cap 8★**
   ([wiki](https://maplestorywiki.net/w/Fairy_Heart)).
3. `†` `Black Heart` (Lv 120, Hard Lotus, Pitched) — **time-limited, 20 days, cannot be extended**
   (`DTQ`, `GL`); `†` `Total Control` (Lv 200, Pitched).

> ⚠️ `DTQ`'s mid- and end-game tables give Fairy Heart a **17★ / 22★** target. The wiki caps it at
> **8★**. The wiki wins; `DTQ`'s table is applying a blanket row value. Encoded as 8★.

### Badge (no star force, no flames, no potential)
1. **★T** `Crystal Ventus Badge` (Lv 130, Magnus) — `DTQ`: *"It cannot be cubed or Star Force'd, so
   you're not missing out too much."*
2. `†` `Genesis Badge` (Lv 200, Black Mage, Pitched).

### Pocket (no star force, no potential; **does** take flames)
1. **T** `Stone of Eternal Life` (Hilla).
2. **★T** `Pink Holy Cup` (Lv 140, Pink Bean).
3. `†` `Cursed Red/Blue/Green/Yellow Spellbook` (Lv 160, Hard Will, Pitched).

Pocket items take no star force and no potential (`DTQ`; `REPO` `rules.ts`) but *are* flame-eligible
(`REPO` `rules.ts` `flame-ineligible-slot`: "Pocket items are NOT excluded").

### Medal
Cosmetic-tier for damage purposes — no star force, no potential, no flames. `DTQ` lists
`World Tree Guardian` (Root Abyss quest) early and `Seven Day Monster Parker Medal` late.
`†` `Immortal Legacy` (Lv 250, Brilliant Boss Set) is the only medal with a damage set effect.

---

## 3. Effective max star force per tier

### 3.1 What is actually attainable — and why 30★ is mythical

GMS runs the post-2025 30★ system: the cap went 25★ → 30★, **failure no longer decreases stars**,
the success/destruction table was rewritten, safeguard cost went 100% → 200% and safeguard was
extended to 17★ (`docs/research/formulas.md` §4A, line-item "NEXT: Destiny Weapon & Star Force
Reorganization (ver. 1.2.401), KMS 2025-03-20"; encoded in `REPO` `starforce.ts`).

⚠️ **Both public guides are stale here.** `DTQ`'s star-force table still shows "Drop" on failure and
ends at 22→23; `GL` still says *"Decrease Star Force level by 1"*, *"once a piece of equipment
reaches 15 and 20 Star Force … they will not drop below"*, and *"max. 25 stars"*. Use `REPO`
`starforce.ts` for rates, not the guides.

**The mechanical reason 22★ is the wall.** `REPO` `starforce.ts` `LAST_STAT_STAR = 22`:

> "Class stat granted per star for stars 16-22 (all slot types…). **Stars 23-30 grant no class
> stat.**" — `formulas.md` §4A §1.4, from
> [Star Force Enhancement/Stat Tables](https://maplestorywiki.net/w/Star_Force_Enhancement/Stat_Tables)

Past 22★ an armour piece gains ATT only. For a Lv 200 piece that is +15 main stat *per star* at
16–22★ and **0** at 23–30★.

**The probabilistic reason.** From `REPO` `STAR_RATES` (per attempt, Enhancement Mode 1, no
Star Catch, safeguard unavailable above 17★):

| Step | Success | Destroy | Booms per success | Attempts per success |
|---|---|---|---|---|
| 17→18 | 15% | 6.8% | 0.45 | 6.7 |
| 20→21 | 30% | 10.5% | 0.35 | 3.3 |
| 21→22 | 15% | 12.75% | 0.85 | 6.7 |
| **22→23** | 15% | **17%** | **1.13** | 6.7 |
| 23→24 … 25→26 | 10% | 18% | 1.80 | 10 |
| 26→27 | 7% | 18.6% | 2.66 | 14.3 |
| 27→28 | 5% | 19% | 3.80 | 20 |
| 28→29 | 3% | 19.4% | 6.47 | 33.3 |
| **29→30** | **1%** | **19.8%** | **19.8** | **100** |

Because a boom sends you back to the Equipment Trace star (`REPO` `TRACE_RECOVERY`: 20★ for a boom
at 26–30★, 19★ at 23–25★, 17★ at 21–22★), the *end-to-end* expectation compounds brutally. Solving
the Markov chain over `STAR_RATES` + `TRACE_RECOVERY` (derivation in
`gear-progression.spec.ts` comments; assumptions: Mode 1, no Star Catch, safeguard 15–17★ off,
destroyed item always restored from trace):

| Climb | Expected attempts | Expected booms |
|---|---|---|
| 0★ → 17★ | 35 | 0.1 |
| 17★ → 21★ | 102 | 4.0 |
| 17★ → 22★ | 196 | 8.2 |
| 17★ → 23★ | 425 | 18.6 |
| 17★ → 25★ | 3,127 | 144 |
| **22★ → 30★** | **≈ 2.4 × 10⁷** | **≈ 1.1 × 10⁶** |

**One item to 30★ costs about 24 million enhancement attempts and about 1.1 million destroyed
copies, in expectation.** That is the number behind "30 star is a thing of myth no one will ever
see". 30★ exists in GMS; it is not a goal. The tracker must never generate a 30★ candidate.

**The exception worth naming:** weapons get a discontinuity at 23★ — `REPO`
`WEAPON_ATT_DELTA_16_25` jumps from +12/+13/+14/+17 at 22★ to **+30/+31/+32/+34** at 23★. It is the
only genuine reason anyone looks past 22, and at 1.13 expected booms per success it is a lottery,
not a plan. No guide recommends it.

### 3.2 The AbsoLab case (the user's second example)

Neither guide ever puts AbsoLab at 22★.

- `DTQ` **mid-game** table: `Absolab / Cape, Shoes, Gloves, Weapon, Shoulder / Legendary /
  **17 Stars** / Absolab Dailies/Lomien`.
- `DTQ` **end-game** table: **AbsoLab does not appear at all.** Those slots are `Arcane / … /
  22 Stars / Lucid`. The 22★ row belongs to the item that *replaced* AbsoLab.
- `DTQ`: *"It's time to replace all your Absolab Gear with Arcane Gear, which comes from defeating
  Lucid. This gear is quite easy to get, so getting it to 22 Star should be the priority as soon
  as possible."*
- `UG` Phase 2: *"Get Absolab and superior Gollux items to Epic with 6%+ stat or Unique+ with 15%+
  stat. The reason we don't need to surpass Epic/Unique here is because **Abso items will be
  replaced with Arcane eventually** and, thus, holding less value in the long run."*
- `UG`'s one carve-out: *"IF you are leveling very quickly and are being held back by the time
  gates behind arcane items, feel free to continue upgrading your Absolab set in order to keep up
  with damage so to keep progressing in levels/content."*

**Encoded target: AbsoLab realistic 17★, stretch 17★, mechanical max 30★.** Anything above 17★ on
AbsoLab is a warning, not a recommendation.

Why Arcane "comes too fast": AbsoLab is gated on Lv 190 Scrapyard / Dark World Tree weeklies plus
Lotus/Damien materials, Arcane Umbra on Lucid and Will — and Lucid entry is **Lv 220**
(`bosses.json` `easy-lucid`/`normal-lucid` entry levels), reached within the same Arcane River
levelling run that AbsoLab is farmed during.

### 3.3 Per-tier table

| Tier | Item Lv | Mechanical max | **Realistic target** | Stretch | Class | Sources |
|---|---|---|---|---|---|---|
| Pensalir / Lv 140 mob gear | 140 | 30★ | **10★** (weapon 12★) | — | transient | `DTQ` early table; `GL` "12-stars on each item is suggested" |
| Low Boss Accessories, Lv 100–120 | 100–120 | 8–15★ | **8–10★** (their own cap) | — | transient | `DTQ` early table; `UG` P1 "Get all items except magnus cape, boots, and belt 10 star max" |
| Boss Accessories, Lv 128–137 (Will o' the Wisps, Dea Sidus, Black Bean Mark) | 128–137 | **20★** | **10★** | 12★ | transient | as above |
| Arkarium pendants (Mechanator / Dominator) | 120 / 140 | 15★ / 30★ | **15★** | **17★** | transient→terminal | `UG` P1: "can go to 15-17 stars … they will be around forever potentially as drop gear" |
| **CRA (Lv 150 hat/top/bottom/weapon)** | 150 | 30★ | **17★** | **21–22★** | terminal (long-lived) | `UG` P2 "Get CRA to 17 stars (can push further to 21 stars if you'd like)"; `UG` P3 "21-22 star CRA items"; `DTQ` mid 17★ / end "keep your CRA gear and max it to 22 stars" |
| **AbsoLab (Lv 160)** | 160 | 30★ | **17★** | **17★ — stop** | **transient** | §3.2 |
| **Superior Gollux (Lv 150)** | 150 | 30★ | **17★** | **22★** | terminal | `DTQ` mid 17★ / end 22★; `UG` P4 "22 star everything (other than pitched)" |
| Dawn Boss accessories (Twilight Mark, Daybreak, Estella, Dawn GA Ring) | 140–160 | 30★ | **17★** | **22★** | terminal | `DTQ` mid 17★ (Twilight Mark) / end 22★ (Daybreak) |
| Kanna's Treasure / Meister Ring | 140 | 30★ | **17★** | **21–22★** | terminal | `UG` P3 "21-22 star Kanna's Treasure & Meister ring" |
| **Arcane Umbra armour (Lv 200)** | 200 | 30★ | **17★** | **22★** | terminal | `UG` P3 "Arcane items should all be 17 stars first, then 3 Line Legendary with 23%+ Stat each"; `DTQ` end 22★ |
| **Arcane Umbra weapon** | 200 | 30★ | **17★** | ⚠️ **disputed** | transient | **Guides conflict** — see below |
| Genesis weapon | 200 | fixed 22★ | **22★ (granted)** | n/a | terminal | `REPO` `rules.ts`; [wiki](https://maplestorywiki.net/w/Genesis_Weapon) |
| **Eternal (Lv 250)** | 250 | 30★ | **22★** | 22★ | terminal | `DTQ` end table |
| Pitched / Brilliant items | 160–250 | 30★ | **out of scope** | — | — | §4 |

**Conflict — Arcane Umbra weapon.**
`UG` Phase 3: *"**Arcane Weapon should be 17 stars (DO NOT SURPASS 17)** 3 Line Legendary with
2+Lines of ATT% / M.ATT% and 1 Line of IED or Boss%."* The reasoning is transience: the Genesis
weapon arrives at a **fixed 22★** after 8 monthly Black Mage clears, so stars bought on the Arcane
weapon are thrown away.
`DTQ`'s end-game table gives Arcane/Genesis weapons **22 Stars**, but its own text says *"You can
use the Arcane Weapon also whilst you progress through the Genesis Weapon Liberation."*
**Both are presented. The module encodes `UG`'s 17★ as the realistic target with a `disputed` flag**
— it is the more specific claim and the only one that reasons about replacement.

**Safeguard convention.** Safeguard exists at 15★, 16★ and 17★ only, converts destruction to
maintain, and costs +200% of base (`REPO` `SAFEGUARD_STARS`, `SAFEGUARD_COST_SURCHARGE`;
`formulas.md` §4A). This is exactly why "**safeguard to 17, then decide**" is the community
convention: 0★→17★ costs ~35 attempts and ~0.1 expected booms *even without* safeguard, and with
safeguard 15–17 it is boom-free. The moment you attempt 18★ you are unprotected — 17★ is where
the risk profile changes, which is why every guide's mid-game number is 17.

**Events.** `GL` notes Sunny Sunday variants: 30% star-force discount; guaranteed 5/10/15★;
"+2 stars below 10"; and the **Shining Star Force Event** (discount + 5/10/15 together), which it
calls *"the best opportunity to Star Force your gear especially to 17-star"*. `UG`: *"Aim for
pitched items and star force them on event if you can."* Any push past 17★ is an event activity.

---

## 4. Pitched / Dawn / Brilliant ("Radiant") boss accessories

### 4.1 What each set is

| Set | GMS name | Items | Full-set effect | In scope? |
|---|---|---|---|---|
| Dawn | **Dawn Boss Set** | `Daybreak Pendant` (140), `Twilight Mark` (140), `Estella Earrings` (160), `Dawn Guardian Angel Ring` (160) | 4-set: +30 All Stats, +30 ATT/MATT, **+10% Boss Damage, +10% IED** | **Yes** — normal-mode drops from Verus Hilla / Seren / Lucid / Will / Gloom / Darknell / Guardian Angel Slime |
| Pitched | **Pitched Boss Set** | 11 items, Lv 120–200: `Black Heart`, `Berserked`, `Magic Eyepatch`, `Source of Suffering`, `Cursed …Spellbook` ×4, `Commanding Force Earring`, `Endless Terror`, `Dreamy Belt`, `Genesis Badge`, `Mitra's Rage: <Job>`, `Total Control` | 10-set: +130 All Stats, +130 ATT/MATT, **+40% Boss Damage, +19% IED, +15% Crit Damage** | **No** — §4.2 |
| "Radiant"/Grandis | **Brilliant Boss Set** | `Original Sin of Pride` (face), `Whisper of the Source` (ring), `Blissful Nightmare` (ring), `Oath of Death` (pendant), `Immortal Legacy` (medal) — all Lv 250 | 5-set: +80 All Stats, +80 ATT/MATT, **+30% Boss Damage, +15% IED, +5% Crit Damage** | **No** — §4.2 |

Set effects from [Dawn Boss Set](https://maplestorywiki.net/w/Dawn_Boss_Set),
[Pitched Boss Set](https://maplestorywiki.net/w/Pitched_Boss_Set),
[Brilliant Boss Set](https://maplestorywiki.net/w/Brilliant_Boss_Set) (raw wikitext).
Note `sets.json` carries these sets as `partial: true` — its upstream manifest **drops boss damage,
IED and crit damage**, so the wiki tables above are the complete ones.

### 4.2 Why Pitched and Brilliant are goals, not upgrades

**Sourced qualitative statements:**

- `DTQ` end-game intro: *"Many of the end-game equips have super low drop rates, so even if you
  have all the mesos in the world, you can get stuck looking for these items for **months if not
  years** if you're on Reboot Servers."*
- `DTQ`: *"The Pitched-Boss Set replaces many equipment pieces, but the **drop-rate is terrible**.
  Some players have gone **several months without a single item drop**."*
- `DTQ`, and this is the exact behaviour we want the tracker to have:
  > *"The Pitch-Boss Set replaces many items in mid-game tier list. But, as mentioned, their drop
  > rate is super low, so **you may find starring your current equipment to 22 stars will give you
  > more damage whilst you wait for the item to drop**."*
- `GL`, Pitched Boss Accessories: *"Items here at very rare and hard to get."*
- `UG` puts Pitched in **Phase 4**, gated behind Phase 3's *"Aim for level 270-275"*, *"Leveling
  Legion (8k+)"* and *"Starting working on eKalos (80m+ CP at least)"*. It is a phase, not a step.
- `UG` on investing in them: *"backups not always necessary for pitched items. They're only really
  worth using if they're 22star in most\* cases anyway."*

**Structural argument (the one that gives you "1–2 years"):**

Every Pitched source is a **weekly-reset boss** (`src/lib/data/bosses.json`, sourced from
`docs/research/bosses.md` §1.7):

| Item | Boss | Reset | Entry Lv |
|---|---|---|---|
| Berserked, Black Heart | `hard-lotus` | weekly | 190 |
| Magic Eyepatch | `hard-damien` | weekly | 190 |
| Dreamy Belt | `hard-lucid` | weekly | 220 |
| Cursed Spellbook | `hard-will` | weekly | 235 |
| Endless Terror | `chaos-gloom` | weekly | 245 |
| Source of Suffering | `hard-verus-hilla` | weekly | 250 |
| Commanding Force Earring | `hard-darknell` | weekly | 255 |
| Genesis Badge | `hard-black-mage` | **monthly** | 255 |

So a character gets **at most 52 rolls per year** on any one Pitched item, and **12 per year** on
the Genesis Badge. Under a geometric model with per-clear drop probability *p*, the expected wait
to a first drop is `1/p` clears:

| *p* per clear | Expected clears | Weekly boss ⇒ | Monthly boss ⇒ |
|---|---|---|---|
| 5% | 20 | 4.6 months | 1.7 years |
| 2% | 50 | 11.5 months | 4.2 years |
| **1%** | **100** | **1.9 years** | 8.3 years |
| 0.5% | 200 | 3.8 years | 16.7 years |

This is the arithmetic behind the user's "1–2 years"; it holds for any *p* at or below ~1%, which
is where every qualitative statement above points. **⚠️ UNVERIFIED: the actual per-clear drop
probability.** I could not source a number:

- MapleStory Wiki publishes item source but no rates.
- `maplestory.nexon.com/Guide/OtherProbability/DropItem` returns a JS shell with no data to a
  non-browser client; GMS Nexon pages 403.
- WebSearch quota for this session was exhausted before I could sweep community trackers, and
  DuckDuckGo / Bing HTML endpoints both refuse scripted requests.

The data module therefore encodes the **sensitivity table**, not a drop rate, and marks
`dropRatePercent: undefined`.

**A third, cheaper argument:** the marginal value of one Pitched piece is small. The Pitched
2-set is +10 All Stats / +10 ATT / **+10% Boss Damage** — the same +10% Boss Damage the **Dawn
2-set** gives, which is reachable from *normal-mode* Lucid/Will (Twilight Mark) plus
Verus Hilla / Seren (Daybreak Pendant). And swapping a Pitched item in usually *breaks* an
existing set (a Commanding Force Earring displaces Superior Gollux Earrings, costing the
Superior Gollux 4-set's +30% Boss / +30% IED unless you already hold 4 other Gollux pieces).
So a *single* Pitched drop can be a net downgrade. `UG`'s "only really worth using if they're
22star" is the same observation.

### 4.3 How the tracker should present them

- **Never** as a ranked candidate with a `gainPct`, and never with a cost.
- A separate, unranked **"Long-term goals"** list: item, slot, source boss + difficulty, reset
  cadence, which set it completes, and the reason it is not ranked.
- When a Pitched item **is already equipped**, treat it normally — star force / cube / flame
  candidates for it are legitimate (`UG`: 22★ on pitched).
- Never suppress the *underlying* upgrade it would replace. `DTQ`'s advice is literally to keep
  starring what you have while you wait.

---

## 5. Investment order

### 5.1 The accepted order, per phase

Reconstructed from `UG`'s four phases and `DTQ`/`GL`'s per-tier tables. Everything here is a quote
or a direct paraphrase.

**Phase 0 — fill every slot.** `GL`: *"Upon reaching Lv. 140, remember to fill all equipment slots
and Star Force each equipment to at least 12 Stars … reveal all the potentials on your equipment
and to use cubes to reroll for some %Main Stat or Epic Potential."* And crucially:
*"**It does not matter if the gear will be replaced**, this will help you to defeat enemies."*
Transience is not an excuse to leave a slot empty; it is an argument about *how much*.

**Phase 1 — cheap stars everywhere, Epic potential, WSE first.**
- Star force: 10★ on everything, 12★ on the weapon (`DTQ` early table; `UG` P1
  *"Get all items except magnus cape, boots, and belt 10 star max"*).
- Potential: *"Epic potential on everything that is a Basic Boss Accessory and get to 6% main
  stat"* (`UG` P1).
- **Weapon / Secondary / Emblem go first and go furthest**: `GL`: *"Your main focus for this would
  be to try and get your Weapon, Secondary Weapon, and Emblem to unique first as their potentials
  can provide stats like %Attack/Magic Attack, %Ignore DEF and %Boss Damage."* `UG` P1: the Lv 100
  emblem and secondary *"can be potentially to Unique-Legendary with 1-2 lines of ATT% each."*
  This is the one place to over-invest in a "low-level" item, because emblem and secondary are
  **never replaced** and take neither star force nor flames.
- Flames: not yet. `GL`: *"For now don't worry too much about Bonus Stats and Rebirth Flames."*

**Phase 2 — 17★ on the keepers, Epic/Unique on the throwaways.**
- CRA → **17★, Legendary, 15%+ stat** ("with you for a very long time").
- AbsoLab + Superior Gollux → **17★, Epic 6%+ or Unique 15%+**, explicitly *because* AbsoLab gets
  replaced and Superior Gollux gets transfer-hammered into.
- Gloves → 1 line % Crit Damage.
- `UG` P2 goal: *"All/most items should have decent → good flames, ideally high stat comparatively
  with 3%+ stat"* — flames enter here, on keepers.
- WSE: *"should now have at least 5 total lines of ATT% / M.ATT% and some IED / Boss %."*

**Phase 3 — replace, then 17★ → Legendary 3-line → 21/22★ on terminals.**
- `UG`: *"Arcane items should all be **17 stars first, then** 3 Line Legendary with 23%+ Stat
  each."* — **stars before cubes at the tier transition, potential after.**
- *"Arcane Weapon should have T6-T7 ATT / M.ATT flames."*
- *"21-22 star CRA items"*, *"21-22 star Kanna's Treasure & Meister ring"*.

**Phase 4 — 22★ everything terminal, 3-line stat, high flames everywhere.**
`UG` P4: *"22 star everything (other than pitched) that's not meant for farming / 3L stat items /
Full farming gear / **High flames on ALL items**."*

### 5.2 Where flames fit

Flames come **after** the cheap star floor and after WSE potential, and **only on gear you are
keeping**:

> "When you get extra flames, try using them on items you'd be keeping for a while like CRA and
> always make sure your weapon has good ATT / M.ATT flames" — `UG`, General tips

Mechanically constrained: **secondary, emblem, badge, medal, rings, androids, hearts, shoulders and
totems take no flames at all** (`REPO` `rules.ts` `flame-ineligible-slot`, with three named
exceptions: Immortal Legacy, Scarlet Shoulder, Ancient Slate Replica). `DTQ` gives a shorter list
("Emblem, Badge, Medal, Secondary, Shoulder, Rings") that is consistent as far as it goes.

Flame tiers by flame type (`DTQ`): Powerful Rebirth Flame → T1–4 normal / **T3–6 boss** gear;
Eternal and Black Eternal Rebirth Flame → T2–5 normal / **T4–7 boss** gear. Boss-dropped equipment
gets 4 guaranteed lines vs 1–4 random on normal gear, which is a second, independent reason to
flame CRA / AbsoLab / Arcane / Gollux rather than Pensalir.

### 5.3 The rule the tracker was missing

Both guides state it, from opposite directions:

- Do fill and cheaply upgrade transient gear — `GL`: *"It does not matter if the gear will be
  replaced."*
- Do **not** push transient gear past the cheap floor — `UG`: *"we don't need to surpass
  Epic/Unique here **because** Abso items will be replaced with Arcane eventually."*

Concretely, for a transient piece: star force to its tier floor (10–17★ depending on tier), Epic
6%+ main stat (or Unique 15%+ if cubes are free), **no flames, no Legendary, no 3-lining, no
safeguarded pushes**.

### 5.4 The one legitimate reason to over-invest in "replaced" gear

Old accessories get a second life as **drop / meso gear**, and that is a *different* build, not a
damage upgrade:

> "IF ACTIVELY GRINDING & KILLING MOBS, get 100% meso rate and at least 60% Item drop rate on your
> accessories (rings(4), earrings, pendants (2) face, and eye). Items must be **Legendary** to get
> meso or drop rate." — `UG`, General tips
> "the Arkarium pendants can go to 15-17 stars … since they will be around forever potentially as
> drop gear after they're used to get you to better equips" — `UG`, Phase 1

Max meso rate from equipment is **100% (5 lines)**; max drop rate **200% (10 lines)** (`UG`).
The tracker should not confuse a drop-gear Legendary with a damage upgrade — they are ranked on
different axes and this module does not model the drop-gear build.

---

## 6. What is UNVERIFIED

1. **Pitched / Brilliant per-clear drop rates.** No number found (§4.2). Encoded as `undefined`
   with a sensitivity table instead.
2. **The Google Slides "Heroic Beginner Guide"** — HTTP 401 on every export endpoint. Not used.
3. **Whether Eternal cape / shoes / gloves / shoulder are practically obtainable in GMS Heroic
   today.** The items exist at Lv 250 / 30★ on the wiki, `sets.json` lists them in the 8-piece
   Eternal set, but `DTQ`'s end-game table keeps Arcane in those slots. Flagged `disputed`.
4. **The Arcane Umbra weapon star target** — `UG` says 17★ hard stop, `DTQ` says 22★ (§3.3).
   Both encoded; `UG` is the default.
5. **`DTQ`'s "Fairy Heart 17★ / 22★"** contradicts the wiki's 8★ hard cap. Wiki used; conflict
   recorded.
6. **`DTQ`'s "Gold Knight's Emblem"** — not a GMS item name. The item is `Gold Maple Leaf Emblem`.
7. **`DTQ`'s Twilight Mark source** ("Guardian Angel Slime" in the table) contradicts its own prose
   and the wiki (Lucid / Will).
8. **Cost in mesos or days for any of this.** Out of scope for this module; `starforce.ts` already
   owns the meso model, and no guide publishes flame or cube counts.
