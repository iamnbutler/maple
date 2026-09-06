# GMS Class Skills — the passive/buff contributions to the damage formula

**Compiled:** 2026-09-06
**Scope:** GMS. The five design §11 priority classes, complete: **Ren**, Hero, Wind Archer, Night Walker, Battle Mage.
**Transcribed into:** `src/lib/data/class-skills.ts`, asserted in `src/lib/data/class-skills.spec.ts`.
**Rule followed while writing:** every number below carries the URL it came from. Anything the source did not state is marked `UNVERIFIED` or omitted. Nothing is filled in from memory.

---

## 0. Why this file exists

`docs/plans/2026-09-06-maple-design.md` §2 fixes the engine as **top-down**: the in-game stat window is the source of truth, and class passives are an opaque baseline that "cannot be reconstructed from equipment". That is a deliberate and correct choice for _ranking gear_ — everything unknowable cancels in a ratio — but it blocks two things:

1. **Combat Power cannot be reproduced, only bounded.** `formulas.md` §2.2: the game computes CP from _skill-stripped_ stats — every term subtracts its skill and consumable contribution. A stat-window capture cannot separate them, so `src/lib/analysis/checksums.ts` computes CP with those contributions at zero and reports the result as an **upper bound** (`boundChecksum`, `kind: 'upper-bound'`). Knowing what each class's passives contribute is the precondition for subtracting them.
2. **We cannot tell a user which of their own buffs or passives is driving a number.**

This file is the sourced input for both. It is _reference_, not a re-derivation of game math — for the formulas themselves see `formulas.md`.

---

## 1. Source

| Source                                 | URL                           | Why it is the primary source                                                                                                                                                                                                                                                                                                                                                               | Freshness                                                                    |
| -------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Grandis Library — class overview pages | <https://grandislibrary.com/> | The only current, English, GMS-oriented resource that (a) lists every skill with an explicit `Passive` / `Buff` / `Active` / `Upgraded Passive` type, and (b) publishes its own **"Attack Stats" aggregate** per class, which gives an independent cross-check on the transcription. It is also the only one of the candidate sources that covers the 2025–26 Anima classes, i.e. **Ren**. | Site footer: **GMS Ver. 269 [Ride the Lightning Update]** (read 2026-09-06). |

Pages used, one per priority class:

- Ren — <https://grandislibrary.com/anima/ren>
- Hero — <https://grandislibrary.com/explorers/hero>
- Wind Archer — <https://grandislibrary.com/cygnus-knights/wind-archer>
- Night Walker — <https://grandislibrary.com/cygnus-knights/night-walker>
- Battle Mage — <https://grandislibrary.com/resistance/battle-mage>

### 1.1 Version / patch

The class pages carry **no per-page patch stamp**. Three things stand in for one:

- the site-wide footer, on every page, reads `GMS Ver. 269 [Ride the Lightning Update]`;
- the newest dated artefact on each page is a community infographic — Ren `2026-07-10`, Night Walker `2026-06-25`, Wind Archer `2026-06-24`, Battle Mage `2026-05-27`, Hero (none);
- the pages were fetched 2026-09-06.

`starforce.ts` in this repo already cites the [GMS v269 "Ride the Lightning" patch notes](https://www.nexon.com/maplestory/news/update/41138/updated-6-30-v-269-ride-the-lightning-patch-notes), so the class data and the star-force data are on the same patch.

### 1.2 GMS vs KMS

Grandis Library is a GMS resource ("Patch Notes in Global MapleStory" is its own landing section). **None of the five pages flags any value as KMS-only or unreleased**, so nothing in `class-skills.ts` is marked as a KMS number GMS has not received. Two caveats worth writing down rather than assuming away:

- Ren's page links NamuWiki (a KMS-derived wiki) under "More Info", but the skill values themselves are Grandis Library's own GMS transcription.
- Where a class's page and the repo's existing `formulas.md`-derived tables disagree, this file records the conflict rather than picking silently (§6).

### 1.3 How the pages were read

Each page is a Next.js document whose `__NEXT_DATA__` payload carries the post as structured JSON: `content.attackStats` (the aggregate), `content.buffInfo` (durations and cooldowns), and `skill.{primary,hyper,fifth,sixth}` (every skill with `name`, `type`, `shortDesc`, `details`). Values below are copied from that payload, which is the same data the rendered page shows.

---

## 2. The model, and the two distinctions that matter

`src/lib/data/class-skills.ts` stores, per class, a list of
`{ name, job, source, alwaysOn, scope, conditional?, optional?, durationSeconds?, appliesTo?, effects, note? }`.

**`alwaysOn`** — false for anything duration-limited. This is the flag the Combat Power question turns on: CP strips buffs, so only `alwaysOn` entries can appear in a skill-stripped baseline. Grandis Library's per-skill `type` field makes this decidable rather than guessable: `Passive` / `Upgraded Passive` → always on; `Buff` / `Party Buff` / `Buff Attack` with a stated `Duration:` → not.

**`scope`** — `'character'` for stats that appear in the stat window and apply to every attack; `'skill'` for stats that apply only to named skills. This distinction is easy to get wrong and expensive when you do:

> Ren's hyper passives include _Storm - Guardbreak_ (+20% Ignore DEF) and _Wish Unending - Guardbreak_ (+20% Ignore DEF). Summing them into a class IED would give ~62% instead of the true class-wide **40%**. Grandis Library's own Ignore DEF aggregate for Ren is `+40%(49%)` — it omits both, which is the confirmation that hyper passives of this kind are skill-scoped and never reach the stat window.

The same applies to every **V Boost Node** (uniformly `[Lv. 20] Critical Rate: +5%` on some nodes and `[Lv. 40] Ignore DEF: +20%` on all of them, per skill — exported as `V_BOOST_NODE_RIDERS`) and to every **6th-job Ascent skill** (uniformly `Ignore Defense: +60%, Boss Damage: +40%, Critical Rate: 100%`, one cast — exported as `ASCENT_SKILL_RIDER`).

Two further flags:

- **`conditional`** — a permanent passive that still needs a game state: Combo Orbs charged (Hero), Marks of Darkness applied (Night Walker), an aura toggled (Battle Mage), a debuff on the target, or a particular weapon equipped. These are `alwaysOn: true` — they are not duration-limited — but `alwaysOnTotals()` excludes them by default.
- **`optional`** — a hyper passive competing for a limited point pool, which Grandis Library marks "optional" and leaves out of its own base aggregate (Hero's _Advanced Final Attack - Ferocity_, Night Walker's _Vitality Siphon - Reinforce_).

Composition follows `formulas.md` §1.6–§1.9 and is done by `alwaysOnTotals()`: **final damage multiplies**, **ignore-defense composes** (`1 − Π(1 − x)`), everything else adds. Critical rate totals include the innate `Base +5%` every Grandis Library class page prints (`INNATE_CRITICAL_RATE_PERCENT`).

---

## 3. Ren — <https://grandislibrary.com/anima/ren>

> "Ren is a STR warrior class part of the Anima class group. Ren uses Swords as their primary weapons. For their secondary weapon, Ren can equip Imugi Gems" — page meta description.
> Page fields: `classGroup: "Anima"`, `jobGroup: "Warrior"`, `mainStat: "STR"`, `secondaryStat: "DEX"`, `equipment: [{weapon: ["sword"]}, {secondary: ["imugiGem"]}]`.

Sword is **one-handed** (which is why Ren carries a real secondary), matching the note already in `CLASS_WEAPONS.ren` in `classes.ts`.

Page "Attack Stats" header rows: `Weapon Multiplier 1.3x`, `Attack Speed 8`, `Weapon Mastery 90%`.

### 3.1 Always-on, character-wide

| Skill                   | Job        | Type             | Effect                                                     |
| ----------------------- | ---------- | ---------------- | ---------------------------------------------------------- |
| Serene Verse            | 1st        | Passive          | Attack +30, Critical Rate +15%, Final Damage +5%           |
| Sword Mastery           | 2nd        | Passive          | Sword Mastery +50%, Attack +30                             |
| Physical Training       | 2nd        | Passive          | STR +60                                                    |
| Serene Verse II         | 2nd        | Passive          | Critical Rate +20%, Final Damage +10%                      |
| Serene Verse III        | 3rd        | Passive          | Critical Rate +10%, Final Damage +10% (also Max HP +20%)   |
| Anima Warrior           | 4th        | Passive/Active   | "All stats with a direct AP investment increase by 15%"    |
| Exquisite Sword Mastery | 4th        | Upgraded Passive | Sword Mastery +70%, Attack +48, Final Damage +11%          |
| Serene Verse IV         | 4th        | Passive          | Attack +57, Final Damage +20%                              |
| Eyes Unclouded          | 4th        | Passive          | Damage +15%, Critical Damage +10%, **Ignore Defense +40%** |
| Grounded Body           | Link Skill | Passive          | Damage +5% (the "-6%" in the same line is damage _taken_)  |

Weapon mastery is **replaced**, not stacked: 90% = base 20% + Exquisite Sword Mastery 70%.

### 3.2 Buffs (stripped by Combat Power)

| Skill                                    | Duration        | Effect                                                                                                                                                             |
| ---------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Exclusive Spell (Beginner)               | 2400s / 300s cd | Attack & Magic ATT +4%                                                                                                                                             |
| Blossoming Blade (2nd)                   | 200s            | Sword Attack Speed +2                                                                                                                                              |
| Weapon Aura (5th, common)                | 130s / 120s cd  | Final Damage +6%, Ignore DEF +16%                                                                                                                                  |
| Grandis Goddess's Blessing (5th, common) | 40s / 120s cd   | Damage +40%; "+15% Final Damage to certain skills (refer to skill)" — the affected list is **not enumerated**, so that final damage is `UNVERIFIED` and not stored |
| Impenetrable Skin (5th, common)          | 18s / 120s cd   | STR +30                                                                                                                                                            |

### 3.3 Skill-scoped (hyper / V / HEXA)

Hyper passives: _Spirit Strike - Reinforce_ Damage +20%; _Spirit Strike - Guardbreak_ IED +10%; _Storm - Reinforce_ Damage +20%; _Storm - Guardbreak_ IED +20%; _Storm - Boss Rush_ Boss +20%; _Wish Unending - Reinforce_ Damage +20%; _Wish Unending - Guardbreak_ IED +20%; _Wish Unending - Critical Chance_ Crit Rate +20%.
5th: _Final Imugi Spirit Sword: Blade of the Unbound Heart_ — "Ignore Defense: 20%".
6th: _HEXA Wish Unending_ — "Ignore Defense: +20%"; Ascent _Rising Azure Dragon: Heartbound Verse_ — IED +60%, Boss +40%, Crit Rate 100% per technique.

### 3.4 Reconciliation against the page's own aggregate

| Row          | Page prints                                  | Our always-on total                                                        | Match |
| ------------ | -------------------------------------------- | -------------------------------------------------------------------------- | ----- |
| Final Damage | `+69.23%(79.38%)(106.29% to certain skills)` | 1.05 × 1.10 × 1.10 × 1.11 × 1.20 = **+69.23%**                             | exact |
| Ignore DEF   | `+40%(49%)`                                  | **40%**                                                                    | exact |
| Damage       | `+20%(60%)`                                  | 15 + 5 = **20%**                                                           | exact |
| Crit Rate    | `+50%`                                       | 5 + 15 + 20 + 10 = **50%**                                                 | exact |
| Crit Damage  | `+10%`                                       | **10%**                                                                    | exact |
| Attack       | `+4% +165`                                   | 30 + 30 + 48 + 57 = **+165** flat; the +4% is the Exclusive Spell **buff** | exact |
| Boss Damage  | `+0%`                                        | **0%**                                                                     | exact |

The parentheticals are the page's "with optional 5th-job buffs" figures: 79.38% = 69.23% × 1.06 (Weapon Aura), 106.29% = 79.38% × 1.15, 49% = `1 − 0.60 × 0.84` (Weapon Aura IED). All reproduce.

**Ren has no class-wide boss damage at all.**

---

## 4. Hero — <https://grandislibrary.com/explorers/hero>

Page fields: `classGroup: "Explorers"`, `jobGroup: "Warrior"`, STR/DEX, `weapon: ["oneHSword","twoHSword","oneHAxe","twoHAxe"]`, `secondary: ["medallion","warShield"]`. Weapon Multiplier `[1H] 1.34x [2H] 1.44x`; Weapon Mastery 90%; Attack Speed `[1H] 8 [2H] 7`.

The tracker models Hero as **two-handed sword only** (design §11), so the 1H multiplier and the axe-only bonus are recorded but flagged.

### 4.1 Always-on, character-wide, unconditional

| Skill                         | Job | Effect                                                                   |
| ----------------------------- | --- | ------------------------------------------------------------------------ |
| Invincible Belief (Link)      | —   | Damage +6%                                                               |
| Weapon Mastery                | 2nd | Mastery +50%, Attack Speed +1, **Final Damage +10%**, Critical Rate +15% |
| Agile Arms                    | 2nd | Attack Speed +2, STR +20                                                 |
| Physical Training             | 2nd | STR +30, DEX +30                                                         |
| Chance Attack                 | 3rd | Critical Rate +20%                                                       |
| Maple Warrior                 | 4th | +15% to AP-assigned stats                                                |
| Advanced Combo (mastery half) | 4th | Mastery +70%                                                             |
| Combat Mastery                | 4th | **Ignore Defense +50%**                                                  |
| Advanced Final Attack         | 4th | Attack +30                                                               |
| Enrage                        | 4th | **Final Damage +25%**, Critical Damage +20%                              |

### 4.2 Conditional (permanent, but gated on a resource or a target state)

Hero is the class where this matters most — **Combo Orbs**:

| Skill                                     | Gate                             | Effect                                                                                                              |
| ----------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Combo Attack (2nd)                        | per orb, max 10                  | Attack +2 each → **+20**                                                                                            |
| Advanced Combo (4th)                      | per orb, max 10                  | Final Damage +10% each → **+100%**                                                                                  |
| Advanced Combo Attack - Reinforce (Hyper) | per orb                          | raises the above to **+12%/orb → +120%** — _additive inside the Advanced Combo term_, **not** a separate multiplier |
| Advanced Combo Attack - Boss Rush (Hyper) | per orb, max 10                  | Boss Damage +2% each → **+20%**                                                                                     |
| Chance Attack (3rd)                       | target pierced/incapacitated     | Final Damage +25%                                                                                                   |
| Puncture (4th)                            | target carries Puncture's debuff | Damage +25%                                                                                                         |
| Weapon Mastery axe bonus (2nd)            | an Axe equipped                  | Damage +5%                                                                                                          |

The Reinforce hyper is stored with **empty effects and a note**, deliberately: modelling it as its own multiplier would give ×2.00 × 1.20 = 2.40 where the page's arithmetic is ×2.20.

### 4.3 Buffs

Cry Valhalla (Hyper, 30s): Attack +50, Crit Rate +30%. Epic Adventure (Hyper, 60s): Damage +10%. Spirit Blade (2nd, 200s): Attack +30. Hero's Echo (Beginner, 2400s): Attack & Magic ATT +4%. Instinctual Combo (5th, 20s): "The Combo Orb increases Final Damage, Boss Damage, and Attack Power by 13%" → page shows Attack max +4, Boss max +4%. Maple World Goddess's Blessing (5th common, 60s): Damage +20%, Maple Warrior AP bonus +400%. Weapon Aura (5th common, 130s): Final Damage +6%. Impenetrable Skin (5th common, 18s): STR +30.

### 4.4 Reconciliation

| Row          | Page prints        | Unconditional always-on  | With Combo Orbs                                            |
| ------------ | ------------------ | ------------------------ | ---------------------------------------------------------- |
| Final Damage | `+202.5%(447.46%)` | 1.10 × 1.25 = **+37.5%** | 1.10 × 1.25 × 2.20 = **+202.5%** (matches the page's base) |
| Ignore DEF   | `+50%(~58%)`       | **50%**                  | 50%                                                        |
| Boss Damage  | `+20%(24%)`        | **0%**                   | **+20%**                                                   |
| Crit Rate    | `+40%(70%)`        | 5 + 15 + 20 = **40%**    | 40%                                                        |
| Crit Damage  | `+20%`             | **20%**                  | 20%                                                        |
| Damage       | `+6%(61-66%)`      | **6%**                   | 6% (Puncture's +25% needs the debuff)                      |

> **UNVERIFIED / could not reproduce.** The page's parenthetical Final Damage, `+447.46%`, does not follow from the components it lists (every combination of Weapon Aura ×1.06, Chance Attack ×1.25, Instinctual Combo's 13% and Sword Illusion's "+72–81.36%" that we tried lands elsewhere — 329%, 362%, 477%). Its **base** figure `+202.5%` reproduces exactly. The parenthetical is therefore stored as a quoted string only and is not used for anything.

---

## 5. Wind Archer — <https://grandislibrary.com/cygnus-knights/wind-archer>

Page fields: `classGroup: "Cygnus Knights"`, `jobGroup: "Archer"`, DEX/STR, Bow + Jewel. Weapon Multiplier 1.3x; Weapon Mastery 85%; Attack Speed 8.

### 5.1 Always-on, character-wide

| Skill                        | Job | Effect                                                                                      |
| ---------------------------- | --- | ------------------------------------------------------------------------------------------- |
| Cygnus Blessing (Link)       | —   | Attack & Magic ATT +55                                                                      |
| Elemental Harmony (Beginner) | —   | +1 DEX per 2 character levels (level-dependent; no fixed value stored)                      |
| Elemental Expert (Beginner)  | —   | Attack & Magic ATT +10%                                                                     |
| Storm Elemental              | 1st | Damage +10%                                                                                 |
| Whispers of the Wind         | 1st | Attack +20                                                                                  |
| Sylvan Aid                   | 2nd | Attack +20, Critical Rate +10%                                                              |
| Agile Bows                   | 2nd | Attack Speed +2, DEX +20                                                                    |
| Bow Mastery                  | 2nd | Mastery +50%, **Final Damage +10%**                                                         |
| Physical Training            | 2nd | STR +30, DEX +30                                                                            |
| Pinpoint Pierce              | 3rd | Damage +15%, **Ignore Defense +15%**                                                        |
| Eagle Eye                    | 3rd | Attack +20, **Final Damage +12%**, Critical Rate +10%, Attack Speed +1                      |
| Second Wind                  | 3rd | Attack +15                                                                                  |
| Call of Cygnus               | 4th | +15% to AP-assigned stats                                                                   |
| Touch of the Wind            | 4th | Attack +10%, DEX +15%                                                                       |
| Bow Expert                   | 4th | Mastery +70%, Attack +30, **Final Damage +35%**, Critical Damage +21%, **Boss Damage +40%** |
| Albatross Max                | 4th | Attack +30, Damage +25%, **Ignore Defense +15%**, Critical Rate +15%, Attack Speed +1       |

Conditional: **Emerald Dust** (4th) — "Monster DEF: -10%", which the page annotates "can be considered as %Ignore DEF"; needs the Emerald Flower summon up.
Buffs: Sharp Eyes (4th, 300s) Crit Rate +20% / Crit Damage +15%; Hero's Echo (2400s) +4% ATT; Glory of the Guardians (Hyper, 60s) Damage +10%; Transcendent Cygnus's Blessing (5th common, 45s) Damage +72%; Vicious Shot (5th common, 30s) Critical Damage "+50% of Crit Rate".
Skill-scoped hypers: _Trifling Wind - Reinforce_ +20% Damage; _Fairy Spiral - Reinforce_ +20% Damage; _Song of Heaven - Reinforce_ +20% Damage, _- Guardbreak_ +20% IED, _- Boss Rush_ +30% Boss.

### 5.2 Reconciliation

| Row          | Page prints  | Our always-on total                                                                | Note                                                              |
| ------------ | ------------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Final Damage | `+66.32%`    | 1.10 × 1.12 × 1.35 = **+66.32%**                                                   | exact; entirely unconditional                                     |
| Boss Damage  | `+40%`       | **40%**                                                                            | exact — the only always-on class boss damage of the five          |
| Damage       | `+50%(132%)` | 10 + 15 + 25 = **50%**                                                             | exact                                                             |
| Ignore DEF   | `+34.98%`    | **27.75%** unconditional; `1 − 0.85 × 0.85 × 0.90` = **34.975%** with Emerald Dust | the page folds the summon-gated Emerald Dust into its base figure |
| Crit Rate    | `+60%`       | **40%** always-on                                                                  | the page folds in Sharp Eyes (+20%), a 300s buff                  |
| Crit Damage  | `+36%`       | **21%** always-on                                                                  | the page folds in Sharp Eyes (+15%)                               |
| Attack       | `+24% +170`  | **+190** flat, **+20%** always-on                                                  | see the conflict below; the +4% is Hero's Echo, a buff            |

> **CONFLICT — 20 flat ATT, unresolved.** Albatross Max's detail line reads _"Effects below are added additively to Eagle Eye (3rd Job)"_. The page's **Crit Rate** row credits Albatross Max with **+25%** (= Eagle Eye 10 + Albatross Max 15) and its **Attack Speed** row credits it with **+2** (= 1 + 1) — both using the _combined_ figure, consistent with additivity. Its **Attack** row does not: it credits Albatross Max **+30** and omits Eagle Eye's **+20**, totalling +170 where the skill descriptions total +190.
>
> `class-skills.ts` follows the **skill descriptions (+190)**, because they are the granular source and because they are what reproduce the crit-rate and attack-speed rows exactly. The 20 ATT discrepancy is recorded in the `Eagle Eye` entry's `note`, in the class `notes`, and pinned by a test so it cannot drift silently. **A second source is needed to settle it.**

---

## 6. Night Walker — <https://grandislibrary.com/cygnus-knights/night-walker>

Page fields: `classGroup: "Cygnus Knights"`, `jobGroup: "Thief"`, LUK/DEX, Claw + Jewel. Weapon Multiplier 1.75x; Weapon Mastery 85%; Attack Speed 8.

### 6.1 Always-on, character-wide

| Skill                        | Job | Effect                                                                   |
| ---------------------------- | --- | ------------------------------------------------------------------------ |
| Cygnus Blessing (Link)       | —   | Attack & Magic ATT +55                                                   |
| Elemental Harmony (Beginner) | —   | +1 LUK per 2 character levels                                            |
| Elemental Expert (Beginner)  | —   | Attack & Magic ATT +10%                                                  |
| Throwing Mastery             | 2nd | Mastery +50%, Damage +30%                                                |
| Agile Throwing               | 2nd | Attack Speed +2, LUK +20                                                 |
| Critical Throw               | 2nd | Critical Rate +35%, Critical Damage +10%                                 |
| Physical Training            | 2nd | LUK +60                                                                  |
| Shadow Momentum              | 3rd | **Final Damage +15%** ("Permanently Final Damage by 15%")                |
| Spirit Projection            | 3rd | Attack +10                                                               |
| Alchemic Adrenaline          | 3rd | Critical Damage +10%                                                     |
| Throwing Expert              | 4th | Mastery +70%, Attack +30, Critical Damage +10%                           |
| Dark Blessing                | 4th | Attack +30, **Ignore Defense +15%**, **Final Damage +12%**               |
| Call of Cygnus               | 4th | +15% to AP-assigned stats                                                |
| **Shadow Bite (5th job)**    | 5th | **Final Damage +20%** — "[Passive]: Permanently increases %Final Damage" |

Conditional: **Adaptive Darkness III** — Ignore Defense **+7% per Mark of Darkness, max 5 marks → +35%** (the 4%/mark base is from Dark Elemental; Adaptive Darkness I/II/III each add +1%/mark and +1 max stack).
Optional: **Vitality Siphon - Reinforce** (Hyper) Attack +60 — a hyper-passive point spend the page marks optional.
Buffs: Dominion (Hyper, 20s) Crit Rate +100%, Final Damage +20%; Glory of the Guardians (Hyper, 60s) Damage +10%; Hero's Echo (2400s) +4% ATT; Last Resort (5th common, 30s) Attack +30, Final Damage +10%/+24% by stage; Transcendent Cygnus's Blessing (5th common, 45s) Damage +72%; HEXA Dominion (6th) Final Damage +20%, Crit Rate +100%.
Skill-scoped hypers: _Quintuple Star - Reinforce_ +20% Damage, _- Boss Rush_ +20% Boss, _- Critical Chance_ +10% Crit Rate; _Dark Omen - Reinforce_ +20% Damage.

### 6.2 Reconciliation

| Row          | Page prints        | Our always-on total                                                | Note                                                   |
| ------------ | ------------------ | ------------------------------------------------------------------ | ------------------------------------------------------ |
| Final Damage | `+54.56%(129.99%)` | 1.15 × 1.12 × 1.20 = **+54.56%**                                   | exact                                                  |
| Ignore DEF   | `+44.75%`          | **15%** unconditional; `1 − 0.85 × 0.65` = **44.75%** with 5 Marks | exact once marks are applied                           |
| Damage       | `+30%(112%)`       | **30%**                                                            | exact                                                  |
| Crit Rate    | `+40%(100%)`       | 5 + 35 = **40%**                                                   | exact; the 100% is Dominion, a 20s buff                |
| Crit Damage  | `+30%`             | 10 + 10 + 10 = **30%**                                             | exact                                                  |
| Attack       | `+14% +125(215)`   | **+125** flat (**185** with the optional hyper), **+10%**          | exact; the +4% is Hero's Echo, +30 more is Last Resort |
| Boss Damage  | `+0%`              | **0%**                                                             | exact                                                  |

**Night Walker, like Ren, has no class-wide boss damage.**

---

## 7. Battle Mage — <https://grandislibrary.com/resistance/battle-mage>

Page fields: `classGroup: "Resistance"`, `jobGroup: "Magician"`, INT/LUK, `weapon: ["staff"]`, `secondary: ["mageShield","magicMarble"]`. Weapon Multiplier 1.2x; Weapon Mastery 95%; Attack Speed 8. Battle Mage is the one magician of the five, so its numbers are **Magic ATT**, not ATT.

### 7.1 Always-on, character-wide

| Skill                     | Job | Effect                                                                                 |
| ------------------------- | --- | -------------------------------------------------------------------------------------- |
| Spirit of Freedom (Link)  | —   | Damage +5%                                                                             |
| Staff Artist              | 1st | Magic ATT +20, Critical Rate +15%                                                      |
| Hasty Aura (passive half) | 1st | Attack Speed +2 levels (the aura toggle adds +1 more, which "does not break soft cap") |
| Staff Mastery             | 2nd | Mastery +50%, Magic ATT +30, Critical Rate +20%                                        |
| High Wisdom               | 2nd | INT +40                                                                                |
| Battle Mastery            | 3rd | **Final Damage +30%**, Critical Damage +10%                                            |
| Maple Warrior             | 4th | +15% to AP-assigned stats                                                              |
| Battle Rage               | 4th | Damage +25%, Critical Rate +20%, Critical Damage +10%                                  |
| Staff Expert              | 4th | Mastery +70%, Magic ATT +30, Critical Damage +20%                                      |
| Spell Boost               | 4th | **Final Damage +22%**, Magic ATT +10%, Damage +6%, **Ignore Defense +30%**             |
| Dark Aura (passive half)  | 4th | Magic ATT +7%                                                                          |

Conditional (toggled auras and their hyper riders): **Dark Aura** (aura half) Damage +10%; **Weakening Aura** Enemy DEF −20% (i.e. +20% IED); **Dark Aura - Boss Rush** (Hyper) Boss Damage +5%; **Weakening Aura - Enhance** (Hyper) "Increases Final Damage enemies receive by 5%"; **Mana Overload** (5th common) Final Damage +8% while toggled.
Buffs: Staff Boost (2nd, 200s) Attack Speed +2; Hero's Echo (2400s) +4% Magic ATT; For Liberty (Hyper, 60s) Damage +10%; Aura Scythe (5th, 25s) Magic ATT +60; Maple World Goddess's Blessing (5th common, 60s) Damage +20%.
Skill-scoped hypers: _Dark Genesis - Reinforce_ +20% Damage, _- Additional Reinforce_ +20% Damage.

### 7.2 Reconciliation

| Row          | Page prints      | Our always-on total                                                    | Note                                                        |
| ------------ | ---------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------- |
| Final Damage | `+58.6%(79.85%)` | 1.30 × 1.22 = **+58.6%**                                               | exact                                                       |
| Ignore DEF   | `+44%`           | **30%** unconditional; `1 − 0.70 × 0.80` = **44%** with Weakening Aura | exact once the aura is toggled                              |
| Damage       | `+36%(76%)`      | 5 + 6 + 25 = **36%**                                                   | exact                                                       |
| Crit Rate    | `+60%`           | 5 + 15 + 20 + 20 = **60%**                                             | exact                                                       |
| Crit Damage  | `+40%`           | 10 + 20 + 10 = **40%**                                                 | exact                                                       |
| Magic ATT    | `+21% +80(140)`  | **+80** flat, **+17%**                                                 | exact; the remaining +4% is Hero's Echo, +60 is Aura Scythe |
| Boss Damage  | `(+5%)`          | **0%** unconditional, **5%** with Dark Aura toggled                    | the page parenthesises it for exactly this reason           |

> **UNVERIFIED.** Whether Combat Power counts a **toggled aura** (as opposed to a timed buff) is not documented in any source we could find. Battle Mage is the class where this matters: its Damage, Boss Damage, IED and Final Damage all have aura-gated components.

---

## 8. Always-on summary for the five

Character-scope, unconditional, buffs excluded — i.e. what a skill-stripped baseline would need to subtract.

| Class            | Final Damage                      | Ignore DEF                      | Boss Damage          | Crit Rate | Crit Damage | Damage | ATT / MATT                             |
| ---------------- | --------------------------------- | ------------------------------- | -------------------- | --------- | ----------- | ------ | -------------------------------------- |
| **Ren**          | +69.23%                           | 40%                             | **0%**               | 50%       | 10%         | 20%    | +165 ATT                               |
| **Hero**         | +37.5% (+202.5% at 10 Combo Orbs) | 50%                             | 0% (+20% at 10 orbs) | 40%       | 20%         | 6%     | +30 ATT (+20 orbs, +20 optional hyper) |
| **Wind Archer**  | +66.32%                           | 27.75% (34.98% w/ Emerald Dust) | **40%**              | 40%       | 21%         | 50%    | +190 ATT ⚠, +20% ATT                   |
| **Night Walker** | +54.56%                           | 15% (44.75% w/ 5 Marks)         | **0%**               | 40%       | 30%         | 30%    | +125 ATT, +10% ATT                     |
| **Battle Mage**  | +58.6%                            | 30% (44% w/ Weakening Aura)     | 0% (5% w/ Dark Aura) | 60%       | 40%         | 36%    | +80 MATT, +17% MATT                    |

⚠ = the unresolved Wind Archer ATT conflict in §5.2.

---

## 9. Is this enough to attempt a skill-stripped Combat Power?

**Partly — enough to move CP from an upper bound to a narrow band, not yet to a point value.**

`formulas.md` §2.2 says CP subtracts each term's skill and consumable contribution. Of the terms CP actually uses (`formulas.md` §2.6: main/sub stat, ATT, %ATT, crit damage, damage%, boss damage%, final damage% — it omits IED, crit rate, level and force):

**Now reconstructible for all five classes:**

- **Final damage** — exact, and it is the term that dominates the bound. Every class's always-on FD stack is fully enumerated and reproduces the source's own aggregate to the second decimal.
- **Boss damage** — exact. Three of the five (Ren, Night Walker, Battle Mage) have **zero** always-on class boss damage, so nothing needs subtracting; Wind Archer has a clean +40%.
- **Crit damage** — exact, once Sharp Eyes (Wind Archer) is treated as a buff.
- **Damage %** — exact.
- **Flat and % ATT/MATT** — exact for Ren, Night Walker and Battle Mage; ±20 for Wind Archer (§5.2 conflict); resource-dependent for Hero.
- **Flat main stat and the Maple Warrior-style "+15% to AP-assigned stats"** — enumerated.

**Still blocking a point-value reproduction:**

1. **We do not know CP's stripping _rule_.** The sources say CP is computed without skill contributions; none of them says whether that means only timed buffs, or also passives, toggled auras and link skills. Our data now lets us compute _any_ of those interpretations, which is exactly what is needed to test them empirically — but the rule itself has to come from a captured character, not from a wiki.
2. **Hero's Combo Orbs.** Hero's contribution swings from +37.5% to +202.5% final damage and 0→20% boss damage on a maintained resource. No source states whether CP reads it charged or empty.
3. **Battle Mage's auras** (§7.2).
4. **The stat window itself cannot say whether it was captured buffed.** Design §3 has no "buffed?" flag; `checksums.ts` already notes this.

**Recommended next step** (not done here, it needs a real character): capture one character's stat window twice — fully buffed and with every buff expired — plus the displayed Combat Power. The difference between the two windows, checked against the buff list in this file, settles item 1 in a single sitting, and items 2–3 with one more capture each. Until then, `checksums.ts` should keep `boundChecksum`, but the bound can be **tightened** by subtracting the always-on column of §8, and a second, narrower bound can be reported by additionally subtracting the buff column.

---

## 10. What could not be sourced

| Item                                                                                     | Status                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wind Archer flat ATT: +170 (page aggregate) vs +190 (page skill descriptions)            | **CONFLICT, unresolved.** §5.2. Needs a second source.                                                                                                                                                              |
| Hero's parenthetical Final Damage `+447.46%`                                             | **Could not reproduce** from the components the page lists. The base `+202.5%` reproduces exactly. Stored as a string only. §4.4.                                                                                   |
| Grandis Goddess's Blessing "+15% Final Damage to certain skills" (Ren)                   | **UNVERIFIED** — the affected skill list is not enumerated. Not stored.                                                                                                                                             |
| Vicious Shot "+50% of Crit Rate" (Wind Archer)                                           | **UNVERIFIED as a number** — depends on the character's own crit rate. Not stored.                                                                                                                                  |
| Whether Combat Power strips **toggled auras** and **link skills** as well as timed buffs | **Unknown.** No source found. §9.                                                                                                                                                                                   |
| Whether Combat Power reads Hero's Combo Orbs charged or empty                            | **Unknown.** No source found. §9.                                                                                                                                                                                   |
| Per-skill Final Damage values of V Boost Nodes                                           | **Deliberately not transcribed.** They are skill-scoped and only meaningful inside a skill-rotation model this project does not have. The uniform `Lv. 20 Crit Rate +5%` / `Lv. 40 IED +20%` riders _are_ recorded. |
| A per-page patch version                                                                 | **Not published.** Only the site-wide footer (`GMS Ver. 269`) and infographic dates. §1.1.                                                                                                                          |
| The other 48 GMS classes                                                                 | **Not researched.** `CLASS_SKILLS` covers the five priority classes only, and `getClassSkills()` throws for anything else rather than returning an empty set that would read as "no passives".                      |

---

## 11. Changes this research implies for `src/lib/data/classes.ts`

Not applied — `classes.ts` is out of scope for this pass. Listed for whoever owns it.

1. **Ren's mastery is no longer UNVERIFIED.** `classes.ts` carries `masteryPercent: 90 // UNVERIFIED — Ren postdates the §4.0 mastery table`. The class page prints `Weapon Mastery: 90%` (base 20% + Exquisite Sword Mastery 70%). The value is right; only the comment needs updating, to cite <https://grandislibrary.com/anima/ren>.
2. **Ren's weapon multiplier is independently confirmed.** The page's own "Weapon Multiplier: 1.3x" agrees with `formulas.md` §1.5, so the existing warning comment in `CLASS_WEAPONS.ren` ("do not correct it to match another Sword user") now has a second source behind it.
3. **Battle Mage's secondary.** `classes.ts` records `secondaryType: 'Magic Marble'`; the page lists `["mageShield", "magicMarble"]`. Consider adding `Mage Shield` to a `secondaryTypeAlternatives` field, or noting it — the current single value is not wrong, just incomplete.
4. **Hero's secondary.** `classes.ts` records `secondaryType: 'Medallion'`; the page lists `["medallion", "warShield"]`. Same treatment.
5. **Wind Archer / Night Walker weapon and mastery all confirmed** (Bow + Jewel, 85%; Claw + Jewel, 85%), as are Hero (90%, 1H 1.34 / 2H 1.44) and Battle Mage (95%, 1.2). No changes needed.
6. **Wind Archer's `ammo` slot.** The page's equipment field includes `{"ammo": "arrowB"}` for Wind Archer and `{"ammo": "throwingStar"}` for Night Walker. Both classes have a passive that removes the ammo requirement (Sylvan Aid, Spirit Projection), so this is informational only — but `Slot` in design §3 has no ammo slot at all, which is worth knowing.
